import React from 'react';
import {
  MessageSquare,
  Box,
  Code2,
  FileText,
  FolderKanban,
  Plus,
  Settings,
} from 'lucide-react';
import { UltronLogoMark } from './UltronLogoMark';
import {
  getSystemStatusThemeConfig,
  getBreathingPulseConfig,
  type UltronTheme,
} from '../utils/ultronLogic';

export type AppMode = 'chat' | '3d-core' | 'coding' | 'voice' | 'docs' | 'projects';

interface NavigationProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  onNewSession?: () => void;
  onOpenCommand: () => void;
  onOpenSettings: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  theme?: UltronTheme;
  isListening?: boolean;
  reducedMotion?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentMode,
  onSelectMode,
  onNewSession,
  onOpenSettings,
  theme = 'amber',
  isListening = true,
  reducedMotion = false,
}) => {
  const statusTheme = getSystemStatusThemeConfig(theme);
  const emblemBreathe = getBreathingPulseConfig('emblem', 0, reducedMotion);
  const statusBreathe = getBreathingPulseConfig('chip', 1, reducedMotion);
  const actionBreathe = getBreathingPulseConfig('chip', 2, reducedMotion);

  const navItems: Array<{
    id: AppMode;
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'chat', label: 'Assistant', icon: MessageSquare },
    { id: '3d-core', label: '3D Studio', icon: Box },
    { id: 'coding', label: 'Coding Agent', icon: Code2 },
    { id: 'docs', label: 'Document Lab', icon: FileText },
    { id: 'projects', label: 'Workspaces', icon: FolderKanban },
  ];

  return (
    <>
      {/* Minimal Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-40 w-full bg-[#040407]/90 border-b border-white/[0.07] px-4 md:px-8 py-3.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          {/* Zone 1: ULTRON Identity (Single-line brand wordmark + minimal U mark) */}
          <button
            type="button"
            onClick={() => onSelectMode('chat')}
            className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 rounded-lg group whitespace-nowrap shrink-0"
          >
            <UltronLogoMark size={26} className={emblemBreathe.className} />
            <span className="text-sm font-semibold tracking-[0.26em] text-slate-100 group-hover:text-white transition-colors">
              ULTRON
            </span>
          </button>

          {/* Zone 2: Clean Single-Line Text Navigation Links (Zero-Pill Discipline) */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-7 text-xs font-medium"
          >
            {navItems.map((item) => {
              const isActive = currentMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectMode(item.id)}
                  className={`relative py-1 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 rounded ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span
                      className={`absolute bottom-0 left-0 right-0 h-[1.5px] rounded-full transition-colors duration-300 ${statusTheme.accentBarClass}`}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Top-Right System Online Pulsing Indicator, New-Session Action & Settings */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Subtle 'System Online' Pulsing Indicator (Theme-Responsive, Active & Listening Cue) */}
            <button
              type="button"
              onClick={() => onSelectMode('voice')}
              title="Ultron System Online — Active and listening (Click for Voice Mode)"
              aria-label="System Online — Ultron is active and listening"
              data-testid="system-online-indicator"
              data-theme={theme}
              style={
                statusBreathe.delayMs
                  ? { animationDelay: `${statusBreathe.delayMs}ms` }
                  : undefined
              }
              className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium tracking-wide transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${statusTheme.bgColorClass} ${statusTheme.borderColorClass} ${statusBreathe.className}`}
            >
              <span className="relative flex h-2 w-2 items-center justify-center">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 transition-colors duration-300 ${statusTheme.pingColorClass}`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 transition-colors duration-300 ${statusTheme.dotColorClass} ${statusTheme.glowShadowClass}`}
                />
              </span>
              <span className={`transition-colors duration-300 ${statusTheme.textColorClass}`}>
                {statusTheme.label}
              </span>
              {isListening && (
                <span
                  aria-hidden="true"
                  className="hidden lg:inline-flex items-end gap-[2px] h-2.5 ml-0.5 opacity-80 group-hover:opacity-100 transition-opacity"
                >
                  <span
                    className={`w-[1.5px] h-1.5 rounded-full animate-pulse ${statusTheme.dotColorClass}`}
                  />
                  <span
                    className={`w-[1.5px] h-2.5 rounded-full animate-pulse [animation-delay:150ms] ${statusTheme.dotColorClass}`}
                  />
                  <span
                    className={`w-[1.5px] h-1 rounded-full animate-pulse [animation-delay:300ms] ${statusTheme.dotColorClass}`}
                  />
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectMode('chat');
                onNewSession?.();
              }}
              style={
                actionBreathe.delayMs
                  ? { animationDelay: `${actionBreathe.delayMs}ms` }
                  : undefined
              }
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.11] text-slate-100 border border-white/10 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${actionBreathe.className}`}
            >
              <Plus className={`w-3.5 h-3.5 transition-colors duration-300 ${statusTheme.accentIconClass}`} />
              <span className="hidden sm:inline">New Session</span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open Settings"
              className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border border-white/[0.08] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-[#08080e]/95 rounded-xl px-2 py-1.5 border border-white/10 shadow-2xl flex items-center justify-around"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentMode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectMode(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors min-h-[42px] min-w-[44px] ${
                isActive ? 'text-amber-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap">
                {item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
