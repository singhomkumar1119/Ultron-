import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MessageSquare,
  Code2,
  Mic,
  FileText,
  FolderKanban,
  Settings,
  Sparkles,
  Palette,
  Volume2,
} from 'lucide-react';
import { type CommandItem, filterCommands } from '../utils/ultronLogic';
import { type AppMode } from './Navigation';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: AppMode) => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectMode,
  onOpenSettings,
  onToggleTheme,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commands: CommandItem[] = [
    {
      id: 'cmd-chat',
      title: 'Neural Assistant',
      category: 'Modes',
      shortcut: '1',
      iconName: 'MessageSquare',
      description: 'Engage with Ultron autonomous reasoning engine',
    },
    {
      id: 'cmd-3d-core',
      title: '3D Spatial Studio (GetLayers UI)',
      category: 'Modes',
      shortcut: '2',
      iconName: 'Sparkles',
      description: 'Interactive Three.js 3D Ultron Core with Vesper & Flora morphing',
    },
    {
      id: 'cmd-coding',
      title: 'Coding Agent & Diff Review',
      category: 'Modes',
      shortcut: '3',
      iconName: 'Code2',
      description: 'Plan, edit files, review diffs, run test suites',
    },
    {
      id: 'cmd-voice',
      title: 'Voice Cognition Mode',
      category: 'Modes',
      shortcut: '4',
      iconName: 'Mic',
      description: 'Full-screen liquid glass orb voice communication',
    },
    {
      id: 'cmd-docs',
      title: 'Document Analysis & Citations',
      category: 'Modes',
      shortcut: '5',
      iconName: 'FileText',
      description: 'Extract summaries, citations and action items',
    },
    {
      id: 'cmd-projects',
      title: 'Workspaces & Vaults',
      category: 'Modes',
      shortcut: '6',
      iconName: 'FolderKanban',
      description: 'Manage active threads and code repositories',
    },
    {
      id: 'cmd-theme',
      title: 'Switch Color Palette Theme',
      category: 'Settings',
      iconName: 'Palette',
      description: 'Cycle between Ultron Prime, Quantum Cyan, and Neon Violet',
    },
    {
      id: 'cmd-settings',
      title: 'Open System Preferences',
      category: 'Settings',
      shortcut: ',',
      iconName: 'Settings',
      description: 'Model selection, audio synthesis, accessibility',
    },
  ];

  const filtered = filterCommands(commands, query);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          // handled by parent
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          executeCommand(filtered[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex]);

  const executeCommand = (item: CommandItem) => {
    switch (item.id) {
      case 'cmd-chat':
        onSelectMode('chat');
        break;
      case 'cmd-3d-core':
        onSelectMode('3d-core');
        break;
      case 'cmd-coding':
        onSelectMode('coding');
        break;
      case 'cmd-voice':
        onSelectMode('voice');
        break;
      case 'cmd-docs':
        onSelectMode('docs');
        break;
      case 'cmd-projects':
        onSelectMode('projects');
        break;
      case 'cmd-theme':
        onToggleTheme();
        break;
      case 'cmd-settings':
        onOpenSettings();
        break;
    }
    onClose();
  };

  const renderIcon = (name: string) => {
    switch (name) {
      case 'MessageSquare':
        return <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'Code2':
        return <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'Mic':
        return <Mic className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'FileText':
        return <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'FolderKanban':
        return <FolderKanban className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'Palette':
        return <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'Settings':
        return <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/55 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-[#12151E] rounded-2xl border border-slate-200 dark:border-white/15 shadow-2xl overflow-hidden text-slate-900 dark:text-white"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
          <Search className="w-4 h-4 text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search Ultron tools, modes, and settings..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 text-slate-500 dark:text-slate-400 border border-slate-300/60 dark:border-white/10">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No matching commands found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <button
                  key={item.id}
                  onClick={() => executeCommand(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-500/20 text-slate-900 dark:text-white border border-indigo-200 dark:border-indigo-500/35'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5">
                      {renderIcon(item.iconName)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500">
                      {item.category}
                    </span>
                    {item.shortcut && (
                      <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                        {item.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.01] flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Navigate with ↑↓, select with ↵</span>
          <span>Quick Actions</span>
        </div>
      </div>
    </div>
  );
};
