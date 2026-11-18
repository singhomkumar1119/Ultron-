import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  type ChatSessionItem,
  type UltronTheme,
  filterChatSessions,
  getSessionPreviewSnippet,
  getBreathingPulseConfig,
  getSystemStatusThemeConfig,
} from '../utils/ultronLogic';

interface UltronHistorySidebarProps {
  sessions: ChatSessionItem[];
  activeSessionId: string;
  isOpen: boolean;
  onToggleOpen: (nextOpen: boolean) => void;
  isMobileOpen: boolean;
  onToggleMobileOpen: (nextOpen: boolean) => void;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onRenameSession: (sessionId: string, nextTitle: string) => void;
  onDeleteSession: (sessionId: string) => void;
  theme?: UltronTheme;
  reducedMotion?: boolean;
}

export const UltronHistorySidebar: React.FC<UltronHistorySidebarProps> = ({
  sessions,
  activeSessionId,
  isOpen,
  onToggleOpen,
  isMobileOpen,
  onToggleMobileOpen,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
  theme = 'amber',
  reducedMotion = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const statusTheme = getSystemStatusThemeConfig(theme);
  const sidebarBreathe = getBreathingPulseConfig('panel', 0, reducedMotion);

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

  const activeSessionAccentClass =
    theme === 'cyan'
      ? 'bg-cyan-500/[0.11] border-cyan-400/35 text-white shadow-[0_8px_24px_-8px_rgba(34,211,238,0.25)]'
      : theme === 'violet'
      ? 'bg-violet-500/[0.11] border-violet-400/35 text-white shadow-[0_8px_24px_-8px_rgba(167,139,250,0.25)]'
      : 'bg-amber-500/[0.11] border-amber-400/35 text-white shadow-[0_8px_24px_-8px_rgba(251,191,36,0.22)]';

  const renderSessionList = (closeMobileOnSelect: boolean) => (
    <div className="flex-1 overflow-y-auto mt-2.5 space-y-1.5 pr-1">
      {filteredSessions.length === 0 ? (
        <div className="py-8 px-3 text-center text-xs text-slate-500">
          No matching sessions found.
        </div>
      ) : (
        filteredSessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const isEditing = editingSessionId === session.id;
          const promptCount = session.messages.filter(
            (m) => m.role === 'user'
          ).length;
          const preview = getSessionPreviewSnippet(session);

          return (
            <div
              key={session.id}
              data-testid={`history-session-item-${session.id}`}
              onClick={() => {
                if (!isEditing) {
                  onSelectSession(session.id);
                  if (closeMobileOnSelect) onToggleMobileOpen(false);
                }
              }}
              className={`group rounded-xl px-3 py-2.5 transition-all duration-200 cursor-pointer border ${
                isActive
                  ? activeSessionAccentClass
                  : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.12] text-slate-300 hover:text-white'
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
                    className="flex-1 bg-black/60 px-2 py-1 rounded text-xs text-white border border-amber-400/50 focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Save name"
                    className="p-1 rounded bg-amber-500 text-slate-950 hover:bg-amber-400"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </form>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive
                            ? statusTheme.accentIconClass
                            : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />
                      <p className="text-xs font-semibold truncate">
                        {session.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleStartRename(session, e)}
                        aria-label={`Rename ${session.title}`}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
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
                        className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 truncate pl-5">
                    {preview}
                  </p>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pl-5 tabular-nums">
                    <span>{session.updatedAt}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {promptCount} {promptCount === 1 ? 'prompt' : 'prompts'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{session.contextMode}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Glassmorphic Collapsible Sidebar (lg+) */}
      <aside
        aria-label="Conversation History"
        data-testid="conversation-history-sidebar"
        data-collapsed={!isOpen}
        className={`hidden lg:flex flex-col glass-panel rounded-2xl transition-all duration-300 overflow-hidden shrink-0 ${
          isOpen
            ? 'w-72 p-3.5'
            : 'w-14 py-3.5 px-2 items-center'
        }`}
      >
        {isOpen ? (
          <>
            {/* Expanded Sidebar Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <History className={`w-3.5 h-3.5 ${statusTheme.accentIconClass} ${sidebarBreathe.className}`} />
                <h2 className="text-xs font-semibold tracking-wide text-slate-100">
                  Conversations
                </h2>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onCreateSession}
                  aria-label="New conversation"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-100 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                >
                  <Plus className={`w-3 h-3 ${statusTheme.accentIconClass}`} />
                  <span>New</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleOpen(false)}
                  aria-label="Collapse sidebar"
                  title="Collapse history sidebar"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Glassmorphic Session Filter Input */}
            <div className="mt-2.5 relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter sessions..."
                aria-label="Filter chat sessions"
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-white/20 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear session filter"
                  className="absolute right-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Scrollable Session Switcher List */}
            {renderSessionList(false)}

            {/* Expanded Sidebar Footer */}
            <div className="pt-2.5 mt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
              <span>Session history persisted</span>
              <span>{sessions.length} saved</span>
            </div>
          </>
        ) : (
          /* Collapsed Glassmorphic Vertical Rail */
          <div className="flex flex-col items-center justify-between h-full w-full">
            <div className="flex flex-col items-center gap-2.5 w-full">
              <button
                type="button"
                onClick={() => onToggleOpen(true)}
                aria-label="Expand sidebar"
                title="Expand Conversation History"
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-slate-200 transition-colors"
              >
                <PanelLeftOpen className={`w-4 h-4 ${statusTheme.accentIconClass}`} />
              </button>

              <button
                type="button"
                onClick={onCreateSession}
                aria-label="New conversation"
                title="Start New Conversation"
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>

              <div className="w-6 h-[1px] bg-white/10 my-1" />

              {/* Compact Quick-Switch Session Icons while Collapsed */}
              <div className="flex flex-col items-center gap-1.5 w-full overflow-y-auto max-h-80">
                {sessions.map((session, idx) => {
                  const isActive = session.id === activeSessionId;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => onSelectSession(session.id)}
                      aria-label={`Switch to ${session.title}`}
                      title={session.title}
                      className={`w-9 h-9 rounded-xl text-[11px] font-mono font-semibold flex items-center justify-center transition-all border ${
                        isActive
                          ? activeSessionAccentClass
                          : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <span className="text-[10px] font-mono text-slate-500 tabular-nums">
              {sessions.length}
            </span>
          </div>
        )}
      </aside>

      {/* Mobile / Tablet Glassmorphic History Slide-Over Drawer (< lg) */}
      {isMobileOpen && (
        <div
          onClick={() => onToggleMobileOpen(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden flex"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Conversation History"
            className="w-80 max-w-[86vw] h-full glass-panel p-4 flex flex-col justify-between border-r border-white/15 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <History className={`w-4 h-4 ${statusTheme.accentIconClass}`} />
                <span className="text-xs font-semibold text-white">
                  Conversations ({sessions.length})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onCreateSession();
                    onToggleMobileOpen(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[11px] font-medium"
                >
                  + New
                </button>
                <button
                  type="button"
                  aria-label="Close mobile history drawer"
                  onClick={() => onToggleMobileOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {renderSessionList(true)}

            <div className="pt-2.5 mt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
              <span>Session history persisted</span>
              <span>{sessions.length} saved</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
