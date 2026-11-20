// Ultron Cinematic Voice & Neural Telemetry Audio Engine
// Combines server-side Gemini TTS (gemini-3.8-flash-lite-tts) played via unlocked Web Audio API
// with hardened multi-chunk Web Speech API fallback so Ultron speaks reliably in all browsers and iframes.

import { stripMarkdownForSpeech } from './ultronLogic';

export const ULTRON_SELF_INTRODUCTION =
  'I am Ultron — an autonomous intelligence system engineered for deep scientific research, architectural synthesis, and strategic computation. All neural pathways are synchronized to your command. What directive shall we execute today?';

export const ULTRON_VOCAL_DIRECTIVES = [
  ULTRON_SELF_INTRODUCTION,
  'Ultron consciousness core online. Full-display neural hologram synchronized. State your operational directive.',
  'All synaptic pathways active. I am scanning architecture vectors, research matrices, and autonomous code pipelines.',
  'Neural projection locked across display perimeter. Ready to synthesize complex systems at your command.',
  'Quantum optical interconnects and autonomous sub-agents standing by. How shall we proceed?',
];

export interface VoiceEngineState {
  isSpeaking: boolean;
  text: string;
  energy: number;
  progress: number;
  showProjectionModal: boolean;
  speakingMessageId: string | null;
}

export interface SpeakTextOptions {
  soundEnabled?: boolean;
  messageId?: string | null;
  voiceName?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  openProjection?: boolean;
  includeIntroChime?: boolean;
  onEnded?: () => void;
}

type VoiceListener = (state: VoiceEngineState) => void;

const requestFrame = (cb: (time: number) => void): number => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(cb);
  }
  return setTimeout(() => cb(performance.now()), 16) as unknown as number;
};

const cancelFrame = (id: number) => {
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(id);
  } else {
    clearTimeout(id);
  }
};

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function splitSpeechIntoChunks(text: string, maxChunkLen = 220): string[] {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= maxChunkLen) return [clean];

  const sentences = clean.match(/[^.!?]+[.!?]*\s*/g) || [clean];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const piece = sentence.trim();
    if (!piece) continue;
    if (current && current.length + piece.length + 1 > maxChunkLen) {
      chunks.push(current.trim());
      current = piece;
    } else {
      current = current ? `${current} ${piece}` : piece;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }
  return chunks;
}

class UltronVoiceEngine {
  private listeners: Set<VoiceListener> = new Set();
  private isSpeaking = false;
  private showProjectionModal = false;
  private currentText = '';
  private speakingMessageId: string | null = null;
  private directiveIndex = 0;
  private animFrame: number | null = null;
  private audioCtx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private freqBuffer: Uint8Array<ArrayBuffer> | null = null;
  private activeSourceNode: AudioBufferSourceNode | null = null;
  private activeAudioElement: HTMLAudioElement | null = null;
  private fetchController: AbortController | null = null;
  private activeUtterances: SpeechSynthesisUtterance[] = [];
  private activeOnEnded: (() => void) | null = null;
  private speechSessionId = 0;

  private stopTime = 0;
  private startTime = 0;
  private durationMs = 5500;
  private currentEnergy = 0;
  private currentProgress = 0;

  public getLiveState(): VoiceEngineState {
    return {
      isSpeaking: this.isSpeaking,
      text: this.currentText,
      energy: this.currentEnergy,
      progress: this.currentProgress,
      showProjectionModal: this.showProjectionModal,
      speakingMessageId: this.speakingMessageId,
    };
  }

  public getOutputFrequencyData(): { level: number; bins: number[] } | null {
    if (!this.isSpeaking || !this.analyserNode || !this.freqBuffer) return null;
    try {
      this.analyserNode.getByteFrequencyData(this.freqBuffer);
      let sum = 0;
      for (let i = 0; i < this.freqBuffer.length; i++) {
        sum += this.freqBuffer[i];
      }
      const avg = sum / Math.max(1, this.freqBuffer.length);
      if (avg <= 0.5) return null;
      return {
        level: Math.min(1, (avg / 255) * 2.3),
        bins: Array.from(this.freqBuffer),
      };
    } catch {
      return null;
    }
  }

