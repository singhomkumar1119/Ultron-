import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Volume2,
  VolumeX,
  X,
  Radio,
  Sparkles,
  ArrowUp,
  AlertCircle,
} from 'lucide-react';
import { UltronOrbCanvas } from './UltronOrbCanvas';
import {
  type VoiceState,
  voiceStateReducer,
  encodePcm16ToBase64,
  decodePcm16Base64ToFloat32,
  normalizeAudioMimeType,
  computeVoiceMeterBars,
  computeVoiceGlowMetrics,
} from '../utils/ultronLogic';
import { ultronVoiceEngine } from '../utils/ultronVoiceEngine';

interface VoiceModeViewProps {
  onClose: () => void;
  theme: 'amber' | 'cyan' | 'violet';
  soundEnabled?: boolean;
  selectedModel?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'ultron';
  text: string;
  time: string;
}

type VoiceConnectionMode = 'idle' | 'connecting' | 'live-ws' | 'turn-based';

function downsampleFloat32(
  input: Float32Array,
  inputRate: number,
  targetRate: number
): Float32Array {
  if (inputRate === targetRate || inputRate <= targetRate) {
    return input;
  }
  const ratio = inputRate / targetRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += input[j];
      count++;
    }
    output[i] = count > 0 ? sum / count : input[start] || 0;
  }
  return output;
}

function pickSupportedRecorderMime(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) || '';
}

