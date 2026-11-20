import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Sun,
  Moon,
  Monitor,
  Cpu,
  History,
  Plug,
  ShieldCheck,
  HelpCircle,
  Check,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  type UltronTheme,
  type AppearanceMode,
} from '../utils/ultronLogic';

export type SettingsSectionId =
  | 'profile'
  | 'appearance'
  | 'ai'
  | 'history'
  | 'integrations'
  | 'privacy';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: UltronTheme;
  onSelectTheme: (theme: UltronTheme) => void;
  appearanceMode: AppearanceMode;
  onSelectAppearanceMode: (mode: AppearanceMode) => void;
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
  sessionCount?: number;
  onClearLocalHistory?: () => void;
  onOpenHelp?: () => void;
  initialTab?: SettingsSectionId;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onSelectTheme,
  appearanceMode,
  onSelectAppearanceMode,
  reducedMotion,
  onToggleReducedMotion,
  soundEnabled,
  onToggleSound,
  selectedModel,
  onSelectModel,
  onReplayIntro,
  bloomIntensity,
  onChangeBloomIntensity,
  sessionCount = 0,
  onClearLocalHistory,
  onOpenHelp,
  initialTab = 'appearance',
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(initialTab);
  const [confirmClear, setConfirmClear] = useState(false);

  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveSection(initialTab);
      setConfirmClear(false);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/gemini/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.configured === 'boolean') {
          setGeminiConfigured(d.configured);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const sections: Array<{
    id: SettingsSectionId;
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'appearance', label: 'Appearance', icon: Sun },
    { id: 'ai', label: 'AI Preferences', icon: Cpu },
    { id: 'history', label: 'Chat History', icon: History },
    { id: 'integrations', label: 'Integrations', icon: Plug },
    { id: 'privacy', label: 'Privacy & Help', icon: ShieldCheck },
  ];

  const models = [
    {
      id: 'gemini-4-hydrogen',
      name: 'Gemini 4 Hydrogen',
      tag: 'Balanced · Default',
      desc: 'Great everyday assistant for writing, research, search, and coding.',
    },
    {
      id: 'gemini-3.1-flash-lite',
      name: 'Gemini 3.1 Flash Lite',
      tag: 'Fast',
      desc: 'Quickest response times for everyday questions and drafting.',
    },
    {
      id: 'gemini-4-argon',
      name: 'Gemini 4 Argon',
      tag: 'Interactive',
      desc: 'Strong multi-turn context for longer coding and design tasks.',
    },
    {
      id: 'gemini-4-carbon',
      name: 'Gemini 4 Carbon',
      tag: 'Deep Reasoning',
      desc: 'Best for complex analysis, planning, and technical architecture.',
    },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="w-full max-w-3xl bg-white dark:bg-[#12151E] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Settings"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: Left Category Nav + Right Content Area */}
        <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden">
          {/* Section Navigation */}
          <nav
            aria-label="Settings Sections"
            className="sm:w-52 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-white/[0.08] p-2.5 sm:p-3 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-y-auto shrink-0 bg-slate-50/70 dark:bg-[#0E1118]"
          >
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  data-testid={`settings-tab-${sec.id}`}
                  onClick={() => setActiveSection(sec.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-colors text-left cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-200'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Main Section Panel */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* 1. PROFILE */}
            {activeSection === 'profile' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Workspace Profile
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Your workspace runs locally in your browser with zero external account setup required.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-semibold text-base shrink-0">
                    U
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      Local Workspace
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      Chats, appearance, and model preferences are saved automatically on this device
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. APPEARANCE */}
            {activeSection === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Appearance
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Choose how Ultron looks on your device.
                  </p>
                </div>

                {/* Light / Dark / System Selector */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2.5">
                    Theme Mode
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(
                      [
                        { id: 'light', label: 'Light', icon: Sun },
                        { id: 'dark', label: 'Dark', icon: Moon },
                        { id: 'system', label: 'System', icon: Monitor },
                      ] as const
                    ).map((opt) => {
                      const Icon = opt.icon;
                      const isActive = appearanceMode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          data-testid={`appearance-mode-${opt.id}`}
                          onClick={() => onSelectAppearanceMode(opt.id)}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            isActive
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 ring-1 ring-indigo-500/30'
                              : 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                          }`}
                        >
                          <Icon className="w-4 h-4 mb-2" />
                          <div className="text-xs font-semibold">{opt.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Accent Palette */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2.5">
                    Accent Color
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(
                      [
                        { id: 'indigo', label: 'Indigo', dot: 'bg-indigo-500' },
                        { id: 'cyan', label: 'Cyan', dot: 'bg-cyan-500' },
                        { id: 'violet', label: 'Violet', dot: 'bg-violet-500' },
                        { id: 'amber', label: 'Amber', dot: 'bg-amber-500' },
                      ] as const
                    ).map((item) => {
                      const isActive = theme === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectTheme(item.id)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                            isActive
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-slate-900 dark:text-white'
                              : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-slate-600 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full ${item.dot} shrink-0`} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reduced Motion Toggle */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      Reduce motion
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Minimize animations and show responses immediately without typing effect.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={reducedMotion}
                    onClick={onToggleReducedMotion}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                      reducedMotion
                        ? 'bg-indigo-600'
                        : 'bg-slate-300 dark:bg-white/15'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        reducedMotion ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* 3. AI PREFERENCES */}
            {activeSection === 'ai' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    AI Preferences
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Select your preferred default model, voice audio, and 3D visual glow.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Default Model
                  </label>
                  {models.map((m) => {
                    const isSelected = selectedModel === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onSelectModel(m.id)}
                        className={`w-full p-3.5 rounded-2xl text-left border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15'
                            : 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {m.name}
                            </span>
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-300 border border-slate-200 dark:border-white/10">
                              {m.tag}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {m.desc}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 ml-3" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Voice & Audio Toggle */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      Voice &amp; sound effects
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enable spoken introductions and subtle audio cues.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={soundEnabled}
                    onClick={onToggleSound}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                      soundEnabled
                        ? 'bg-indigo-600'
                        : 'bg-slate-300 dark:bg-white/15'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                        soundEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 3D Glow Slider */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/[0.08]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>3D Core Glow Intensity</span>
                    </div>
                    <span
                      data-testid="settings-bloom-readout"
                      className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-300"
                    >
                      {bloomIntensity.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2.5}
                    step={0.05}
                    value={bloomIntensity}
                    onChange={(e) => onChangeBloomIntensity(parseFloat(e.target.value))}
                    aria-label="3D Glow Intensity"
                    data-testid="settings-bloom-slider"
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* 4. CHAT HISTORY */}
            {activeSection === 'history' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Chat History
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Manage your saved conversations stored in this browser.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        Saved conversations
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {sessionCount} conversation(s) currently stored in this browser.
                      </p>
                    </div>
                  </div>

                  {onClearLocalHistory && (
                    <div className="pt-3 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          Clear local chat cache
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Reset conversations stored in this browser and start fresh.
                        </p>
                      </div>
                      {confirmClear ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmClear(false)}
                            className="px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/10"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onClearLocalHistory();
                              setConfirmClear(false);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium"
                          >
                            Confirm Clear
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmClear(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-medium transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Clear chats</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      Welcome intro animation
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Replay Ultron&apos;s startup opening sequence.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onReplayIntro();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/10 text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Replay intro</span>
                  </button>
                </div>
              </div>
            )}

            {/* 5. INTEGRATIONS (Gemini AI Engine) */}
            {activeSection === 'integrations' && (
              <div data-testid="settings-integrations-panel" className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Connected Services
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Manage your AI engine connections.
                  </p>
                </div>

                {/* Gemini Engine Status */}
                <div
                  data-testid="integration-card-gemini"
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-400/25 flex items-center justify-center shrink-0">
                      <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        Gemini AI Engine
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Chat, web search, maps, voice, and transcription
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                      geminiConfigured
                        ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    {geminiConfigured === null
                      ? 'Checking'
                      : geminiConfigured
                      ? 'Active'
                      : 'Standby'}
                  </span>
                </div>
              </div>
            )}

            {/* 6. PRIVACY & HELP */}
            {activeSection === 'privacy' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Privacy &amp; Help
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Learn how your data is handled and explore Ultron&apos;s quick guide.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">
                        Your conversations stay yours
                      </p>
                      <p className="mt-1">
                        Your conversations and preferences are stored locally in your browser. Messages sent to Ultron are processed securely via the Gemini API.
                      </p>
                    </div>
                  </div>
                </div>

                {onOpenHelp && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        Interactive Feature Guide
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        View tips on chat, coding tools, voice mode, and document analysis.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenHelp}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shrink-0"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Open Guide</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Done Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#0E1118] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 text-xs font-semibold transition-opacity cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
