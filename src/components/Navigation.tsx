import React from 'react';
import {
  Menu,
  PanelLeftOpen,
  Plus,
  Settings,
  Search,
  Database,
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
  isCloudSynced?: boolean;
  onSignIn?: () => void;
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
  isCloudSynced = false,
  onSignIn,
}) => {
  const statusTheme = getSystemStatusThemeConfig(theme);
  const headerTitle =
    currentMode === 'chat'
      ? activeSessionTitle || 'New chat'
      : MODE_LABELS[currentMode];

  return (
    <header className="sticky top-0 z-30 h-14 w-full bg-[#F8F9FB]/90 dark:bg-[#0B0D12]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.07] px-3 sm:px-5 flex items-center justify-between gap-3 shrink-0 transition-colors">
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

          {currentMode === 'chat' && (
            isCloudSynced ? (
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 px-2 py-0.5 rounded-lg shrink-0">
                <Database className="w-3 h-3" />
                <span>Synced</span>
              </span>
            ) : (
              onSignIn && (
                <button
                  type="button"
                  onClick={onSignIn}
                  data-testid="google-signin-button"
                  className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] px-2 py-0.5 rounded-lg transition-colors shrink-0"
                >
                  <Database className="w-3 h-3" />
                  <span>Sync history</span>
                </button>
              )
            )
          )}
        </div>
      </div>

      {/* Right: Quick Search, Live Voice / System Online, Mobile New Chat, Settings */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenCommand}
          title="Command Palette (Cmd+K)"
          aria-label="Open quick command search"
          className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-500 dark:text-slate-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
          className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
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
          className="p-2 rounded-xl bg-white dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/[0.08] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
