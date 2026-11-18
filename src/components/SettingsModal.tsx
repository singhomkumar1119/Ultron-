import React from 'react';
import {
  X,
  Palette,
  Sliders,
  Cpu,
  Volume2,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'amber' | 'cyan' | 'violet';
  onSelectTheme: (theme: 'amber' | 'cyan' | 'violet') => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onReplayIntro: () => void;
  bloomIntensity: number;
  onChangeBloomIntensity: (value: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onSelectTheme,
  isDarkMode,
  onToggleDarkMode,
  reducedMotion,
  onToggleReducedMotion,
  soundEnabled,
  onToggleSound,
  selectedModel,
  onSelectModel,
  onReplayIntro,
  bloomIntensity,
  onChangeBloomIntensity,
}) => {
  if (!isOpen) return null;

  const models = [
    {
      id: 'gemini-4-hydrogen',
      name: 'Gemini 4 Hydrogen',
      tag: 'General · Free Key',
      desc: 'Default multimodal intelligence with live Google Search and Google Maps grounding.',
    },
    {
      id: 'gemini-3.1-flash-lite',
      name: 'Gemini 3.1 Flash Lite',
      tag: 'High Speed · Free Key',
      desc: 'Ultra-low latency streaming synthesis optimized for high-frequency interactive chat.',
    },
    {
      id: 'gemini-4-argon',
      name: 'Gemini 4 Argon',
      tag: 'Complex Interactive',
      desc: 'Advanced multi-turn coding and interactive system design (with Free-Key fallback).',
    },
    {
      id: 'gemini-4-carbon',
      name: 'Gemini 4 Carbon',
      tag: 'Deep Reasoning',
      desc: 'Maximum architectural reasoning depth and mathematical analysis (with Free-Key fallback).',
    },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg glass-panel rounded-2xl border border-white/15 p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold tracking-wide">System Preferences</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Settings"
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Color Palette */}
        <div className="mt-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span>Neural Consciousness Palette</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => onSelectTheme('amber')}
              className={`p-3 rounded-xl text-left border transition-all ${
                theme === 'amber'
                  ? 'border-amber-500 bg-amber-500/20 text-white shadow-sm'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 mb-2 border border-white/20" />
              <div className="text-xs font-semibold text-white">Ultron Prime</div>
              <div className="text-[10px] text-slate-400">Amber Gold & Core Red</div>
            </button>

            <button
              onClick={() => onSelectTheme('cyan')}
              className={`p-3 rounded-xl text-left border transition-all ${
                theme === 'cyan'
                  ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-sm'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-600 via-cyan-400 to-blue-300 mb-2 border border-white/20" />
              <div className="text-xs font-semibold text-white">Quantum Cyan</div>
              <div className="text-[10px] text-slate-400">Electric Blue & Aqua</div>
            </button>

            <button
              onClick={() => onSelectTheme('violet')}
              className={`p-3 rounded-xl text-left border transition-all ${
                theme === 'violet'
                  ? 'border-purple-400 bg-purple-500/20 text-white shadow-sm'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 via-purple-400 to-pink-300 mb-2 border border-white/20" />
              <div className="text-xs font-semibold text-white">Neon Violet</div>
              <div className="text-[10px] text-slate-400">Synth Violet & Pulse</div>
            </button>
          </div>
        </div>

        {/* Section 2: AI Engine Model */}
        <div className="mt-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>Active Inference Model</span>
          </div>

          <div className="space-y-2">
            {models.map((m) => {
              const isSelected = selectedModel === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => onSelectModel(m.id)}
                  className={`w-full p-3 rounded-xl text-left border flex items-center justify-between transition-all ${
                    isSelected
                      ? 'border-amber-500/40 bg-amber-500/15 text-white'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{m.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-amber-300">
                        {m.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{m.desc}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2.5: 3D Post-Processing & Optical Bloom (EffectComposer) */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>3D Optical Bloom (EffectComposer)</span>
            </div>
            <span
              data-testid="settings-bloom-readout"
              className="text-xs font-mono font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded"
            >
              {bloomIntensity.toFixed(2)}x
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            Dynamically adjusts the WebGL UnrealBloomPass intensity in the 3D scene for a cinematic holographic glow.
          </p>
          <input
            type="range"
            min={0}
            max={2.5}
            step={0.05}
            value={bloomIntensity}
            onChange={(e) => onChangeBloomIntensity(parseFloat(e.target.value))}
            aria-label="3D Bloom Intensity"
            data-testid="settings-bloom-slider"
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
          />
          <div className="grid grid-cols-4 gap-2 mt-2.5">
            {(
              [
                ['Off', 0.0],
                ['Subtle', 0.45],
                ['Cinematic', 0.95],
                ['Overdrive', 1.75],
              ] as const
            ).map(([label, val]) => {
              const isActive = Math.abs(bloomIntensity - val) < 0.06;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onChangeBloomIntensity(val)}
                  className={`py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                    isActive
                      ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {label} ({val}x)
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Motion & Audio Toggles */}
        <div className="mt-6 pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-slate-200">Light / Dark Appearance</p>
              <p className="text-[11px] text-slate-400">Toggle dark-first cinematic interface</p>
            </div>
            <button
              onClick={onToggleDarkMode}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                isDarkMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-white text-slate-900 border-slate-300'
              }`}
            >
              {isDarkMode ? 'Dark Mode' : 'Light Frost'}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-slate-200">Reduced Motion Mode</p>
              <p className="text-[11px] text-slate-400">Simplify liquid glass orb and transitions</p>
            </div>
            <button
              onClick={onToggleReducedMotion}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                reducedMotion
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}
            >
              {reducedMotion ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-slate-200">Cinematic Audio Resonance</p>
              <p className="text-[11px] text-slate-400">Synthesize harmonics during launch & voice</p>
            </div>
            <button
              onClick={onToggleSound}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                soundEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}
            >
              {soundEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>
        </div>

        {/* Section 4: Replay Opening */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onReplayIntro();
            }}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay Cinematic Awakening</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
