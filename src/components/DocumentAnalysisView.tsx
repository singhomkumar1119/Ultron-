import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  CheckSquare,
  Square,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bookmark,
} from 'lucide-react';
import { parseDocumentCitations } from '../utils/ultronLogic';

interface DocumentAnalysisViewProps {
  theme?: 'amber' | 'cyan' | 'violet';
}

interface DocSection {
  id: string;
  title: string;
  page: number;
  content: string;
}

export const DocumentAnalysisView: React.FC<DocumentAnalysisViewProps> = () => {
  const [activeDocName, setActiveDocName] = useState('Autonomous Systems Architecture & Neural Scaling v4');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCitationId, setSelectedCitationId] = useState<string | null>(null);
  const [actionItems, setActionItems] = useState([
    { id: '1', text: 'Refactor crossbar interconnect to optical circuit switching (OCS)', done: true },
    { id: '2', text: 'Deploy memory circuit-breaker with 5ms SLA fallback', done: false },
    { id: '3', text: 'Implement deterministic token bucket rate limiter', done: false },
    { id: '4', text: 'Audit STARK polynomial commitment latency on L2 rollups', done: false },
  ]);

  const [documentSections] = useState<DocSection[]>([
    {
      id: 'sec-1',
      title: '1. Executive Abstract & Core Invariants',
      page: 1,
      content: `The modern distributed AI substrate requires continuous coordination between decentralized neural nodes. In this architecture [Ref 1.1: Section 1 - Invariants], we establish a non-blocking outbox model for autonomous execution. Ultron enforces state immutability via content-addressed merkle roots, guaranteeing that speculative computations can be reverted with zero data corruption.`,
    },
    {
      id: 'sec-2',
      title: '2. Optical Interconnect & Photonic Bandwidth',
      page: 2,
      content: `Silicon photonics [Ref 1.2: Section 2 - Optical Fabric] eliminates the thermal and parasitic capacitive boundaries of conventional copper traces. By operating micro-ring resonators at multi-wavelength division multiplexing (WDM), cluster throughput reaches 1.2 Tbps per millimeter of substrate edge, dropping energy expenditure to <1.4 pJ/bit under peak load.`,
    },
    {
      id: 'sec-3',
      title: '3. Speculative Execution & Rollback Protocols',
      page: 3,
      content: `Autonomous code synthesis requires rigorous sandboxing [Ref 2.1: Section 3 - Sandboxing Protocol]. When Ultron suggests file edits, each mutation is isolated in a lightweight copy-on-write workspace. Unit test harnesses validate invariants before committing to main repositories, ensuring that failures trigger instantaneous atomic rollbacks.`,
    },
  ]);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleCitationClick = (sectionId: string, citationId: string) => {
    setSelectedCitationId(citationId);
    const targetEl = sectionRefs.current[sectionId];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const toggleAction = (id: string) => {
    setActionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const handleSimulateUpload = () => {
    setActiveDocName('Neural Quantum Interface Specification 2026.pdf');
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto px-4 sm:px-6 py-4 overflow-hidden">
      {/* Top Document Toolbar */}
      <div className="glass-panel rounded-2xl p-3.5 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div>
            <h1 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white tracking-wide truncate max-w-md">
              {activeDocName}
            </h1>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              6 Pages · Verified PDF Source · 2.4 MB
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleSimulateUpload}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 text-xs font-medium transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-0">
        {/* Left Pane: Document Reading View */}
        <div className="lg:col-span-7 flex flex-col glass-panel rounded-2xl overflow-hidden min-h-0">
          <div className="p-3 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search document text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
                className="p-1 rounded-lg hover:bg-slate-200/70 dark:hover:bg-white/5 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Page {currentPage} of 3</span>
              <button
                type="button"
                disabled={currentPage >= 3}
                onClick={() => setCurrentPage((p) => Math.min(3, p + 1))}
                aria-label="Next page"
                className="p-1 rounded-lg hover:bg-slate-200/70 dark:hover:bg-white/5 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-sm text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50/40 dark:bg-[#0B0D12]/60">
            {documentSections.map((sec) => {
              const isMatch = !searchQuery || sec.content.toLowerCase().includes(searchQuery.toLowerCase());
              if (!isMatch) return null;

              return (
                <div
                  key={sec.id}
                  ref={(el) => {
                    sectionRefs.current[sec.id] = el;
                  }}
                  className={`p-4 rounded-2xl transition-all duration-200 ${
                    selectedCitationId && sec.content.includes(selectedCitationId)
                      ? 'bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-300 dark:border-indigo-500/40 shadow-sm'
                      : 'border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                      {sec.title}
                    </h2>
                    <span className="text-[10px] font-mono text-slate-400">Page {sec.page}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs md:text-sm leading-relaxed whitespace-pre-line">
                    {sec.content}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Synthesis, Citations & Action Items */}
        <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1">
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white tracking-wide">
                Executive Summary
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Ultron analyzed the document structure across 3 key areas: interconnect bandwidth, non-blocking state machines, and sandboxing guarantees.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 tracking-wide">
                Document Citations
              </span>
              <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                3 References
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleCitationClick('sec-1', '1.1')}
                className="w-full p-2.5 rounded-xl text-left glass-panel-subtle hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                    [Ref 1.1: Section 1]
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Non-blocking outbox model and state immutability via merkle roots.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleCitationClick('sec-2', '1.2')}
                className="w-full p-2.5 rounded-xl text-left glass-panel-subtle hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                    [Ref 1.2: Section 2]
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Silicon micro-ring resonators operating at &lt;1.4 pJ/bit bandwidth.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleCitationClick('sec-3', '2.1')}
                className="w-full p-2.5 rounded-xl text-left glass-panel-subtle hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                    [Ref 2.1: Section 3]
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Copy-on-write workspace sandboxing and atomic test rollbacks.
                </p>
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bookmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 tracking-wide">
                Extracted Action Items
              </span>
            </div>

            <div className="space-y-2">
              {actionItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleAction(item.id)}
                  className="w-full flex items-start gap-2.5 text-left p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                >
                  {item.done ? (
                    <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 shrink-0 mt-0.5" />
                  )}
                  <span
                    className={`text-xs ${
                      item.done
                        ? 'text-slate-400 line-through'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
