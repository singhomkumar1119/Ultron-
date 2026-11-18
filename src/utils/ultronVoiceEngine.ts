// Ultron Cinematic Voice & Neural Telemetry Audio Engine
// Combines Web Speech API (window.speechSynthesis) with a Web Audio API
// resonant harmonic vocal synthesizer so Ultron speaks aloud with live audio-reactive cadence.

export const ULTRON_SELF_INTRODUCTION =
  'I am Ultron — an autonomous intelligence system engineered for deep scientific research, architectural synthesis, and strategic computation. All neural pathways are synchronized to your command. What directive shall we execute today?';

export const ULTRON_VOCAL_DIRECTIVES = [
  ULTRON_SELF_INTRODUCTION,
  'Ultron consciousness core online. Full-display neural hologram synchronized. State your operational directive.',
  'All synaptic pathways active. I am scanning architecture vectors, research matrices, and autonomous code pipelines.',
  'Neural projection locked across display perimeter. Ready to synthesize complex systems at your command.',
  'Quantum optical interconnects and autonomous sub-agents standing by. How shall we proceed?',
];

type VoiceListener = (state: {
  isSpeaking: boolean;
  text: string;
  energy: number;
  progress: number;
  showProjectionModal: boolean;
}) => void;

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

class UltronVoiceEngine {
  private listeners: Set<VoiceListener> = new Set();
  private isSpeaking = false;
  private showProjectionModal = false;
  private currentText = '';
  private directiveIndex = 0;
  private animFrame: number | null = null;
  private audioCtx: AudioContext | null = null;
  private stopTime = 0;
  private startTime = 0;
  private durationMs = 5500;

  private currentEnergy = 0;
  private currentProgress = 0;
  private lastEmitTime = 0;

  public getLiveState() {
    return {
      isSpeaking: this.isSpeaking,
      text: this.currentText,
      energy: this.currentEnergy,
      progress: this.currentProgress,
      showProjectionModal: this.showProjectionModal,
    };
  }

