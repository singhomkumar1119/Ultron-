import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Volume2,
  VolumeX,
  X,
  Radio,
  Sparkles,
} from 'lucide-react';
import { UltronOrbCanvas } from './UltronOrbCanvas';
import { type VoiceState, voiceStateReducer } from '../utils/ultronLogic';

interface VoiceModeViewProps {
  onClose: () => void;
  theme: 'amber' | 'cyan' | 'violet';
}

interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'ultron';
  text: string;
  time: string;
}

export const VoiceModeView: React.FC<VoiceModeViewProps> = ({ onClose, theme }) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([
    {
      id: '1',
      speaker: 'ultron',
      text: 'Voice communication channel open. State your command or inquiry.',
      time: '21:24',
    },
  ]);

  const simulateConversationTurn = () => {
    // Transition to listening
    setVoiceState(voiceStateReducer(voiceState, { type: 'START_LISTENING' }));

    setTimeout(() => {
      // User spoken text simulated
      const userSample = 'Synthesize the primary bottleneck in scaling trillion-parameter mixture-of-experts models.';
      setTranscripts((prev) => [
        ...prev,
        {
          id: `u-${Date.now()}`,
          speaker: 'user',
          text: userSample,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      // Transition to thinking
      setVoiceState(voiceStateReducer('listening', { type: 'PROCESS_QUERY' }));

      setTimeout(() => {
        // Transition to speaking
        const ultronAnswer =
          'The fundamental bottleneck resides in all-to-all cross-node expert dispatch routing, where GPU interconnect bandwidth saturates prior to matrix compute limits.';
        setTranscripts((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            speaker: 'ultron',
            text: ultronAnswer,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setVoiceState(voiceStateReducer('thinking', { type: 'START_SPEAKING' }));

        // Speak aloud using Web Speech API if not muted
        if (!isMuted && typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(ultronAnswer);
          utterance.rate = 1.05;
          utterance.onend = () => {
            setVoiceState('idle');
          };
          window.speechSynthesis.speak(utterance);
        } else {
          setTimeout(() => {
            setVoiceState('idle');
          }, 3500);
        }
      }, 1200);
    }, 1800);
  };

  const handleInterrupt = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setVoiceState(voiceStateReducer(voiceState, { type: 'INTERRUPT' }));
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#040508]/95 backdrop-blur-2xl p-6 sm:p-10 select-none">
      {/* Top Bar with Status and Close */}
      <div className="w-full max-w-4xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full glass-panel-subtle text-xs font-mono text-amber-400">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span className="uppercase tracking-wider">
              {voiceState === 'idle'
                ? 'Orb Standing By'
                : voiceState === 'listening'
                ? 'Receptive Audio Link'
                : voiceState === 'thinking'
                ? 'Neural Deliberation'
                : 'Vocalizing Transmission'}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Exit Voice Mode"
          className="p-2.5 rounded-full glass-panel hover:bg-white/10 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center Cinematic Liquid Glass Ultron Consciousness Orb */}
      <div className="flex flex-col items-center justify-center my-auto relative">
        {/* Slow-motion Ambient Concentric Sound Wave Echoes */}
        {voiceState !== 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[440px] h-[440px] rounded-full border border-amber-500/20 opacity-40 transition-transform duration-1000 scale-105" />
            <div className="w-[520px] h-[520px] rounded-full border border-amber-500/10 opacity-25 transition-transform duration-1000 scale-110" />
          </div>
        )}

        <UltronOrbCanvas
          size={360}
          state={voiceState}
          theme={theme}
          interactive={true}
          showBackdropImage={true}
          onClick={simulateConversationTurn}
        />

        <div className="mt-6 text-center">
          <p className="text-xs uppercase font-mono tracking-widest text-slate-400">
            {voiceState === 'idle'
              ? 'Click the orb or microphone to speak'
              : voiceState === 'listening'
              ? 'Listening to user audio...'
              : voiceState === 'thinking'
              ? 'Synthesizing neural model...'
              : 'Ultron is vocalizing...'}
          </p>
        </div>
      </div>

      {/* Live Transcript Pane */}
      <div className="w-full max-w-2xl glass-panel rounded-2xl p-4 border border-white/10 max-h-48 overflow-y-auto mb-6 text-xs space-y-2.5">
        <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] pb-1.5 border-b border-white/10">
          <span>Real-time Vocal Transcript</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </div>
        {transcripts.map((entry) => (
          <div key={entry.id} className="flex items-start gap-2 leading-relaxed">
            <span
              className={`font-semibold shrink-0 ${
                entry.speaker === 'ultron' ? 'text-amber-400' : 'text-slate-300'
              }`}
            >
              {entry.speaker === 'ultron' ? 'Ultron:' : 'You:'}
            </span>
            <span className="text-slate-200">{entry.text}</span>
          </div>
        ))}
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsMuted(!isMuted)}
          aria-label={isMuted ? 'Unmute voice output' : 'Mute voice output'}
          className="p-3.5 rounded-full glass-panel hover:bg-white/10 text-slate-300 hover:text-white transition-all"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Primary Mic / Speak Trigger */}
        <button
          onClick={simulateConversationTurn}
          disabled={voiceState === 'speaking' || voiceState === 'listening'}
          aria-label="Start Voice Query"
          className="p-5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-[0_0_35px_rgba(245,158,11,0.4)] transition-all active:scale-95 disabled:opacity-50"
        >
          {voiceState === 'listening' ? (
            <Mic className="w-7 h-7 animate-pulse" />
          ) : (
            <Mic className="w-7 h-7" />
          )}
        </button>

        {/* Stop / Interrupt Button */}
        <button
          onClick={handleInterrupt}
          disabled={voiceState === 'idle'}
          aria-label="Interrupt Ultron"
          className="p-3.5 rounded-full glass-panel hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-white/10 transition-all disabled:opacity-40"
        >
          <Square className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
