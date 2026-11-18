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
    <div className="flex flex-col h-[calc(100vh-65px)] max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* Top Document Toolbar */}
      <div className="glass-panel rounded-xl p-3 mb-4 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h1 className="text-xs font-semibold text-white tracking-wide truncate max-w-md">
              {activeDocName}
            </h1>
            <span className="text-[11px] text-slate-400 font-mono">
              6 Pages · Verified PDF Source · 2.4 MB
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleSimulateUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Main Split View: Left Document Reader, Right Ultron Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-0">
        {/* Left Pane: Document Reading View (7 cols) */}
        <div className="lg:col-span-7 flex flex-col glass-panel rounded-xl border border-white/10 overflow-hidden">
          {/* Reader Sub-Header */}
          <div className="p-3 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search document text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
                className="p-1 rounded hover:bg-white/5 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Page {currentPage} of 3</span>
              <button
                disabled={currentPage >= 3}
                onClick={() => setCurrentPage((p) => Math.min(3, p + 1))}
                aria-label="Next page"
                className="p-1 rounded hover:bg-white/5 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Document Content Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-200 leading-relaxed bg-[#06080d]/60">
            {documentSections.map((sec) => {
              const isMatch = !searchQuery || sec.content.toLowerCase().includes(searchQuery.toLowerCase());
              if (!isMatch) return null;

              return (
                <div
                  key={sec.id}
                  ref={(el) => {
                    sectionRefs.current[sec.id] = el;
                  }}
                  className={`p-4 rounded-xl transition-all duration-300 ${
                    selectedCitationId && sec.content.includes(selectedCitationId)
                      ? 'bg-amber-500/15 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                      : 'border border-white/5 bg-white/[0.01]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-amber-300">
                      {sec.title}
                    </h2>
                    <span className="text-[10px] font-mono text-slate-500">Page {sec.page}</span>
                  </div>
                  <p className="text-slate-300 text-xs md:text-sm leading-relaxed whitespace-pre-line">
                    {sec.content}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Ultron Synthesis, Citations & Action Items (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Executive Summary */}
          <div className="glass-panel rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-white tracking-wide">
                Executive Synthesis
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ultron analyzed the document structure across 3 critical vectors: hardware interconnect bandwidth, non-blocking asynchronous state machines, and copy-on-write sandboxing guarantees.
            </p>
          </div>

          {/* Interactive Clickable Citations */}
          <div className="glass-panel rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-200 tracking-wide">
                Verified Document Citations
              </span>
              <span className="text-[11px] font-mono text-amber-400">3 References</span>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleCitationClick('sec-1', '1.1')}
                className="w-full p-2.5 rounded-lg text-left glass-panel-subtle hover:bg-amber-500/10 hover:border-amber-500/30 transition-all group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-amber-400 font-semibold group-hover:text-amber-300">
                    [Ref 1.1: Section 1]
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-amber-400" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Non-blocking outbox model and state immutability via merkle roots.
                </p>
              </button>

              <button
                onClick={() => handleCitationClick('sec-2', '1.2')}
                className="w-full p-2.5 rounded-lg text-left glass-panel-subtle hover:bg-amber-500/10 hover:border-amber-500/30 transition-all group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-amber-400 font-semibold group-hover:text-amber-300">
                    [Ref 1.2: Section 2]
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-amber-400" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Silicon micro-ring resonators operating at &lt;1.4 pJ/bit bandwidth.
                </p>
              </button>

              <button
                onClick={() => handleCitationClick('sec-3', '2.1')}
                className="w-full p-2.5 rounded-lg text-left glass-panel-subtle hover:bg-amber-500/10 hover:border-amber-500/30 transition-all group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-amber-400 font-semibold group-hover:text-amber-300">
                    [Ref 2.1: Section 3]
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-amber-400" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Copy-on-write workspace sandboxing and atomic test rollbacks.
                </p>
              </button>
            </div>
          </div>

          {/* Action Items Checklist */}
          <div className="glass-panel rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Bookmark className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-slate-200 tracking-wide">
                Extracted Action Items
              </span>
            </div>

            <div className="space-y-2">
              {actionItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleAction(item.id)}
                  className="w-full flex items-start gap-2.5 text-left p-2 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  {item.done ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 group-hover:text-slate-300 shrink-0 mt-0.5" />
                  )}
                  <span
                    className={`text-xs ${
                      item.done ? 'text-slate-500 line-through' : 'text-slate-300'
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
