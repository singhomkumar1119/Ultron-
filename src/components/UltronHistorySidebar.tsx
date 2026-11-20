import React, { useState, useRef } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Pencil,
  Trash2,
  Check,
  Search,
  MessageSquare,
  X,
  History,
  Wrench,
  Settings,
  HelpCircle,
  Code2,
  FileText,
  Box,
  FolderKanban,
  Mic,
  ChevronDown,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react';
import { UltronLogoMark } from './UltronLogoMark';
import {
  type ChatSessionItem,
  type UltronTheme,
  filterChatSessions,
  getSystemStatusThemeConfig,
} from '../utils/ultronLogic';
import type { AppMode } from './Navigation';

interface UltronHistorySidebarProps {
  sessions: ChatSessionItem[];
  activeSessionId: string;
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  isOpen: boolean;
  onToggleOpen: (nextOpen: boolean) => void;
  isMobileOpen: boolean;
  onToggleMobileOpen: (nextOpen: boolean) => void;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onRenameSession: (sessionId: string, nextTitle: string) => void;
  onDeleteSession: (sessionId: string) => void;
  theme?: UltronTheme;
}

export const UltronHistorySidebar: React.FC<UltronHistorySidebarProps> = ({
  sessions,
  activeSessionId,
  currentMode,
  onSelectMode,
  onOpenSettings,
  onOpenHelp,
  isOpen,
  onToggleOpen,
  isMobileOpen,
  onToggleMobileOpen,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
  theme = 'indigo',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistorySearch, setShowHistorySearch] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const statusTheme = getSystemStatusThemeConfig(theme);
  const filteredSessions = filterChatSessions(sessions, searchQuery);

  const handleStartRename = (
    session: ChatSessionItem,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleCommitRename = (sessionId: string) => {
    if (editingTitle.trim()) {
      onRenameSession(sessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const handleFocusHistory = () => {
    setShowHistorySearch(true);
    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 60);
  };

  const toolItems: Array<{
    id: AppMode;
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'coding', label: 'Coding Agent', icon: Code2 },
    { id: 'docs', label: 'Document Lab', icon: FileText },
    { id: '3d-core', label: '3D Core Studio', icon: Box },
    { id: 'projects', label: 'Workspaces', icon: FolderKanban },
    { id: 'voice', label: 'Live Voice', icon: Mic },
  ];

  const renderSidebarBody = (isMobile: boolean) => (
    <div className="flex flex-col h-full">
      {/* Top: Brand + Collapse */}
      <div className="flex items-center justify-between px-1 pb-3">
        <button
          type="button"
          onClick={() => {
            onSelectMode('chat');
            if (isMobile) onToggleMobileOpen(false);
          }}
          className="flex items-center gap-2.5 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
        >
          <UltronLogoMark size={26} />
          <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
            Ultron
          </span>
        </button>

        {isMobile ? (
          <button
            type="button"
            aria-label="Close navigation drawer"
            onClick={() => onToggleMobileOpen(false)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onToggleOpen(false)}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Prominent "New chat" CTA */}
      <button
        type="button"
        data-testid="sidebar-new-chat-btn"
        onClick={() => {
          onSelectMode('chat');
          onCreateSession();
          if (isMobile) onToggleMobileOpen(false);
        }}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 dark:bg-gradient-to-r dark:from-[#246BFF] dark:via-[#4F46FF] dark:to-[#792BFF] dark:hover:brightness-110 dark:border dark:border-white/15 dark:shadow-[0_0_24px_-6px_rgba(36,107,255,0.6),inset_0_1px_0_rgba(255,255,255,0.22)] text-white text-sm font-medium shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#050509] cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>New chat</span>
      </button>

      {/* Primary Navigation Sections */}
      <nav aria-label="Sidebar Navigation" className="mt-4 space-y-0.5">
        <button
          type="button"
          onClick={() => {
            onSelectMode('chat');
            if (isMobile) onToggleMobileOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            currentMode === 'chat'
              ? 'bg-indigo-50 dark:bg-[#246BFF]/15 dark:border dark:border-[#246BFF]/30 text-indigo-700 dark:text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span>Chat</span>
        </button>

        <button
          type="button"
          onClick={handleFocusHistory}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            showHistorySearch
              ? 'bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <History className="w-4 h-4 shrink-0" />
            <span>History</span>
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
            {sessions.length}
          </span>
        </button>

        <div>
          <button
            type="button"
            onClick={() => setToolsExpanded((prev) => !prev)}
            aria-expanded={toolsExpanded}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              currentMode !== 'chat'
                ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-200'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Wrench className="w-4 h-4 shrink-0" />
              <span>Tools</span>
            </span>
            {toolsExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {toolsExpanded && (
            <div className="mt-1 ml-3 pl-3 border-l border-slate-200 dark:border-white/[0.08] space-y-0.5">
              {toolItems.map((tool) => {
                const Icon = tool.icon;
                const isActive = currentMode === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => {
                      onSelectMode(tool.id);
                      if (isMobile) onToggleMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-200'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tool.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            onOpenSettings();
            if (isMobile) onToggleMobileOpen(false);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenHelp();
            if (isMobile) onToggleMobileOpen(false);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Help &amp; Guide</span>
        </button>
      </nav>

      {/* Divider + Recent Chats Header */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Recent chats
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowHistorySearch((v) => !v)}
            aria-label="Search chats"
            title="Search recent chats"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Optional Search Filter */}
      {showHistorySearch && (
        <div className="mt-2 relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recent chats..."
            aria-label="Filter chat sessions"
            className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Recent Chats Scroll List */}
      <div
        data-testid="chat-sessions-list"
        className="flex-1 overflow-y-auto mt-2 space-y-1 pr-0.5"
      >
        {filteredSessions.length === 0 ? (
          <div className="py-6 px-3 text-center text-xs text-slate-400 dark:text-slate-500">
            No matching chats found.
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId && currentMode === 'chat';
            const isEditing = editingSessionId === session.id;

            return (
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                aria-current={isActive ? 'true' : undefined}
                aria-label={`Switch to session ${session.title}`}
                data-testid={`history-session-item-${session.id}`}
                onClick={() => {
                  if (!isEditing) {
                    onSelectSession(session.id);
                    onSelectMode('chat');
                    if (isMobile) onToggleMobileOpen(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onSelectSession(session.id);
                    onSelectMode('chat');
                    if (isMobile) onToggleMobileOpen(false);
                  }
                }}
                className={`group rounded-xl px-2.5 py-2 transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 ${
                  isActive
                    ? 'bg-slate-200/80 dark:bg-white/[0.08] dark:border dark:border-[#FF173D]/30 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_-8px_rgba(255,23,61,0.5)] text-slate-900 dark:text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white border border-transparent'
                }`}
              >
                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCommitRename(session.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      aria-label="Rename conversation"
                      autoFocus
                      className="flex-1 bg-white dark:bg-[#050509] px-2 py-1 rounded-lg text-xs text-slate-900 dark:text-white border border-indigo-500 dark:border-[#FF173D]/60 focus:outline-none"
                    />
                    <button
                      type="submit"
                      aria-label="Save name"
                      className="p-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium truncate">
                        {session.title}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums mt-0.5">
                        {session.updatedAt}
                      </p>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleStartRename(session, e)}
                        aria-label={`Rename ${session.title}`}
                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        aria-label={`Delete ${session.title}`}
                        className="p-1 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Workspace Status */}
      <div className="pt-3 mt-2 border-t border-slate-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-2.5 px-1.5 py-1.5">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/[0.07] flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
              Local workspace
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Browser history saved
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (lg+) */}
      <aside
        aria-label="Conversation History"
        data-testid="conversation-history-sidebar"
        data-collapsed={!isOpen}
        className={`hidden lg:flex flex-col relative z-20 bg-white dark:bg-[#0B0C12]/72 dark:backdrop-blur-2xl border-r border-slate-200 dark:border-white/[0.09] dark:shadow-[10px_0_36px_rgba(0,0,0,0.58)] transition-all duration-200 shrink-0 h-full ${
          isOpen ? 'w-72 p-3.5' : 'w-16 py-3.5 px-2 items-center'
        }`}
      >
        {isOpen ? (
          renderSidebarBody(false)
        ) : (
          /* Collapsed Icon Rail */
          <div className="flex flex-col items-center justify-between h-full w-full">
            <div className="flex flex-col items-center gap-2.5 w-full">
              <button
                type="button"
                onClick={() => onToggleOpen(true)}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.07] text-slate-600 dark:text-slate-300 transition-colors"
              >
                <PanelLeftOpen className={`w-4 h-4 ${statusTheme.accentIconClass}`} />
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectMode('chat');
                  onCreateSession();
                }}
                aria-label="New chat"
                title="New chat"
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 dark:bg-gradient-to-br dark:from-[#246BFF] dark:to-[#792BFF] dark:hover:brightness-110 text-white transition-all shadow-sm dark:shadow-[0_0_18px_-4px_rgba(36,107,255,0.65)]"
              >
                <Plus className="w-4 h-4" />
              </button>

              <div className="w-6 h-px bg-slate-200 dark:bg-white/10 my-1" />

              <button
                type="button"
                onClick={() => onSelectMode('chat')}
                aria-label="Chat"
                title="Chat"
                className={`p-2 rounded-xl transition-colors ${
                  currentMode === 'chat'
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onToggleOpen(true);
                  handleFocusHistory();
                }}
                aria-label="History"
                title="History"
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                <History className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('coding')}
                aria-label="Coding Agent"
                title="Coding Agent"
                className={`p-2 rounded-xl transition-colors ${
                  currentMode === 'coding'
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                }`}
              >
                <Code2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Settings"
                title="Settings"
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onOpenHelp}
                aria-label="Help"
                title="Help & Guide"
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile / Tablet Slide-Over Drawer (< lg) */}
      {isMobileOpen && (
        <div
          onClick={() => onToggleMobileOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs lg:hidden flex"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Drawer"
            className="w-80 max-w-[85vw] h-full bg-white dark:bg-[#0B0C12]/88 dark:backdrop-blur-2xl p-4 border-r border-slate-200 dark:border-white/[0.11] shadow-2xl"
          >
            {renderSidebarBody(true)}
          </div>
        </div>
      )}
    </>
  );
};
