import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Cpu,
  Wifi,
  GripHorizontal,
  Minimize2,
  Maximize2,
  RotateCcw,
} from 'lucide-react';
import {
  computeSystemVitals,
  clampFloatingPosition,
  getBreathingPulseConfig,
  getSystemStatusThemeConfig,
  type UltronTheme,
} from '../utils/ultronLogic';

interface UltronSystemVitalsPanelProps {
  theme?: UltronTheme;
  reducedMotion?: boolean;
}

const PANEL_WIDTH = 256;
const PANEL_HEIGHT_EXPANDED = 178;
const PANEL_HEIGHT_COLLAPSED = 42;

export const UltronSystemVitalsPanel: React.FC<UltronSystemVitalsPanelProps> = ({
  theme = 'amber',
  reducedMotion = false,
}) => {
  const [tick, setTick] = useState(1);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isBoosted, setIsBoosted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // null position means docked in its default bottom-right corner;
  // once dragged, stores viewport-clamped { x, y } coordinates
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({
    offsetX: 0,
    offsetY: 0,
  });

  // Update real-time vitals every 1.4 seconds
  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1400);
    return () => window.clearInterval(interval);
  }, []);

  // Re-clamp on window resize if custom-positioned
  useEffect(() => {
    if (!position) return;
    const handleResize = () => {
      const h = isExpanded ? PANEL_HEIGHT_EXPANDED : PANEL_HEIGHT_COLLAPSED;
      setPosition((prev) =>
        prev
          ? clampFloatingPosition(
              prev.x,
              prev.y,
              PANEL_WIDTH,
              h,
              window.innerWidth,
              window.innerHeight
            )
          : null
      );
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, isExpanded]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore clicks on buttons inside the header
    if ((e.target as HTMLElement).closest('button')) return;
    const el = panelRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    dragOffsetRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };

    if (!position) {
      setPosition({ x: Math.round(rect.left), y: Math.round(rect.top) });
    }

    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const nextX = e.clientX - dragOffsetRef.current.offsetX;
    const nextY = e.clientY - dragOffsetRef.current.offsetY;
    const panelHeight = isExpanded ? PANEL_HEIGHT_EXPANDED : PANEL_HEIGHT_COLLAPSED;

    const clamped = clampFloatingPosition(
      nextX,
      nextY,
      PANEL_WIDTH,
      panelHeight,
      window.innerWidth,
      window.innerHeight
    );
    setPosition(clamped);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture was already released
    }
  };

  const vitals = computeSystemVitals(tick, isBoosted);
  const statusTheme = getSystemStatusThemeConfig(theme);
  const breatheCfg = getBreathingPulseConfig(
    'panel',
    3,
    reducedMotion || isDragging
  );

  const sparkPoints = vitals.sparkline
    .map((val, idx) => {
      const x = (idx / (vitals.sparkline.length - 1)) * 100;
      const y = 26 - (val / 100) * 22;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const strokeColor =
    theme === 'cyan'
      ? '#22d3ee'
      : theme === 'violet'
      ? '#a78bfa'
      : '#fbbf24';

  return (
    <aside
      ref={panelRef}
      aria-label="System Vitals Monitor"
      data-testid="system-vitals-panel"
      style={
        position
          ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
            }
          : undefined
      }
      className={`fixed z-30 w-60 select-none rounded-2xl bg-[#070910]/90 backdrop-blur-xl border border-white/[0.09] shadow-[0_18px_42px_-10px_rgba(0,0,0,0.75)] text-slate-200 transition-shadow ${
        position ? '' : 'top-[104px] right-4 md:right-5'
      } ${isDragging ? 'ring-1 ring-amber-400/50 cursor-grabbing' : ''}`}
    >
      {/* Draggable Header Bar */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        data-testid="system-vitals-drag-handle"
        className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] cursor-grab active:cursor-grabbing touch-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <Activity
            className={`w-3.5 h-3.5 shrink-0 ${statusTheme.accentIconClass} ${breatheCfg.className}`}
          />
          <span className="text-[11px] font-semibold tracking-wide text-slate-100 truncate">
            System Vitals
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {position && (
            <button
              type="button"
              onClick={() => setPosition(null)}
              aria-label="Reset vitals panel position"
              title="Reset to default corner"
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.07] transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-label={isExpanded ? 'Minimize system vitals' : 'Expand system vitals'}
            aria-expanded={isExpanded}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.07] transition-colors"
          >
            {isExpanded ? (
              <Minimize2 className="w-3 h-3" />
            ) : (
              <Maximize2 className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Real-Time Telemetry Body */}
      {isExpanded ? (
        <div className="p-3 space-y-2.5 text-[11px] font-mono tabular-nums">
          {/* Row 1: Memory Usage + Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400 font-sans">
                <Cpu className="w-3 h-3 text-slate-400" />
                <span>Memory</span>
              </span>
              <span className="text-slate-100 font-medium" data-testid="vitals-memory-value">
                {vitals.memoryUsedGb.toFixed(1)} / {vitals.memoryTotalGb.toFixed(0)} GB ({vitals.memoryPercent}%)
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
              <div
                style={{ width: `${vitals.memoryPercent}%` }}
                className={`h-full rounded-full transition-all duration-500 ${statusTheme.accentBarClass}`}
              />
            </div>
          </div>

          {/* Row 2: Active Network Activity + Live Sparkline */}
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400 font-sans">
                <Wifi className="w-3 h-3 text-slate-400" />
                <span>Network I/O</span>
              </span>
              <span className="text-slate-100 font-medium" data-testid="vitals-network-value">
                ↓ {vitals.networkDownMbps} · ↑ {vitals.networkUpMbps} Mbps
              </span>
            </div>

            <div className="h-7 w-full rounded-lg bg-white/[0.03] border border-white/[0.05] px-1.5 flex items-center">
              <svg
                viewBox="0 0 100 28"
                className="w-full h-5 overflow-visible"
                aria-hidden="true"
              >
                <polyline
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={sparkPoints}
                />
              </svg>
            </div>
          </div>

          {/* Row 3: Neural Core Load & Latency + Interactive Burst Toggle */}
          <div className="pt-1 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400">
            <span>
              Core {vitals.neuralLoadPercent}% · {vitals.latencyMs} ms
            </span>
            <button
              type="button"
              onClick={() => setIsBoosted((prev) => !prev)}
              className={`px-1.5 py-0.5 rounded font-sans font-medium transition-colors ${
                isBoosted
                  ? `${statusTheme.bgColorClass} ${statusTheme.textColorClass} border ${statusTheme.borderColorClass}`
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
              }`}
            >
              {isBoosted ? 'Burst Active' : 'Simulate Load'}
            </button>
          </div>
        </div>
      ) : (
        <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-300">
          <span>Mem {vitals.memoryPercent}%</span>
          <span aria-hidden="true">·</span>
          <span>↓ {vitals.networkDownMbps} Mbps</span>
          <span aria-hidden="true">·</span>
          <span>{vitals.latencyMs} ms</span>
        </div>
      )}
    </aside>
  );
};
