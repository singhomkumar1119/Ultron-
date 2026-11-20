import React from 'react';
import {
  Menu,
  PanelLeftOpen,
  Plus,
  Settings,
  Search,
  Radio,
} from 'lucide-react';
import {
  getSystemStatusThemeConfig,
  type UltronTheme,
} from '../utils/ultronLogic';

export type AppMode = 'chat' | '3d-core' | 'coding' | 'voice' | 'docs' | 'projects';

interface NavigationProps {
  currentMode: AppMode;
  activeSessionTitle?: string;
  isSidebarOpen: boolean;
  onOpenDesktopSidebar: () => void;
  onOpenMobileDrawer: () => void;
  onSelectMode: (mode: AppMode) => void;
  onNewSession?: () => void;
  onOpenCommand: () => void;
  onOpenSettings: () => void;
  theme?: UltronTheme;
}

const MODE_LABELS: Record<AppMode, string> = {
  chat: 'Assistant',
  '3d-core': '3D Core Studio',
  coding: 'Coding Agent',
  voice: 'Live Voice',
  docs: 'Document Lab',
  projects: 'Workspaces',
};

export const Navigation: React.FC<NavigationProps> = ({
  currentMode,
  activeSessionTitle,
  isSidebarOpen,
  onOpenDesktopSidebar,
  onOpenMobileDrawer,
  onSelectMode,
  onNewSession,
  onOpenCommand,
  onOpenSettings,
  theme = 'indigo',
}) => {
  const statusTheme = getSystemStatusThemeConfig(theme);
  const headerTitle =
    currentMode === 'chat'
      ? activeSessionTitle || 'New chat'
      : MODE_LABELS[currentMode];

  return (
    <header className="sticky top-0 z-30 h-14 w-full bg-[#F8F9FB]/90 dark:bg-[#050509]/56 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08] dark:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.65)] px-3 sm:px-5 flex items-center justify-between gap-3 shrink-0 transition-colors">
      {/* Left: Sidebar toggles + Active Context Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Mobile Drawer Toggle */}
        <button
          type="button"
          onClick={onOpenMobileDrawer}
          aria-label="Open navigation menu"
          data-testid="mobile-sidebar-toggle-btn"
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/[0.07] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Desktop Expand Sidebar Button (visible only when collapsed) */}
        {!isSidebarOpen && (
          <button
            type="button"
            onClick={onOpenDesktopSidebar}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="hidden lg:inline-flex p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/[0.07] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2.5 min-w-0">
          <h2
            data-testid="active-session-header-title"
            className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px] sm:max-w-xs"
          >
            {headerTitle}
          </h2>
        </div>
      </div>

      {/* Right: Quick Search, Live Voice / System Online, Mobile New Chat, Settings */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenCommand}
          title="Command Palette (Cmd+K)"
          aria-label="Open quick command search"
          className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#15151D]/65 hover:bg-slate-100 dark:hover:bg-[#1E1F2B]/80 border border-slate-200 dark:border-white/[0.1] text-xs text-slate-500 dark:text-slate-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Search</span>
          <kbd className="hidden md:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.07] text-slate-500 dark:text-slate-400">
            ⌘K
          </kbd>
        </button>

        {/* System Online / Live Voice Button */}
        <button
          type="button"
          onClick={() => onSelectMode('voice')}
          title="Live Voice Mode"
          aria-label="System Online — Start Live Voice"
          data-testid="system-online-indicator"
          data-theme={theme}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${statusTheme.bgColorClass} ${statusTheme.borderColorClass}`}
        >
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusTheme.pingColorClass}`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${statusTheme.dotColorClass}`}
            />
          </span>
          <span className={`hidden sm:inline ${statusTheme.textColorClass}`}>
            {statusTheme.label}
          </span>
          <Radio className={`w-3.5 h-3.5 sm:hidden ${statusTheme.accentIconClass}`} />
        </button>

        {/* Mobile Quick New Chat */}
        <button
          type="button"
          onClick={() => {
            onSelectMode('chat');
            onNewSession?.();
          }}
          aria-label="New chat"
          className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 dark:bg-gradient-to-r dark:from-[#246BFF] dark:to-[#792BFF] dark:hover:brightness-110 text-white text-xs font-medium transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New chat</span>
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings"
          data-testid="header-settings-btn"
          className="p-2 rounded-xl bg-white dark:bg-[#15151D]/65 hover:bg-slate-100 dark:hover:bg-[#1E1F2B]/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/[0.1] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
