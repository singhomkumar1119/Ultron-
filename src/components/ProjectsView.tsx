import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  ArrowUpRight,
  Code2,
  MessageSquare,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { type AppMode } from './Navigation';

interface ProjectsViewProps {
  onSelectMode: (mode: AppMode) => void;
}

interface WorkspaceItem {
  id: string;
  title: string;
  category: 'Coding' | 'Research' | 'Analysis';
  mode: AppMode;
  lastUpdated: string;
  filesChanged: number;
  status: 'active' | 'archived';
  description: string;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onSelectMode }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'coding' | 'research'>('all');

  const [projects] = useState<WorkspaceItem[]>([
    {
      id: 'p1',
      title: 'Distributed Token Bucket Rate Limiter',
      category: 'Coding',
      mode: 'coding',
      lastUpdated: '12m ago',
      filesChanged: 3,
      status: 'active',
      description: 'Sliding-window algorithm with Redis cluster fallback and concurrency tests.',
    },
    {
      id: 'p2',
      title: 'Optical Interconnect & Silicon Photonics Synthesis',
      category: 'Research',
      mode: 'chat',
      lastUpdated: '1h ago',
      filesChanged: 0,
      status: 'active',
      description: 'Multi-wavelength division multiplexing and micro-ring resonator benchmarks.',
    },
    {
      id: 'p3',
      title: 'Autonomous Systems Architecture & Neural Scaling v4',
      category: 'Analysis',
      mode: 'docs',
      lastUpdated: '3h ago',
      filesChanged: 0,
      status: 'active',
      description: '6-page technical whitepaper with extracted citations and copy-on-write invariants.',
    },
    {
      id: 'p4',
      title: 'Zero-Knowledge Rollup STARK Verifier',
      category: 'Coding',
      mode: 'coding',
      lastUpdated: 'Yesterday',
      filesChanged: 8,
      status: 'active',
      description: 'Polynomial commitment verification circuits with Cairo compiler integration.',
    },
  ]);

  const filtered = projects.filter((p) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'coding') return p.category === 'Coding';
    if (activeTab === 'research') return p.category === 'Research' || p.category === 'Analysis';
    return true;
  });

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto px-4 sm:px-6 py-6 overflow-y-auto">
      {/* Header & New Project CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <FolderKanban className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
              Workspaces &amp; Archives
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Organized repositories, coding branches, and research vaults.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSelectMode('coding')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Active Workspaces</span>
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            4
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">
            All synchronized
          </span>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Staged File Patches</span>
            <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            11
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            Across 2 repositories
          </span>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Test Coverage</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            100%
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">
            All checks passing
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-white/10 pb-2">
        {(['all', 'coding', 'research'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors cursor-pointer ${
              activeTab === tab
                ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab === 'all' ? 'All Workspaces' : tab}
          </button>
        ))}
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
        {filtered.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectMode(item.mode)}
            className="glass-panel p-5 rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                    {item.mode === 'coding' ? (
                      <Code2 className="w-4 h-4" />
                    ) : item.mode === 'docs' ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">
                    {item.category}
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              </div>

              <h2 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                {item.title}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200/80 dark:border-white/[0.06] text-[11px] font-mono text-slate-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>{item.lastUpdated}</span>
              </div>
              {item.filesChanged > 0 && (
                <span className="text-indigo-600 dark:text-indigo-400">
                  +{item.filesChanged} files modified
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