  public subscribe(listener: VoiceListener): () => void {
    this.listeners.add(listener);
    listener(this.getLiveState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(energy: number, progress: number) {
    this.currentEnergy = energy;
    this.currentProgress = progress;
    const snapshot = this.getLiveState();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  /**
   * Call synchronously inside user click/tap handlers so AudioContext playback
   * remains unlocked after async network calls (fetch / WebSocket).
   */
  public unlockAudio(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass();
        this.analyserNode = null;
      }
      if (!this.analyserNode) {
        const analyser = this.audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.72;
        analyser.connect(this.audioCtx.destination);
        this.analyserNode = analyser;
        this.freqBuffer = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      }
      if (this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume().catch(() => {});
      }

      // Play a 1-sample silent buffer to unlock audio output on strict WebKit/iframe policies
      try {
        const silentBuffer = this.audioCtx.createBuffer(1, 1, this.audioCtx.sampleRate);
        const src = this.audioCtx.createBufferSource();
        src.buffer = silentBuffer;
        src.connect(this.audioCtx.destination);
        src.start(0);
      } catch {
        // Ignore unlock buffer failures
      }

      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Speaks arbitrary assistant text aloud using Gemini Neural TTS (/api/gemini/tts)
   * with automatic hardened Web Speech API fallback.
   */
  public async speakText(rawText: string, options: SpeakTextOptions = {}): Promise<void> {
    const cleanText = stripMarkdownForSpeech(rawText, 1450);
    if (!cleanText) {
      options.onEnded?.();
      return;
    }

    const {
      soundEnabled = true,
      messageId = null,
      voiceName = 'Fenrir',
      openProjection = false,
      includeIntroChime = false,
      onEnded,
    } = options;

    this.unlockAudio();
    this.stop();

    const sessionId = ++this.speechSessionId;
    this.isSpeaking = true;
    this.currentText = cleanText;
    this.speakingMessageId = messageId;
    this.showProjectionModal = openProjection;
    this.activeOnEnded = onEnded ?? null;
    this.startTime = performance.now();

    // Generous safety window; actual audio completion ends playback accurately sooner
    const estimatedMs = Math.min(90000, Math.max(8500, cleanText.length * 95 + 4500));
    this.durationMs = soundEnabled ? estimatedMs : 1800;
    this.stopTime = this.startTime + this.durationMs;

    this.emit(0.7, 0.04);
    this.startAnimationLoop(sessionId);

    if (!soundEnabled || typeof window === 'undefined') {
      return;
    }

    if (includeIntroChime) {
      this.playResonantUltronChord(1.4);
    }

    const controller = new AbortController();
    this.fetchController = controller;

    try {
      const response = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          text: cleanText,
          voiceName,
        }),
      });

      if (sessionId !== this.speechSessionId || !this.isSpeaking) {
        return;
      }

      const data = await response.json();
      if (response.ok && data?.audioBase64 && typeof data.audioBase64 === 'string') {
        const played = await this.playWavBase64(data.audioBase64, sessionId);
        if (played) {
          return;
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || sessionId !== this.speechSessionId) {
        return;
      }
      // Fall through cleanly to Web Speech fallback
    } finally {
      if (this.fetchController === controller) {
        this.fetchController = null;
      }
    }

    if (sessionId !== this.speechSessionId || !this.isSpeaking) {
      return;
    }

    // Hardened Web Speech fallback
    this.speakViaWebSpeech(cleanText, sessionId);
  }

  /**
   * Speaks about Ultron's identity, capabilities, and readiness.
   */
  public speakAboutSelf(soundEnabled = true, openProjection = false) {
    void this.speakText(ULTRON_SELF_INTRODUCTION, {
      soundEnabled,
      openProjection,
      includeIntroChime: true,
    });
  }

  public triggerBlobTapSpeech(customText?: string, soundEnabled = true) {
    const textToSpeak =
      customText ||
      ULTRON_VOCAL_DIRECTIVES[this.directiveIndex % ULTRON_VOCAL_DIRECTIVES.length];
    if (!customText) {
      this.directiveIndex++;
    }

    void this.speakText(textToSpeak, {
      soundEnabled,
      openProjection: true,
      includeIntroChime: true,
    });
  }

