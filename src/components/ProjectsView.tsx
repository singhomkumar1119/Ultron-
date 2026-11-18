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
    <div className="flex flex-col h-[calc(100vh-65px)] max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Header & New Project CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-bold text-white tracking-wide">
              Workspaces & Neural Archives
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Organized repositories, autonomous coding branches, and analytical vaults.
          </p>
        </div>

        <button
          onClick={() => onSelectMode('coding')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Directive</span>
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-xl border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Active Directives</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">4</div>
          <span className="text-[11px] text-emerald-400 mt-1 block">All synchronized</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Staged File Patches</span>
            <Code2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">11</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Across 2 repositories</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Verified Invariants</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">100%</div>
          <span className="text-[11px] text-emerald-400 mt-1 block">Test suites passing</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
        {(['all', 'coding', 'research'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'all' ? 'All Workspaces' : `${tab} Directives`}
          </button>
        ))}
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
        {filtered.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectMode(item.mode)}
            className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-amber-500/40 hover:bg-white/[0.06] transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    {item.mode === 'coding' ? (
                      <Code2 className="w-4 h-4" />
                    ) : item.mode === 'docs' ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[11px] font-mono uppercase text-slate-400">
                    {item.category}
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
              </div>

              <h2 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                {item.title}
              </h2>
              <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5 text-[11px] font-mono text-slate-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>{item.lastUpdated}</span>
              </div>
              {item.filesChanged > 0 && (
                <span className="text-amber-400">+{item.filesChanged} files modified</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
