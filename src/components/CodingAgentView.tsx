import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  Clock,
  RotateCcw,
  FileCode,
  ShieldAlert,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { computeUnifiedDiff } from '../utils/ultronLogic';

interface CodingAgentViewProps {
  initialTask?: string;
}

interface PlanStep {
  id: number;
  title: string;
  detail: string;
  status: 'completed' | 'in_progress' | 'pending';
}

interface MockFile {
  path: string;
  name: string;
  status: 'modified' | 'added' | 'deleted';
  originalCode: string;
  modifiedCode: string;
}

export const CodingAgentView: React.FC<CodingAgentViewProps> = ({
  initialTask = 'Build resilient Token Bucket rate limiter in TypeScript with Redis rollback',
}) => {
  const [taskInput, setTaskInput] = useState(initialTask);
  const [isExecuting, setIsExecuting] = useState(false);
  const [diffViewMode, setDiffViewMode] = useState<'unified' | 'split'>('unified');
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rolled_back'>('pending');
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  const planSteps: PlanStep[] = [
    {
      id: 1,
      title: 'Analyze Requirements & Edge Conditions',
      detail: 'Model distributed sliding window with microsecond burst tolerance and network failure modes.',
      status: 'completed',
    },
    {
      id: 2,
      title: 'Implement Core Rate Limiter Interface',
      detail: 'Construct SlidingWindowRateLimiter class with atomic Lua pipeline script.',
      status: 'completed',
    },
    {
      id: 3,
      title: 'Implement In-Memory Circuit Breaker',
      detail: 'Provide deterministic fallback buffer when Redis latency exceeds 5ms threshold.',
      status: 'completed',
    },
    {
      id: 4,
      title: 'Verify Against Concurrency Test Suite',
      detail: 'Run synthetic 5,000 req/sec benchmark checking 0 false-rejections.',
      status: isExecuting ? 'in_progress' : approvalStatus === 'approved' ? 'completed' : 'pending',
    },
  ];

  const files: MockFile[] = [
    {
      path: 'src/rateLimiter.ts',
      name: 'rateLimiter.ts',
      status: 'modified',
      originalCode: `export class TokenBucket {
  private tokens: number = 10;
  
  allow(): boolean {
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }
}`,
      modifiedCode: `export interface LimiterOptions {
  capacity: number;
  refillRatePerSec: number;
  circuitBreakerTimeoutMs: number;
}

export class SlidingWindowRateLimiter {
  private memoryTokens: number;
  private lastRefill: number = Date.now();

  constructor(private options: LimiterOptions) {
    this.memoryTokens = options.capacity;
  }

  async acquire(clientId: string): Promise<{ success: boolean; remaining: number }> {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.memoryTokens = Math.min(
      this.options.capacity,
      this.memoryTokens + elapsed * this.options.refillRatePerSec
    );
    this.lastRefill = now;

    if (this.memoryTokens >= 1) {
      this.memoryTokens -= 1;
      return { success: true, remaining: Math.floor(this.memoryTokens) };
    }

    return { success: false, remaining: 0 };
  }
}`,
    },
    {
      path: 'src/redisFallback.ts',
      name: 'redisFallback.ts',
      status: 'added',
      originalCode: `// Stub file`,
      modifiedCode: `/**
 * Ultron Autonomous Circuit Breaker
 * Degrades gracefully to local memory when Redis connection drops.
 */
export async function executeWithTimeout<T>(
  promise: Promise<T>,
  fallback: () => T,
  timeoutMs: number = 5
): Promise<T> {
  const timer = new Promise<T>((resolve) => setTimeout(() => resolve(fallback()), timeoutMs));
  return Promise.race([promise, timer]);
}`,
    },
  ];

  const activeFile = files[selectedFileIndex] || files[0];
  const diffResult = computeUnifiedDiff(activeFile.originalCode, activeFile.modifiedCode);

  const handleRunTests = () => {
    setIsExecuting(true);
    setTestOutput('Running node:test suite with 5 concurrency workers...\n');
    setTimeout(() => {
      setTestOutput(
        `[Ultron Test Runner] ✓ src/rateLimiter.test.ts (4 tests passing, 0 failed)\n[Ultron Test Runner] ✓ src/redisFallback.test.ts (2 tests passing, 0 failed)\n[Ultron Test Runner] Concurrency Benchmark: 5,000 req/s, 0.28ms latency P99\n[Ultron Test Runner] All test invariants validated.`
      );
      setIsExecuting(false);
    }, 700);
  };

  const handleApply = () => {
    setApprovalStatus('approved');
  };

  const handleRollback = () => {
    setApprovalStatus('rolled_back');
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto px-4 sm:px-6 py-4 overflow-hidden">
      {/* Top Directive Header */}
      <div className="glass-panel rounded-2xl p-3.5 mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 flex-1 w-full">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <FileCode className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white focus:outline-none placeholder-slate-400"
            placeholder="Describe refactor, feature, or architectural patch..."
          />
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <button
            type="button"
            onClick={handleRunTests}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 text-xs font-medium transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{isExecuting ? 'Running Tests...' : 'Run Test Suite'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-0">
        {/* Left Column: Plan & Files & Test Log (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Autonomous Execution Plan */}
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 tracking-wide">
                Execution Plan
              </span>
              <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                4 Stages
              </span>
            </div>

            <div className="space-y-3">
              {planSteps.map((step) => (
                <div key={step.id} className="flex items-start gap-2.5 text-xs">
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : step.status === 'in_progress' ? (
                    <Clock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-200">
                      {step.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Changed Files Explorer */}
          <div className="glass-panel rounded-2xl p-4">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 tracking-wide block mb-3">
              Staged Changes ({files.length} files)
            </span>
            <div className="space-y-1.5">
              {files.map((file, idx) => {
                const isSelected = selectedFileIndex === idx;
                return (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => setSelectedFileIndex(idx)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-900 dark:text-white border border-indigo-200 dark:border-indigo-500/35'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span className="font-mono">{file.name}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                        file.status === 'modified'
                          ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'
                          : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                      }`}
                    >
                      {file.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Test Terminal */}
          {testOutput && (
            <div className="rounded-2xl p-3.5 border border-slate-200 dark:border-white/10 font-mono text-[11px] text-slate-200 bg-slate-950">
              <div className="flex items-center gap-1.5 text-slate-400 mb-2 border-b border-white/10 pb-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>Test Suite Verification Log</span>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed text-emerald-300">
                {testOutput}
              </pre>
            </div>
          )}
        </div>

        {/* Right Column: Code Diff Inspector & Approval Banner (8 cols) */}
        <div className="lg:col-span-8 flex flex-col glass-panel rounded-2xl overflow-hidden min-h-0">
          {/* File Header & View Mode Switcher */}
          <div className="flex items-center justify-between p-3.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                {activeFile.path}
              </span>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                +{diffResult.additions}
              </span>
              <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400">
                -{diffResult.deletions}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.04] p-0.5 rounded-xl text-xs border border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setDiffViewMode('unified')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  diffViewMode === 'unified'
                    ? 'bg-white dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-medium shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Unified Diff
              </button>
              <button
                type="button"
                onClick={() => setDiffViewMode('split')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  diffViewMode === 'split'
                    ? 'bg-white dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-medium shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Split View
              </button>
            </div>
          </div>

          {/* Diff Content Area */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed bg-slate-950 text-slate-200">
            {diffViewMode === 'unified' ? (
              <div className="space-y-0.5">
                {diffResult.lines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start px-2 py-0.5 rounded ${
                      line.type === 'add'
                        ? 'bg-emerald-950/50 text-emerald-200 border-l-2 border-emerald-500'
                        : line.type === 'del'
                        ? 'bg-rose-950/50 text-rose-200 border-l-2 border-rose-500 line-through opacity-75'
                        : 'text-slate-300 hover:bg-white/[0.02]'
                    }`}
                  >
                    <span className="w-8 shrink-0 text-slate-500 text-right pr-2 select-none">
                      {line.type === 'add' ? line.newLineNumber : line.oldLineNumber || ''}
                    </span>
                    <span className="w-4 shrink-0 text-slate-500 select-none">
                      {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
                    </span>
                    <span className="whitespace-pre overflow-x-auto">{line.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="border-r border-white/10 pr-2">
                  <div className="text-slate-400 text-[10px] uppercase font-bold mb-2">
                    Original
                  </div>
                  <pre className="text-rose-200/90 whitespace-pre overflow-x-auto">
                    {activeFile.originalCode}
                  </pre>
                </div>
                <div className="pl-2">
                  <div className="text-emerald-400 text-[10px] uppercase font-bold mb-2">
                    Proposed Patch
                  </div>
                  <pre className="text-emerald-200 whitespace-pre overflow-x-auto">
                    {activeFile.modifiedCode}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Explicit Safety Approval / Rollback Footer Bar */}
          <div className="p-3.5 border-t border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-slate-600 dark:text-slate-300">
                {approvalStatus === 'approved'
                  ? 'All changes applied cleanly to workspace.'
                  : approvalStatus === 'rolled_back'
                  ? 'Changes rolled back to previous checkpoint.'
                  : 'Review proposed diff before applying changes.'}
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleRollback}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-xs transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert Diff</span>
              </button>

              <button
                type="button"
                onClick={handleApply}
                disabled={approvalStatus === 'approved'}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm disabled:opacity-50 transition-all cursor-pointer"
              >
                <span>{approvalStatus === 'approved' ? 'Applied' : 'Apply Changes'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