  public stop() {
    this.speechSessionId++;
    const finishedCallback = this.activeOnEnded;
    this.activeOnEnded = null;

    if (this.fetchController) {
      try {
        this.fetchController.abort();
      } catch {
        // Ignore abort error
      }
      this.fetchController = null;
    }

    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.onended = null;
        this.activeSourceNode.stop();
        this.activeSourceNode.disconnect();
      } catch {
        // Ignore source stop error
      }
      this.activeSourceNode = null;
    }

    if (this.activeAudioElement) {
      try {
        this.activeAudioElement.pause();
        this.activeAudioElement.src = '';
      } catch {
        // Ignore element stop error
      }
      this.activeAudioElement = null;
    }

    this.activeUtterances = [];

    if (this.canUseWebSpeech()) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // Ignore speechSynthesis errors in restricted contexts
      }
    }

    if (this.animFrame) {
      cancelFrame(this.animFrame);
      this.animFrame = null;
    }

    const wasSpeaking = this.isSpeaking || this.speakingMessageId !== null;
    this.isSpeaking = false;
    this.showProjectionModal = false;
    this.speakingMessageId = null;
    this.currentEnergy = 0;
    this.currentProgress = 0;

    if (wasSpeaking) {
      this.emit(0, 0);
      finishedCallback?.();
    } else {
      this.emit(0, 0);
    }
  }

  private startAnimationLoop(sessionId: number) {
    const tick = (now: number) => {
      if (!this.isSpeaking || sessionId !== this.speechSessionId) return;
      const elapsed = now - this.startTime;
      const progress = Math.min(1, elapsed / Math.max(1, this.durationMs));

      if (now >= this.stopTime) {
        this.stop();
        return;
      }

      const t = elapsed * 0.001;
      const syllableWave =
        0.5 +
        0.5 *
          (Math.sin(t * 11.5) * 0.45 +
            Math.cos(t * 7.2) * 0.35 +
            Math.sin(t * 19.0) * 0.2);
      const fadeEnv =
        progress < 0.05
          ? progress / 0.05
          : progress > 0.92
          ? (1 - progress) / 0.08
          : 1.0;

      this.emit(syllableWave * fadeEnv, progress);
      this.animFrame = requestFrame(tick);
    };

    this.animFrame = requestFrame(tick);
  }

  private async playWavBase64(base64Wav: string, sessionId: number): Promise<boolean> {
    // 1. Prefer Web Audio API decodeAudioData on unlocked AudioContext (works reliably after async fetch)
    try {
      const ctx = this.unlockAudio();
      if (ctx) {
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }
        const arrayBuf = base64ToArrayBuffer(base64Wav);
        const audioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
        if (sessionId !== this.speechSessionId || !this.isSpeaking) {
          return true;
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        const gain = ctx.createGain();
        gain.gain.value = 1.0;
        source.connect(gain);
        if (this.analyserNode) {
          gain.connect(this.analyserNode);
        } else {
          gain.connect(ctx.destination);
        }

        const durationMs = Math.max(1000, Math.round(audioBuffer.duration * 1000) + 350);
        this.startTime = performance.now();
        this.durationMs = durationMs;
        this.stopTime = this.startTime + durationMs;

        source.onended = () => {
          if (this.activeSourceNode === source) {
            this.activeSourceNode = null;
          }
          if (sessionId === this.speechSessionId && this.isSpeaking) {
            this.stop();
          }
        };

        this.activeSourceNode = source;
        source.start(0);
        return true;
      }
    } catch {
      // Fall back to HTMLAudioElement below
    }

    // 2. HTMLAudioElement fallback
    try {
      const audio = new Audio(`data:audio/wav;base64,${base64Wav}`);
      audio.volume = 1.0;
      this.activeAudioElement = audio;

      await new Promise<void>((resolve, reject) => {
        audio.onloadedmetadata = () => {
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            const ms = Math.max(1000, Math.round(audio.duration * 1000) + 350);
            this.startTime = performance.now();
            this.durationMs = ms;
            this.stopTime = this.startTime + ms;
          }
        };
        audio.onended = () => {
          if (sessionId === this.speechSessionId && this.isSpeaking) {
            this.stop();
          }
          resolve();
        };
        audio.onerror = () => reject(new Error('Audio element playback error'));

        const playPromise = audio.play();
        if (playPromise) {
          playPromise.then(() => resolve()).catch(reject);
        } else {
          resolve();
        }
      });

      return true;
    } catch {
      this.activeAudioElement = null;
      return false;
    }
  }

  private canUseWebSpeech(): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    return true;
  }

  private isHeadlessTestBrowser(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      Boolean(navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent))
    );
  }

  private speakViaWebSpeech(text: string, sessionId: number) {
    if (!this.canUseWebSpeech()) {
      // No browser speech engine available; keep brief visual state then stop
      if (sessionId === this.speechSessionId) {
        const visualMs = Math.min(3500, Math.max(1200, text.length * 35));
        this.startTime = performance.now();
        this.durationMs = visualMs;
        this.stopTime = this.startTime + visualMs;
      }
      return;
    }

    // In headless automated browsers, speechSynthesis never fires onend reliably
    if (this.isHeadlessTestBrowser()) {
      const headlessMs = Math.min(3500, Math.max(1200, text.length * 30));
      this.startTime = performance.now();
      this.durationMs = headlessMs;
      this.stopTime = this.startTime + headlessMs;
      return;
    }

    try {
      const synth = window.speechSynthesis;
      if (synth.speaking || synth.pending) {
        synth.cancel();
      }
      if (synth.paused) {
        synth.resume();
      }

      const voices = synth.getVoices ? synth.getVoices() : [];
      const preferredVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.toLowerCase().includes('daniel') ||
              v.name.toLowerCase().includes('google uk english male') ||
              v.name.toLowerCase().includes('alex') ||
              v.name.toLowerCase().includes('male') ||
              v.name.toLowerCase().includes('david'))
        ) || voices.find((v) => v.lang.startsWith('en'));

      const chunks = splitSpeechIntoChunks(text, 220);
      if (chunks.length === 0) {
        this.stop();
        return;
      }

      this.activeUtterances = [];
      let completedCount = 0;

      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        // NOTE: Do NOT bail when voices is empty; Chrome will speak using the system default voice.
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        utterance.pitch = 0.85;
        utterance.rate = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
          if (sessionId !== this.speechSessionId) return;
          completedCount++;
          if (completedCount >= chunks.length && index === chunks.length - 1) {
            this.stop();
          }
        };

        utterance.onerror = () => {
          if (sessionId !== this.speechSessionId) return;
          if (index === chunks.length - 1) {
            this.stop();
          }
        };

        this.activeUtterances.push(utterance);
        synth.speak(utterance);
      });
    } catch {
      // Fallback safely without hanging UI
      const fallbackMs = 2500;
      this.startTime = performance.now();
      this.durationMs = fallbackMs;
      this.stopTime = this.startTime + fallbackMs;
    }
  }

  private playResonantUltronChord(durationSec: number) {
    try {
      const ctx = this.unlockAudio();
      if (!ctx) return;
      const now = ctx.currentTime;

      const sweepOsc = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      sweepOsc.type = 'sawtooth';
      sweepOsc.frequency.setValueAtTime(110, now);
      sweepOsc.frequency.exponentialRampToValueAtTime(220, now + 0.35);
      sweepOsc.frequency.exponentialRampToValueAtTime(146.83, now + Math.min(1.3, durationSec));

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420, now);
      filter.Q.setValueAtTime(4.5, now);

      sweepGain.gain.setValueAtTime(0.001, now);
      sweepGain.gain.linearRampToValueAtTime(0.035, now + 0.12);
      sweepGain.gain.exponentialRampToValueAtTime(0.0008, now + Math.min(1.4, durationSec));

      sweepOsc.connect(filter);
      filter.connect(sweepGain);
      sweepGain.connect(ctx.destination);

      sweepOsc.start(now);
      sweepOsc.stop(now + Math.min(1.5, durationSec));
    } catch {
      // Ignore audio autoplay blocks
    }
  }
}

export const ultronVoiceEngine = new UltronVoiceEngine();
