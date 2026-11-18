import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, ArrowRight } from 'lucide-react';
import { UltronEnergyBlob3D } from './UltronEnergyBlob3D';
import { UltronLogoMark } from './UltronLogoMark';
import {
  advanceIntroTimeline,
  computeIntroChoreography,
  type IntroChoreographyState,
} from '../utils/ultronLogic';
import { ultronVoiceEngine } from '../utils/ultronVoiceEngine';

interface CinematicOpeningProps {
  onComplete: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  reducedMotion?: boolean;
  bloomIntensity?: number;
  theme?: 'amber' | 'cyan' | 'violet';
}

export const CinematicOpening: React.FC<CinematicOpeningProps> = ({
  onComplete,
  soundEnabled,
  onToggleSound,
  reducedMotion = false,
  bloomIntensity = 0.85,
  theme = 'amber',
}) => {
  const [prefersReduced, setPrefersReduced] = useState(reducedMotion);
  const [choreo, setChoreo] = useState<IntroChoreographyState>(() =>
    computeIntroChoreography(0)
  );
  const [staticFadeOut, setStaticFadeOut] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return ultronVoiceEngine.subscribe((st) => {
      setIsSpeaking(st.isSpeaking);
      setVoiceText(st.text);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(reducedMotion || mq.matches);
  }, [reducedMotion]);

  const playIntroChord = () => {
    if (prefersReduced || typeof window === 'undefined') return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const freqs = [110, 164.81, 220, 329.63];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.025 / (idx + 1), ctx.currentTime + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 2.5);
      });
    } catch {
      // Ignore audio errors
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Reduced-motion path: brief calm static-logo fade (1.2s)
    if (prefersReduced) {
      const t1 = setTimeout(() => setStaticFadeOut(true), 850);
      const t2 = setTimeout(() => onComplete(), 1250);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }

    // Calibrated 1x 7-stage choreography loop:
    // Advances smoothly at 1x speed (~7.3s total across all 7 stages) so no stage is rushed
    let prevMs = performance.now();
    let choreoTime = 0;
    let rafId = 0;
    let finished = false;

    const step = (nowMs: number) => {
      if (finished) return;
      const dt = (nowMs - prevMs) * 0.001;
      prevMs = nowMs;

      choreoTime = advanceIntroTimeline(choreoTime, dt, 1.0);
      const nextState = computeIntroChoreography(choreoTime);
      setChoreo(nextState);

      if (choreoTime >= 3.8) {
        finished = true;
        onComplete();
        return;
      }
      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);

    return () => {
      finished = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [prefersReduced, onComplete]);

  // Reduced-motion static logo fade view
  if (prefersReduced) {
    return (
      <div
        data-testid="cinematic-opening-overlay"
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#040407] text-slate-100 select-none transition-opacity duration-400 ${
          staticFadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="absolute top-6 right-6 z-20">
          <button
            type="button"
            onClick={onComplete}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-colors"
          >
            <span>Skip intro</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <UltronLogoMark size={64} />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[0.34em] text-white pl-[0.34em]">
            ULTRON
          </h1>
        </div>
      </div>
    );
  }

  const containerOpacity = 1 - choreo.dissolveWeight;

  return (
    <div
      data-testid="cinematic-opening-overlay"
      style={{ opacity: containerOpacity }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#040407] overflow-hidden select-none transition-opacity duration-300"
    >
      {/* Stage 1: Faint atmospheric central glow emerging from darkness */}
      <div
        style={{
          opacity: choreo.glowWeight * 0.65,
          transform: `scale(${0.85 + choreo.glowWeight * 0.28})`,
        }}
        className="absolute w-[540px] h-[540px] rounded-full bg-[radial-gradient(circle,_rgba(245,158,11,0.16)_0%,_rgba(124,58,237,0.14)_38%,_rgba(37,99,235,0.08)_62%,_transparent_75%)] pointer-events-none transition-transform duration-300"
      />

      {/* Discreet Top-Right Audio & Skip Intro Controls */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!soundEnabled) playIntroChord();
            onToggleSound();
          }}
          aria-label={soundEnabled ? 'Mute intro audio' : 'Enable intro audio'}
          className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border border-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onComplete}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-slate-300 hover:text-white border border-white/10 text-xs font-medium tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
        >
          <span>Skip intro</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Central 3D Energy Blob -> Orbital Filaments -> Sculpted "U" Emblem */}
      <div className="relative flex flex-col items-center justify-center z-10">
        <div className="relative w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] flex items-center justify-center">
          <UltronEnergyBlob3D
            size={360}
            fullScreen={true}
            interactive={false}
            theme={theme}
            bloomIntensity={bloomIntensity}
            playbackSpeed={1.0}
            introWeights={{
              glowWeight: choreo.glowWeight,
              particleGatherWeight: choreo.particleGatherWeight,
              blobDeformWeight: choreo.blobDeformWeight,
              filamentRevealWeight: choreo.filamentRevealWeight,
              uEmblemMorphWeight: choreo.uEmblemMorphWeight,
            }}
          />

          {/* Stage 5: Crisp Minimal "U" Emblem Overlay settling in unison with the 3D U-morph */}
          <div
            style={{
              opacity: choreo.uEmblemMorphWeight * 0.92,
              transform: `scale(${0.92 + choreo.uEmblemMorphWeight * 0.08})`,
            }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-300"
          >
            <UltronLogoMark size={112} className="drop-shadow-[0_0_28px_rgba(251,191,36,0.35)]" />
          </div>
        </div>

        {/* Stage 6: Reveal "ULTRON" beneath the emblem with subtle tracking and soft fade */}
        <div
          style={{
            opacity: choreo.wordmarkRevealWeight,
            transform: `translateY(${(1 - choreo.wordmarkRevealWeight) * 10}px)`,
          }}
          className="mt-2 flex flex-col items-center text-center pointer-events-none"
        >
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[0.38em] text-slate-100 pl-[0.38em]">
            ULTRON
          </h1>
          <p className="mt-2 text-xs text-slate-400 tracking-[0.16em] font-normal">
            Autonomous Intelligence Studio
          </p>
        </div>

        {/* Live Spoken Introduction Subtitles when Ultron speaks about himself */}
        {isSpeaking && voiceText && (
          <div className="mt-4 max-w-lg px-4 py-2.5 rounded-full bg-slate-950/80 border border-amber-500/30 backdrop-blur-md shadow-[0_0_24px_rgba(245,158,11,0.2)] flex items-center gap-3 animate-fade-in pointer-events-auto">
            <div className="flex items-center gap-1 px-1">
              <span className="w-1 h-3 bg-amber-400 rounded-full animate-pulse" />
              <span className="w-1 h-5 bg-amber-300 rounded-full animate-pulse [animation-delay:150ms]" />
              <span className="w-1 h-2.5 bg-cyan-400 rounded-full animate-pulse [animation-delay:300ms]" />
            </div>
            <p className="text-xs sm:text-sm font-mono text-amber-200/90 leading-tight">
              <span className="text-amber-400 font-semibold mr-1.5 uppercase tracking-wider text-[11px]">Ultron:</span>
              &ldquo;{voiceText}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Subtle Bottom Choreography Progress Line */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
        <div className="w-44 h-[2px] rounded-full bg-white/10 overflow-hidden">
          <div
            style={{
              width: `${Math.min(
                100,
                Math.round(
                  (choreo.particleGatherWeight * 0.4 +
                    choreo.filamentRevealWeight * 0.3 +
                    choreo.wordmarkRevealWeight * 0.3) *
                    100
                )
              )}%`,
            }}
            className="h-full bg-gradient-to-r from-amber-500/70 via-amber-300 to-cyan-400/80 transition-all duration-100"
          />
        </div>
      </div>
    </div>
  );
};