export const VoiceModeView: React.FC<VoiceModeViewProps> = ({
  onClose,
  theme,
  soundEnabled = true,
  selectedModel = 'gemini-4-hydrogen',
  history = [],
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isMuted, setIsMuted] = useState(!soundEnabled);
  const [connectionMode, setConnectionMode] = useState<VoiceConnectionMode>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [meterBars, setMeterBars] = useState<number[]>(() =>
    computeVoiceMeterBars({ voiceState: 'idle', audioLevel: 0, timeSec: 0, barCount: 18 })
  );
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState('');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([
    {
      id: 'init-1',
      speaker: 'ultron',
      text: 'Voice channel standing by. Tap the microphone to speak with Ultron, or type below.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Mutable refs so audio callbacks and async handlers never read stale state
  const voiceStateRef = useRef<VoiceState>('idle');
  const isMutedRef = useRef(isMuted);
  const connectionModeRef = useRef<VoiceConnectionMode>('idle');
  const sessionActiveRef = useRef(false);
  const transcriptsRef = useRef<TranscriptEntry[]>(transcripts);

  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const activeOutputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextPlayTimeRef = useRef(0);

  const micLevelRef = useRef(0);
  const engineEnergyRef = useRef(0);
  const freqBinsRef = useRef<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const rmsIntervalRef = useRef<number | null>(null);
  const rmsCtxRef = useRef<AudioContext | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  const liveInputTurnIdRef = useRef<string | null>(null);
  const liveOutputTurnIdRef = useRef<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  voiceStateRef.current = voiceState;
  isMutedRef.current = isMuted;
  connectionModeRef.current = connectionMode;
  transcriptsRef.current = transcripts;

  useEffect(() => {
    setIsMuted(!soundEnabled);
    isMutedRef.current = !soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    return ultronVoiceEngine.subscribe((st) => {
      engineEnergyRef.current = st.isSpeaking ? st.energy : 0;
    });
  }, []);

  useEffect(() => {
    const tSec = performance.now() * 0.001;
    if (voiceState === 'idle') {
      micLevelRef.current = 0;
      freqBinsRef.current = [];
      setAudioLevel(0);
      setMeterBars(
        computeVoiceMeterBars({
          voiceState: 'idle',
          audioLevel: 0,
          timeSec: tSec,
          barCount: 18,
        })
      );
      return;
    }

    const outFreqData = new Uint8Array(32);
    const intervalId = window.setInterval(() => {
      const currentState = voiceStateRef.current;
      let effectiveLevel = 0;
      let activeBins: number[] | undefined;

      if (currentState === 'listening') {
        effectiveLevel = micLevelRef.current;
        if (freqBinsRef.current.length > 0) {
          activeBins = freqBinsRef.current;
        }
        // Gentle decay between incoming audio frames
        micLevelRef.current = Math.max(0, micLevelRef.current * 0.86);
      } else if (currentState === 'speaking') {
        let analyserLevel = 0;
        const analyser = outputAnalyserRef.current;
        if (analyser && !isMutedRef.current) {
          analyser.getByteFrequencyData(outFreqData);
          let sum = 0;
          for (let i = 0; i < outFreqData.length; i++) {
            sum += outFreqData[i];
          }
          analyserLevel = Math.min(1, (sum / outFreqData.length / 255) * 2.2);
          if (analyserLevel > 0.01) {
            activeBins = Array.from(outFreqData);
          }
        }
        const ttsOutput = !isMutedRef.current ? ultronVoiceEngine.getOutputFrequencyData() : null;
        if (ttsOutput) {
          analyserLevel = Math.max(analyserLevel, ttsOutput.level);
          if (!activeBins) {
            activeBins = ttsOutput.bins;
          }
        }
        effectiveLevel = isMutedRef.current
          ? 0.08
          : Math.max(engineEnergyRef.current, analyserLevel);
      } else if (currentState === 'thinking') {
        effectiveLevel = 0.28;
      }

      setAudioLevel(effectiveLevel);
      setMeterBars(
        computeVoiceMeterBars({
          voiceState: currentState,
          audioLevel: effectiveLevel,
          timeSec: performance.now() * 0.001,
          barCount: 18,
          frequencyBins: activeBins,
        })
      );
    }, 55);

    return () => window.clearInterval(intervalId);
  }, [voiceState]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [transcripts]);

  const setSafeVoiceState = useCallback((next: VoiceState) => {
    voiceStateRef.current = next;
    setVoiceState(next);
  }, []);

  const appendOrUpdateTranscript = useCallback(
    (speaker: 'user' | 'ultron', text: string, turnIdRef?: React.MutableRefObject<string | null>) => {
      const clean = text;
      if (!clean.trim()) return;
      const nowTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (turnIdRef && turnIdRef.current) {
        const existingId = turnIdRef.current;
        setTranscripts((prev) =>
          prev.map((item) =>
            item.id === existingId
              ? { ...item, text: `${item.text}${clean}` }
              : item
          )
        );
        return;
      }

      const newId = `${speaker}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      if (turnIdRef) {
        turnIdRef.current = newId;
      }
      setTranscripts((prev) => [
        ...prev,
        {
          id: newId,
          speaker,
          text: clean.trim(),
          time: nowTime,
        },
      ]);
    },
    []
  );

  const stopScheduledLiveOutput = useCallback(() => {
    activeOutputSourcesRef.current.forEach((src) => {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch {
        // Ignore stop errors
      }
    });
    activeOutputSourcesRef.current.clear();
    if (outputAudioCtxRef.current) {
      nextPlayTimeRef.current = outputAudioCtxRef.current.currentTime;
    } else {
      nextPlayTimeRef.current = 0;
    }
  }, []);

  const cleanupTurnRecorder = useCallback(() => {
    if (rmsIntervalRef.current) {
      window.clearInterval(rmsIntervalRef.current);
      rmsIntervalRef.current = null;
    }
    if (rmsCtxRef.current) {
      rmsCtxRef.current.close().catch(() => {});
      rmsCtxRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore stop error
      }
    }
    mediaRecorderRef.current = null;
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // Ignore stop error
      }
      speechRecognitionRef.current = null;
    }
  }, []);

  const cleanupLiveResources = useCallback(
    (preserveStream = false) => {
      cleanupTurnRecorder();
      stopScheduledLiveOutput();
      ultronVoiceEngine.stop();

      if (scriptProcessorRef.current) {
        try {
          scriptProcessorRef.current.onaudioprocess = null;
          scriptProcessorRef.current.disconnect();
        } catch {
          // Ignore disconnect errors
        }
        scriptProcessorRef.current = null;
      }

      if (wsRef.current) {
        try {
          wsRef.current.onopen = null;
          wsRef.current.onmessage = null;
          wsRef.current.onerror = null;
          wsRef.current.onclose = null;
          wsRef.current.close();
        } catch {
          // Ignore WS close errors
        }
        wsRef.current = null;
      }

      if (!preserveStream && micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }

      if (!preserveStream) {
        if (outputAnalyserRef.current) {
          try {
            outputAnalyserRef.current.disconnect();
          } catch {
            // Ignore disconnect errors
          }
          outputAnalyserRef.current = null;
        }
        if (inputAudioCtxRef.current) {
          inputAudioCtxRef.current.close().catch(() => {});
          inputAudioCtxRef.current = null;
        }
        if (outputAudioCtxRef.current) {
          outputAudioCtxRef.current.close().catch(() => {});
          outputAudioCtxRef.current = null;
        }
      }
      micLevelRef.current = 0;
      freqBinsRef.current = [];
      setAudioLevel(0);
    },
    [cleanupTurnRecorder, stopScheduledLiveOutput]
  );

  useEffect(() => {
    return () => {
      sessionActiveRef.current = false;
      cleanupLiveResources(false);
    };
  }, [cleanupLiveResources]);

  const scheduleLivePcmPlayback = useCallback((base64Audio: string) => {
    if (isMutedRef.current) return;
    const ctx = outputAudioCtxRef.current;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    const floatSamples = decodePcm16Base64ToFloat32(base64Audio);
    if (floatSamples.length === 0) return;

    const buffer = ctx.createBuffer(1, floatSamples.length, 24000);
    buffer.getChannelData(0).set(floatSamples);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (outputAnalyserRef.current) {
      source.connect(outputAnalyserRef.current);
    } else {
      source.connect(ctx.destination);
    }

    const startAt = Math.max(ctx.currentTime + 0.01, nextPlayTimeRef.current);
    nextPlayTimeRef.current = startAt + buffer.duration;
    activeOutputSourcesRef.current.add(source);

    source.onended = () => {
      activeOutputSourcesRef.current.delete(source);
    };
    source.start(startAt);
  }, []);

  const askUltronTurnAndSpeak = useCallback(
    async (userText: string, rearmMicAfterSpeaking: boolean) => {
      const cleanQuestion = userText.trim();
      if (!cleanQuestion) return;

      appendOrUpdateTranscript('user', cleanQuestion);
      setSafeVoiceState('thinking');
      setVoiceNotice(null);

      try {
        const recentTranscriptHistory = transcriptsRef.current
          .filter((t) => t.id !== 'init-1')
          .slice(-10)
          .map((t) => ({
            role: (t.speaker === 'ultron' ? 'assistant' : 'user') as 'assistant' | 'user',
            content: t.text,
          }));

        const combinedHistory = [...history.slice(-6), ...recentTranscriptHistory];

        const response = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: cleanQuestion,
            history: combinedHistory,
            model: selectedModel,
            systemInstruction:
              'You are Ultron in Live Voice conversation mode. Respond concisely, clearly, and naturally in plain spoken English (2-4 sentences max unless detail is requested). Avoid markdown tables or code fences.',
            freeTierFallback: true,
          }),
        });

        const data = await response.json();
        const answerText = String(data?.text || '').trim();
        if (!response.ok || !answerText) {
          throw new Error(data?.error || 'Ultron did not return a response.');
        }

        appendOrUpdateTranscript('ultron', answerText);
        setSafeVoiceState('speaking');

        if (!isMutedRef.current) {
          await ultronVoiceEngine.speakText(answerText, {
            soundEnabled: true,
            openProjection: false,
            onEnded: () => {
              if (!sessionActiveRef.current) {
                setSafeVoiceState('idle');
                return;
              }
              if (rearmMicAfterSpeaking && connectionModeRef.current === 'turn-based') {
                void startTurnBasedRecordingRef.current();
              } else {
                setSafeVoiceState('idle');
              }
            },
          });
        } else {
          window.setTimeout(() => {
            if (
              sessionActiveRef.current &&
              rearmMicAfterSpeaking &&
              connectionModeRef.current === 'turn-based'
            ) {
              void startTurnBasedRecordingRef.current();
            } else {
              setSafeVoiceState('idle');
            }
          }, 1800);
        }
      } catch (err: any) {
        setVoiceNotice(err?.message || 'Unable to reach Ultron right now.');
        setSafeVoiceState('idle');
      }
    },
    [appendOrUpdateTranscript, history, selectedModel, setSafeVoiceState]
  );

  // Ref holder so askUltronTurnAndSpeak can re-arm turn-based mic without circular dep
  const startTurnBasedRecordingRef = useRef<() => Promise<void>>(async () => {});

  const startTurnBasedRecording = useCallback(async () => {
    cleanupTurnRecorder();
    if (!sessionActiveRef.current) return;

    const stream = micStreamRef.current;
    if (!stream || stream.getAudioTracks().every((t) => t.readyState === 'ended')) {
      setVoiceNotice('Microphone stream ended. Tap the microphone to reconnect.');
      setSafeVoiceState('idle');
      setConnectionMode('idle');
      sessionActiveRef.current = false;
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      setVoiceNotice('Audio recording is unavailable in this browser. Type your question below.');
      setSafeVoiceState('idle');
      return;
    }

    try {
      const mimeType = pickSupportedRecorderMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      audioChunksRef.current = [];

      const startMs = performance.now();
      let speechDetected = false;
      let lastSoundMs = startMs;

      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          rmsCtxRef.current = ctx;
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          src.connect(analyser);
          const samples = new Float32Array(analyser.fftSize);
          const freqData = new Uint8Array(analyser.frequencyBinCount);

          rmsIntervalRef.current = window.setInterval(() => {
            if (recorder.state !== 'recording') return;
            analyser.getFloatTimeDomainData(samples);
            analyser.getByteFrequencyData(freqData);
            let sumSq = 0;
            for (let i = 0; i < samples.length; i++) {
              sumSq += samples[i] * samples[i];
            }
            const rms = Math.sqrt(sumSq / samples.length);
            micLevelRef.current = Math.min(1, rms * 9);
            freqBinsRef.current = Array.from(freqData);

            const now = performance.now();
            if (rms > 0.015) {
              speechDetected = true;
              lastSoundMs = now;
            } else if (speechDetected && now - lastSoundMs > 1650) {
              recorder.stop();
            } else if (now - startMs > 22000) {
              recorder.stop();
            }
          }, 60);
        }
      } catch {
        window.setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }, 12000);
      }

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        if (rmsIntervalRef.current) {
          window.clearInterval(rmsIntervalRef.current);
          rmsIntervalRef.current = null;
        }
        if (rmsCtxRef.current) {
          rmsCtxRef.current.close().catch(() => {});
          rmsCtxRef.current = null;
        }
        setAudioLevel(0);

        if (!sessionActiveRef.current) {
          setSafeVoiceState('idle');
          return;
        }

        const rawType = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: rawType });
        if (blob.size < 300) {
          setSafeVoiceState('idle');
          setVoiceNotice('Did not hear speech. Tap the microphone or orb to speak.');
          return;
        }

        setSafeVoiceState('thinking');
        const reader = new FileReader();
        reader.onloadend = async () => {
          const res = String(reader.result || '');
          const base64 = res.includes(',') ? res.split(',')[1] : res;
          if (!base64 || !sessionActiveRef.current) {
            setSafeVoiceState('idle');
            return;
          }

          try {
            const trRes = await fetch('/api/gemini/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64,
                mimeType: normalizeAudioMimeType(blob.type || rawType),
              }),
            });
            const trData = await trRes.json();
            const spokenText = String(trData?.text || '').trim();
            if (!spokenText) {
              setVoiceNotice(
                trData?.error
                  ? `Voice notice: ${trData.error}`
                  : 'No clear speech detected. Tap microphone to speak again or type below.'
              );
              setSafeVoiceState('idle');
              return;
            }
            await askUltronTurnAndSpeak(spokenText, true);
          } catch (err: any) {
            setVoiceNotice(err?.message || 'Transcription failed.');
            setSafeVoiceState('idle');
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setSafeVoiceState('listening');
      setVoiceNotice('Listening via turn-based voice channel — speak now.');
    } catch (err: any) {
      setVoiceNotice(err?.message || 'Unable to start voice recording.');
      setSafeVoiceState('idle');
    }
  }, [askUltronTurnAndSpeak, cleanupTurnRecorder, setSafeVoiceState]);

  startTurnBasedRecordingRef.current = startTurnBasedRecording;

  const activateTurnBasedFallback = useCallback(
    async (reason?: string) => {
      if (!sessionActiveRef.current) return;
      if (wsRef.current) {
        try {
          wsRef.current.onopen = null;
          wsRef.current.onmessage = null;
          wsRef.current.onerror = null;
          wsRef.current.onclose = null;
          wsRef.current.close();
        } catch {
          // Ignore close errors
        }
        wsRef.current = null;
      }
      if (scriptProcessorRef.current) {
        try {
          scriptProcessorRef.current.onaudioprocess = null;
          scriptProcessorRef.current.disconnect();
        } catch {
          // Ignore disconnect errors
        }
        scriptProcessorRef.current = null;
      }
      connectionModeRef.current = 'turn-based';
      setConnectionMode('turn-based');
      if (reason) {
        setVoiceNotice(reason);
      }
      await startTurnBasedRecording();
    },
    [startTurnBasedRecording]
  );

  const startLiveVoiceSession = async () => {
    // Unlock playback audio synchronously on user tap
    ultronVoiceEngine.unlockAudio();
    ultronVoiceEngine.stop();

    // If currently listening in turn-based mode, treat click as "Done speaking -> Send"
    if (
      connectionModeRef.current === 'turn-based' &&
      voiceStateRef.current === 'listening' &&
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop();
      return;
    }

    // If already connected in Live WS and speaking/listening, interrupt / resume listening
    if (connectionModeRef.current === 'live-ws' && wsRef.current?.readyState === WebSocket.OPEN) {
      if (voiceStateRef.current === 'speaking') {
        stopScheduledLiveOutput();
        setSafeVoiceState('listening');
      }
      return;
    }

    cleanupLiveResources(false);
    sessionActiveRef.current = true;
    setConnectionMode('connecting');
    setVoiceNotice('Connecting microphone and Ultron voice link...');

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      sessionActiveRef.current = false;
      setConnectionMode('idle');
      setVoiceNotice(
        'Microphone capture is not supported in this browser. Type your question below to hear Ultron answer.'
      );
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (AudioCtx) {
        try {
          inputAudioCtxRef.current = new AudioCtx({ sampleRate: 16000 });
        } catch {
          inputAudioCtxRef.current = new AudioCtx();
        }
        try {
          outputAudioCtxRef.current = new AudioCtx({ sampleRate: 24000 });
        } catch {
          outputAudioCtxRef.current = new AudioCtx();
        }
        await inputAudioCtxRef.current.resume().catch(() => {});
        await outputAudioCtxRef.current.resume().catch(() => {});
        nextPlayTimeRef.current = outputAudioCtxRef.current.currentTime;

        const outAnalyser = outputAudioCtxRef.current.createAnalyser();
        outAnalyser.fftSize = 64;
        outAnalyser.connect(outputAudioCtxRef.current.destination);
        outputAnalyserRef.current = outAnalyser;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!sessionActiveRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      micStreamRef.current = stream;
    } catch (err: any) {
      sessionActiveRef.current = false;
      setConnectionMode('idle');
      const errName = err?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setVoiceNotice(
          'Microphone permission denied. Allow mic access in your browser, or type below to talk with Ultron.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setVoiceNotice(
          'No microphone detected on this device. Connect a mic or type your question below.'
        );
      } else {
        setVoiceNotice(
          `Microphone unavailable (${err?.message || 'hardware error'}). Type below to hear Ultron reply.`
        );
      }
      return;
    }

    // Attempt real-time WebSocket /live connection first
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live?voice=Fenrir`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      let wsConnected = false;
      const connectTimeoutId = window.setTimeout(() => {
        if (!wsConnected && sessionActiveRef.current) {
          void activateTurnBasedFallback('Switched to turn-based voice channel.');
        }
      }, 4500);

      ws.onmessage = (event) => {
        if (!sessionActiveRef.current) return;
        let msg: any;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        if (msg.type === 'status' && msg.status === 'connected') {
          wsConnected = true;
          window.clearTimeout(connectTimeoutId);
          connectionModeRef.current = 'live-ws';
          setConnectionMode('live-ws');
          setSafeVoiceState('listening');
          setVoiceNotice('Live voice channel connected — speak naturally.');

          // Start 16kHz PCM mic streaming into WebSocket
          const inCtx = inputAudioCtxRef.current;
          const stream = micStreamRef.current;
          if (inCtx && stream) {
            const source = inCtx.createMediaStreamSource(stream);
            const processor = inCtx.createScriptProcessor(4096, 1, 1);
            const silentGain = inCtx.createGain();
            silentGain.gain.value = 0;

            processor.onaudioprocess = (e) => {
              if (!sessionActiveRef.current || ws.readyState !== WebSocket.OPEN) return;
              const rawChannel = e.inputBuffer.getChannelData(0);

              let sumSq = 0;
              for (let i = 0; i < rawChannel.length; i += 4) {
                sumSq += rawChannel[i] * rawChannel[i];
              }
              const rms = Math.sqrt(sumSq / Math.max(1, rawChannel.length / 4));
              micLevelRef.current = Math.max(micLevelRef.current * 0.5, Math.min(1, rms * 9));

              const pcm16k = downsampleFloat32(rawChannel, inCtx.sampleRate, 16000);
              const base64Pcm = encodePcm16ToBase64(pcm16k);
              try {
                ws.send(JSON.stringify({ audio: base64Pcm }));
              } catch {
                // Ignore transient send error
              }
            };

            source.connect(processor);
            processor.connect(silentGain);
            silentGain.connect(inCtx.destination);
            scriptProcessorRef.current = processor;
          }
          return;
        }

        if (msg.type === 'inputTranscript' && msg.text) {
          appendOrUpdateTranscript('user', String(msg.text), liveInputTurnIdRef);
          return;
        }

        if (msg.type === 'outputTranscript' && msg.text) {
          liveInputTurnIdRef.current = null;
          setSafeVoiceState('speaking');
          appendOrUpdateTranscript('ultron', String(msg.text), liveOutputTurnIdRef);
          return;
        }

        if (msg.type === 'text' && msg.text && !liveOutputTurnIdRef.current) {
          setSafeVoiceState('speaking');
          appendOrUpdateTranscript('ultron', String(msg.text), liveOutputTurnIdRef);
          return;
        }

        if (msg.type === 'audio' && msg.audio) {
          liveInputTurnIdRef.current = null;
          setSafeVoiceState('speaking');
          scheduleLivePcmPlayback(String(msg.audio));
          return;
        }

        if (msg.type === 'interrupted') {
          stopScheduledLiveOutput();
          liveOutputTurnIdRef.current = null;
          setSafeVoiceState('listening');
          return;
        }

        if (msg.type === 'turnComplete') {
          liveInputTurnIdRef.current = null;
          liveOutputTurnIdRef.current = null;
          if (sessionActiveRef.current) {
            setSafeVoiceState('listening');
          }
          return;
        }

        if (msg.type === 'error' || (msg.type === 'status' && msg.status === 'closed')) {
          window.clearTimeout(connectTimeoutId);
          if (!wsConnected && sessionActiveRef.current) {
            void activateTurnBasedFallback(
              'Switched to turn-based voice channel (Live WebSocket unavailable).'
            );
          } else if (sessionActiveRef.current) {
            void activateTurnBasedFallback('Live channel reset — continuing via turn-based voice.');
          }
        }
      };

      ws.onerror = () => {
        window.clearTimeout(connectTimeoutId);
        if (sessionActiveRef.current) {
          void activateTurnBasedFallback('Switched to turn-based voice channel.');
        }
      };

      ws.onclose = () => {
        window.clearTimeout(connectTimeoutId);
        if (!wsConnected && sessionActiveRef.current) {
          void activateTurnBasedFallback('Switched to turn-based voice channel.');
        }
      };
    } catch {
      await activateTurnBasedFallback('Switched to turn-based voice channel.');
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    isMutedRef.current = nextMuted;
    if (nextMuted) {
      stopScheduledLiveOutput();
      ultronVoiceEngine.stop();
      if (voiceStateRef.current === 'speaking') {
        setSafeVoiceState(
          connectionModeRef.current === 'live-ws' ? 'listening' : 'idle'
        );
      }
    }
  };

  const handleInterrupt = () => {
    sessionActiveRef.current = false;
    cleanupLiveResources(false);
    liveInputTurnIdRef.current = null;
    liveOutputTurnIdRef.current = null;
    setConnectionMode('idle');
    setVoiceNotice('Voice channel paused.');
    setSafeVoiceState(voiceStateReducer(voiceStateRef.current, { type: 'INTERRUPT' }));
  };

  const handleSendTextInVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = textDraft.trim();
    if (!clean || voiceState === 'thinking') return;

    ultronVoiceEngine.unlockAudio();
    setTextDraft('');

    if (connectionModeRef.current === 'live-ws' && wsRef.current?.readyState === WebSocket.OPEN) {
      appendOrUpdateTranscript('user', clean);
      setSafeVoiceState('thinking');
      try {
        wsRef.current.send(JSON.stringify({ text: clean }));
        return;
      } catch {
        // Fall through to turn-based reply & TTS
      }
    }

    await askUltronTurnAndSpeak(clean, false);
  };

  const handleCloseView = () => {
    sessionActiveRef.current = false;
    cleanupLiveResources(false);
    onClose();
  };

  const orbState: VoiceState = voiceState;
  const glow = computeVoiceGlowMetrics(voiceState, audioLevel, theme);
  const meterLabel =
    voiceState === 'listening'
      ? 'Mic Active · Receiving Voice'
      : voiceState === 'speaking'
      ? isMuted
        ? 'Audio Output Muted'
        : 'Voice Active · Speaking'
      : voiceState === 'thinking'
      ? 'Synthesizing Response'
      : 'Audio Monitor · Ready';

  return (
    <div
      data-testid="voice-mode-view"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#040508]/95 backdrop-blur-2xl p-5 sm:p-8 select-none overflow-hidden"
    >
      {/* Top Bar with Status and Close */}
      <div className="w-full max-w-4xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full glass-panel-subtle text-xs font-mono ${glow.statusAccentClass}`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                voiceState === 'idle' ? 'opacity-65' : 'animate-pulse'
              }`}
            />
            <span className="uppercase tracking-wider" data-testid="voice-mode-status">
              {voiceState === 'idle'
                ? 'Orb Standing By'
                : voiceState === 'listening'
                ? 'Listening to You'
                : voiceState === 'thinking'
                ? 'Thinking'
                : 'Ultron Speaking'}
            </span>
          </div>
          {connectionMode !== 'idle' && (
            <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-mono text-slate-300">
              {connectionMode === 'live-ws'
                ? 'Live 2-Way PCM'
                : connectionMode === 'connecting'
                ? 'Connecting...'
                : 'Turn-Based Mic'}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleCloseView}
          aria-label="Exit Voice Mode"
          className="p-2.5 rounded-full glass-panel hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center Cinematic Liquid Glass Ultron Consciousness Orb + Pulsing Audio Halo & Equalizer */}
      <div className="flex flex-col items-center justify-center my-auto relative shrink-0 py-1">
        {/* Audio-Reactive Pulsing Radial Glow Halo */}
        <div
          data-testid="voice-pulsing-glow"
          aria-hidden="true"
          style={{
            transform: `translate(-50%, -50%) scale(${glow.haloScale})`,
            opacity: glow.haloOpacity,
            background: `radial-gradient(circle, rgba(${glow.rgbPrimary}, 0.62) 0%, rgba(${glow.rgbSecondary}, 0.25) 44%, rgba(0, 0, 0, 0) 72%)`,
          }}
          className="absolute left-1/2 top-[130px] w-[310px] sm:w-[370px] h-[310px] sm:h-[370px] rounded-full blur-2xl pointer-events-none transition-[transform,opacity] duration-100 ease-out"
        />

        {/* Concentric Theme-Matched Echo Rings */}
        {voiceState !== 'idle' && (
          <div className="absolute inset-0 pointer-events-none">
            <div
              style={{
                transform: `translate(-50%, -50%) scale(${1.01 + audioLevel * 0.14})`,
              }}
              className={`absolute left-1/2 top-[130px] w-[274px] sm:w-[296px] h-[274px] sm:h-[296px] rounded-full border ${glow.ringInnerBorderClass} opacity-70 transition-transform duration-100`}
            />
            <div
              style={{
                transform: `translate(-50%, -50%) scale(${1.04 + audioLevel * 0.2})`,
              }}
              className={`absolute left-1/2 top-[130px] w-[318px] sm:w-[348px] h-[318px] sm:h-[348px] rounded-full border ${glow.ringOuterBorderClass} opacity-45 transition-transform duration-150`}
            />
          </div>
        )}

        <div className="relative z-10">
          <UltronOrbCanvas
            size={250}
            state={orbState}
            theme={theme}
            interactive={true}
            showBackdropImage={true}
            onClick={() => void startLiveVoiceSession()}
          />
        </div>

        <div className="mt-5 text-center max-w-md px-4 relative z-10">
          <p className="text-xs uppercase font-mono tracking-widest text-slate-300">
            {voiceState === 'idle'
              ? 'Tap the orb or microphone to speak'
              : voiceState === 'listening'
              ? connectionMode === 'turn-based'
                ? 'Listening... Pause or tap mic when finished'
                : 'Listening live — speak naturally'
              : voiceState === 'thinking'
              ? 'Processing your question...'
              : 'Ultron is speaking...'}
          </p>

          {/* Real-Time Audio Volume Meter Equalizer */}
          <div
            data-testid="voice-volume-meter"
            data-voice-state={voiceState}
            data-audio-level={audioLevel.toFixed(3)}
            aria-label={meterLabel}
            className="mt-3 mx-auto inline-flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md"
          >
            <div className="h-7 flex items-center justify-center gap-1" aria-hidden="true">
              {meterBars.map((level, idx) => {
                const isActiveAudio = voiceState === 'listening' || voiceState === 'speaking';
                const barClass = isMuted && voiceState === 'speaking'
                  ? 'bg-rose-400/50'
                  : isActiveAudio || voiceState === 'thinking'
                  ? glow.barActiveClass
                  : glow.barIdleClass;
                return (
                  <span
                    key={idx}
                    data-testid="voice-volume-bar"
                    style={{
                      height: `${Math.round(level * 100)}%`,
                    }}
                    className={`w-1 sm:w-1.5 rounded-full transition-[height,background-color] duration-75 ${barClass}`}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  voiceState === 'listening'
                    ? 'bg-emerald-400 animate-ping'
                    : voiceState === 'speaking'
                    ? theme === 'cyan'
                      ? 'bg-cyan-400 animate-pulse'
                      : theme === 'violet'
                      ? 'bg-violet-400 animate-pulse'
                      : 'bg-amber-400 animate-pulse'
                    : voiceState === 'thinking'
                    ? 'bg-indigo-400 animate-pulse'
                    : 'bg-slate-500'
                }`}
              />
              <span>{meterLabel}</span>
            </div>
          </div>

          {voiceNotice && (
            <p
              data-testid="voice-mode-notice"
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-300/95 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-1.5"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{voiceNotice}</span>
            </p>
          )}
        </div>
      </div>

      {/* Live Transcript Pane & Text Fallback Input */}
      <div className="w-full max-w-2xl flex flex-col gap-2.5 shrink-0">
        <div
          data-testid="voice-transcript-pane"
          className="w-full glass-panel rounded-2xl p-3.5 sm:p-4 border border-white/10 max-h-36 sm:max-h-44 overflow-y-auto text-xs space-y-2.5"
        >
          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] pb-1.5 border-b border-white/10">
            <span>Live Conversation Transcript</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          {transcripts.map((entry) => (
            <div key={entry.id} className="flex items-start gap-2 leading-relaxed">
              <span
                className={`font-semibold shrink-0 ${
                  entry.speaker === 'ultron' ? 'text-amber-400' : 'text-indigo-300'
                }`}
              >
                {entry.speaker === 'ultron' ? 'Ultron:' : 'You:'}
              </span>
              <span className="text-slate-200">{entry.text}</span>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>

        {/* Always-available text input fallback so users without mic hardware can still talk & hear Ultron */}
        <form
          onSubmit={handleSendTextInVoice}
          className="flex items-center gap-2 rounded-2xl bg-white/[0.05] border border-white/10 px-3 py-2 focus-within:border-amber-400/50 transition-colors"
        >
          <input
            type="text"
            data-testid="voice-text-input"
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            placeholder="Or type a question for Ultron to answer aloud..."
            aria-label="Ask Ultron a spoken question via text"
            disabled={voiceState === 'thinking'}
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            data-testid="voice-text-send"
            disabled={!textDraft.trim() || voiceState === 'thinking'}
            aria-label="Send voice question"
            className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 transition-colors cursor-pointer"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="flex items-center gap-4 pt-3 shrink-0">
        <button
          type="button"
          onClick={handleToggleMute}
          aria-label={isMuted ? 'Unmute voice output' : 'Mute voice output'}
          className="p-3.5 rounded-full glass-panel hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-rose-400" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>

        {/* Primary Mic / Speak Trigger */}
        <button
          type="button"
          data-testid="voice-mic-btn"
          onClick={() => void startLiveVoiceSession()}
          disabled={voiceState === 'thinking' || connectionMode === 'connecting'}
          aria-label={
            voiceState === 'listening'
              ? 'Finish speaking'
              : 'Start Live Voice microphone'
          }
          className={`p-5 rounded-full font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
            voiceState === 'listening'
              ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_35px_rgba(244,63,94,0.45)]'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.4)]'
          }`}
        >
          {voiceState === 'listening' ? (
            <MicOff className="w-7 h-7 animate-pulse" />
          ) : (
            <Mic className="w-7 h-7" />
          )}
        </button>

        {/* Stop / Interrupt Button */}
        <button
          type="button"
          data-testid="voice-interrupt-btn"
          onClick={handleInterrupt}
          disabled={voiceState === 'idle' && connectionMode === 'idle'}
          aria-label="Stop Voice Session"
          className="p-3.5 rounded-full glass-panel hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-white/10 transition-all disabled:opacity-40 cursor-pointer"
        >
          <Square className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