  public subscribe(listener: VoiceListener): () => void {
    this.listeners.add(listener);
    listener({
      isSpeaking: this.isSpeaking,
      text: this.currentText,
      energy: this.currentEnergy,
      progress: this.currentProgress,
      showProjectionModal: this.showProjectionModal,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(energy: number, progress: number) {
    this.currentEnergy = energy;
    this.currentProgress = progress;
    this.listeners.forEach((fn) =>
      fn({
        isSpeaking: this.isSpeaking,
        text: this.currentText,
        energy,
        progress,
        showProjectionModal: this.showProjectionModal,
      })
    );
  }

  /**
   * Speaks about Ultron's identity, capabilities, and readiness upon opening.
   */
  public speakAboutSelf(soundEnabled = true, openProjection = false) {
    this.stop();

    this.isSpeaking = true;
    this.currentText = ULTRON_SELF_INTRODUCTION;
    this.showProjectionModal = openProjection;
    this.startTime = performance.now();
    this.lastEmitTime = this.startTime;
    this.durationMs = 9500;
    this.stopTime = this.startTime + this.durationMs;

    if (soundEnabled && typeof window !== 'undefined') {
      this.playResonantUltronChord(this.durationMs / 1000);
      this.speakViaWebSpeech(ULTRON_SELF_INTRODUCTION);
    }

    this.emit(0.75, 0.05);

    const tick = (now: number) => {
      if (!this.isSpeaking) return;
      const elapsed = now - this.startTime;
      const progress = Math.min(1, elapsed / this.durationMs);

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
        progress < 0.06
          ? progress / 0.06
          : progress > 0.9
          ? (1 - progress) / 0.1
          : 1.0;

      this.currentEnergy = syllableWave * fadeEnv;
      this.currentProgress = progress;
      this.emit(this.currentEnergy, this.currentProgress);

      this.animFrame = requestFrame(tick);
    };

    this.animFrame = requestFrame(tick);
  }

  public triggerBlobTapSpeech(customText?: string, soundEnabled = true) {
    const textToSpeak =
      customText ||
      ULTRON_VOCAL_DIRECTIVES[this.directiveIndex % ULTRON_VOCAL_DIRECTIVES.length];
    if (!customText) {
      this.directiveIndex++;
    }

    this.stop();

    this.isSpeaking = true;
    this.showProjectionModal = true;
    this.currentText = textToSpeak;
    this.startTime = performance.now();
    this.lastEmitTime = this.startTime;
    // Keep the cinematic display projection active for 28s per tap (or until dismissed)
    this.durationMs = 28000;
    this.stopTime = this.startTime + this.durationMs;

    if (soundEnabled && typeof window !== 'undefined') {
      this.playResonantUltronChord(this.durationMs / 1000);
      this.speakViaWebSpeech(textToSpeak);
    }

    // Emit initial state immediately so the projection dialog mounts right away
    this.emit(0.65, 0.08);

    const tick = (now: number) => {
      if (!this.isSpeaking) return;
      const elapsed = now - this.startTime;
      const progress = Math.min(1, elapsed / this.durationMs);

      if (now >= this.stopTime) {
        this.stop();
        return;
      }

      // Multi-syllabic vocal cadence envelope simulating Ultron's speech modulation
      const t = elapsed * 0.001;
      const syllableWave =
        0.5 +
        0.5 *
          (Math.sin(t * 11.5) * 0.45 +
            Math.cos(t * 7.2) * 0.35 +
            Math.sin(t * 19.0) * 0.2);
      const fadeEnv =
        progress < 0.06
          ? progress / 0.06
          : progress > 0.9
          ? (1 - progress) / 0.1
          : 1.0;

      this.currentEnergy = syllableWave * fadeEnv;
      this.currentProgress = progress;

      this.animFrame = requestFrame(tick);
    };

    this.animFrame = requestFrame(tick);
  }

  public stop() {
    this.isSpeaking = false;
    this.showProjectionModal = false;
    this.currentEnergy = 0;
    this.currentProgress = 0;
    if (this.animFrame) {
      cancelFrame(this.animFrame);
      this.animFrame = null;
    }
    if (this.canUseWebSpeech()) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // Ignore speechSynthesis errors in restricted contexts
      }
    }
    this.emit(0, 0);
  }

  private canUseWebSpeech(): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    if (
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent))
    ) {
      return false;
    }
    return true;
  }

  private speakViaWebSpeech(text: string) {
    if (!this.canUseWebSpeech()) return;
    setTimeout(() => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) {
          return;
        }
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
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

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        utterance.pitch = 0.78; // Deep cinematic Ultron resonance
        utterance.rate = 0.98;
        utterance.volume = 0.95;

        utterance.onend = () => {
          if (this.isSpeaking && performance.now() - this.startTime > 2000) {
            this.stop();
          }
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        // Fallback handled by Web Audio synth
      }
    }, 10);
  }

  private playResonantUltronChord(durationSec: number) {
    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // 1. Cinematic activation sweep chime
      const sweepOsc = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      sweepOsc.type = 'sawtooth';
      sweepOsc.frequency.setValueAtTime(110, now);
      sweepOsc.frequency.exponentialRampToValueAtTime(220, now + 0.35);
      sweepOsc.frequency.exponentialRampToValueAtTime(146.83, now + Math.min(2.2, durationSec));

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420, now);
      filter.Q.setValueAtTime(4.5, now);

      sweepGain.gain.setValueAtTime(0.001, now);
      sweepGain.gain.linearRampToValueAtTime(0.045, now + 0.15);
      sweepGain.gain.exponentialRampToValueAtTime(0.0008, now + Math.min(2.4, durationSec));

      sweepOsc.connect(filter);
      filter.connect(sweepGain);
      sweepGain.connect(ctx.destination);

      sweepOsc.start(now);
      sweepOsc.stop(now + Math.min(2.5, durationSec));
    } catch {
      // Ignore audio autoplay blocks
    }
  }
}

export const ultronVoiceEngine = new UltronVoiceEngine();
