import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Copy,
  Check,
  Volume2,
  RefreshCw,
  Code2,
  ChevronDown,
  ChevronUp,
  PanelLeftOpen,
  Paperclip,
  Mic,
  X,
  Box,
  Play,
  Sparkles,
} from 'lucide-react';
import { UltronEnergyBlob3D } from './UltronEnergyBlob3D';
import { UltronOrbCanvas } from './UltronOrbCanvas';
import { UltronHistorySidebar } from './UltronHistorySidebar';
import { ultronVoiceEngine } from '../utils/ultronVoiceEngine';
import {
  type ChatSessionItem,
  type StoredChatMessage,
  createChatSession,
  renameChatSession,
  deleteChatSession,
  cleanMarkdownSyntax,
  generateSimpleUltronAnswer,
  sanitizeStoredSession,
  getBreathingPulseConfig,
} from '../utils/ultronLogic';

export type ChatMessage = StoredChatMessage;

interface ChatViewProps {
  onBranchToCoding: (prompt: string) => void;
  onOpen3DStudio?: () => void;
  onReplayIntro?: () => void;
  newSessionSignal?: number;
  theme: 'amber' | 'cyan' | 'violet';
  bloomIntensity?: number;
  reducedMotion?: boolean;
}

const STORAGE_KEY = 'ultron_chat_sessions_v1';
const ACTIVE_SESSION_KEY = 'ultron_active_session_id_v1';

/**
 * Renders Ultron answers cleanly without raw markdown symbols (no ###, **, *, //).
 * Formats headings, numbered steps, and technical paragraphs with sleek typography.
 */
export const SimpleMessageRenderer: React.FC<{ content: string }> = ({ content }) => {
  const cleaned = cleanMarkdownSyntax(content);
  const rawLines = cleaned.split('\n');

  const elements: React.ReactNode[] = [];
  let currentList: { number: string; title?: string; body: string }[] = [];
  let blockKey = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <div key={`list-${blockKey++}`} className="my-2.5 space-y-2">
          {currentList.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
            >
              <span className="shrink-0 w-5 h-5 rounded-md bg-white/[0.06] border border-white/10 text-amber-300 flex items-center justify-center text-xs font-semibold mt-0.5">
                {item.number}
              </span>
              <div className="text-sm leading-relaxed text-slate-200">
                {item.title && (
                  <strong className="font-semibold text-white mr-1.5">{item.title}:</strong>
                )}
                <span>{item.body}</span>
              </div>
            </div>
          ))}
        </div>
      );
      currentList = [];
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i].trim();
    if (!rawLine) {
      flushList();
      continue;
    }

    // Numbered step: "1. Title: Description" or "1. Description"
    const listMatch = rawLine.match(/^(\d+)[\.\)]\s+(.*)$/);
    if (listMatch) {
      const num = listMatch[1];
      const rest = listMatch[2];
      const colonIdx = rest.indexOf(':');
      if (colonIdx > 0 && colonIdx < 45) {
        currentList.push({
          number: num,
          title: rest.slice(0, colonIdx).trim(),
          body: rest.slice(colonIdx + 1).trim(),
        });
      } else {
        currentList.push({
          number: num,
          body: rest,
        });
      }
      continue;
    }

    flushList();

    // Title / main headline
    const isFirstLineHeader = i === 0 && rawLine.length < 70 && !rawLine.endsWith('.');
    if (isFirstLineHeader) {
      elements.push(
        <div
          key={`h-${blockKey++}`}
          className="mb-3 pb-2 border-b border-white/[0.08]"
        >
          <h3 className="text-base font-semibold text-white tracking-wide">{rawLine}</h3>
        </div>
      );
      continue;
    }

    // Section header (e.g. "Core Technical Vectors:", "Architectural Guarantees:", "Summary:")
    const isSectionHeader =
      rawLine.endsWith(':') &&
      rawLine.length < 50 &&
      !rawLine.includes('http');

    if (isSectionHeader) {
      elements.push(
        <div
          key={`sec-${blockKey++}`}
          className="text-xs font-semibold text-amber-400 uppercase tracking-wider mt-3.5 mb-1"
        >
          {rawLine}
        </div>
      );
      continue;
    }

    // Standard conversational paragraph
    elements.push(
      <p key={`p-${blockKey++}`} className="my-2 text-sm leading-relaxed text-slate-200">
        {rawLine}
      </p>
    );
  }

  flushList();

  return <div className="space-y-1">{elements}</div>;
};

const DEFAULT_SESSIONS: ChatSessionItem[] = [
  createChatSession('Current Session', 'Deep Research', 'session-default'),
  {
    id: 'session-photonics',
    title: 'Silicon Photonics & Optical Fabric',
    updatedAt: '20:45',
    contextMode: 'Deep Research',
    messages: [
      {
        id: 'm1',
        role: 'assistant',
        content:
          'Greetings. I am Ultron. Ready to assist with system architecture, deep research, and code synthesis.',
        timestamp: '20:44',
        contextMode: 'Deep Research',
      },
      {
        id: 'u-seed-1',
        role: 'user',
        content:
          'Synthesize the state of optical compute interconnects and silicon photonics for 2026 AI clusters.',
        timestamp: '20:45',
        contextMode: 'Deep Research',
      },
      {
        id: 'a-seed-1',
        role: 'assistant',
        content: `State of Silicon Photonics and Optical Interconnects

Optical interconnects and co-packaged silicon photonics represent the primary scaling frontier for high-density compute clusters. By transmitting data via modulated light waves across silicon waveguides rather than electrical copper wiring, modern AI fabrics eliminate electrical resistance, heat dissipation bottlenecks, and line-loss attenuation.

Core Technical Vectors:
1. High Bandwidth Density: Micro-ring resonator arrays enable multi-wavelength division multiplexing directly along the substrate perimeter, delivering massive bidirectional throughput.
2. Thermal and Energy Efficiency: External continuous-wave laser sources isolate thermal dissipation from compute dies, bringing energy consumption below 1.5 picojoules per bit.
3. Low Latency Switching: Direct optical circuit switching bypasses electrical packet buffering stages during collective operations, cutting all-reduce latency significantly.

Architecture Summary: Transitioning to co-packaged optical interconnects enables multi-chassis AI superclusters to function as a unified, coherent compute plane with near-zero interconnect degradation.`,
        thinkingSteps: [
          'Evaluating optical waveguide benchmarks and substrate density',
          'Synthesizing co-packaged optics (CPO) architectural parameters',
          'Formatting clean high-density technical brief without raw syntax symbols',
        ],
        timestamp: '20:45',
        contextMode: 'Deep Research',
      },
    ],
  },
  {
    id: 'session-rate-limiter',
    title: 'Distributed Token-Bucket Rate Limiter',
    updatedAt: '19:20',
    contextMode: 'Code Architect',
    messages: [
      {
        id: 'm1-rl',
        role: 'assistant',
        content:
          'Greetings. I am Ultron. Ready to assist with system architecture, deep research, and code synthesis.',
        timestamp: '19:18',
        contextMode: 'Code Architect',
      },
      {
        id: 'u-seed-rl',
        role: 'user',
        content:
          'Design a fault-tolerant distributed rate limiter in TypeScript with sub-millisecond P99 latency.',
        timestamp: '19:19',
        contextMode: 'Code Architect',
      },
      {
        id: 'a-seed-rl',
        role: 'assistant',
        content: `Distributed Token-Bucket Rate Limiter Architecture

To achieve sub-millisecond P99 latency across edge gateways without race conditions, combine local in-memory token leases with atomic Redis cluster synchronization:

1. Atomic Refill Evaluation: Compute token replenishment and decrement in a single server-side atomic step using monotonic timestamps so concurrent workers never double-spend capacity.
2. Sliding-Window Burst Guard: Pair the primary token bucket with a short sub-second sliding counter to absorb traffic spikes while enforcing strict average throughput.
3. Graceful Degradation: Fall back to deterministic local memory quotas with bounded jitter if the coordination cluster experiences a network partition.`,
        thinkingSteps: [
          'Analyzing race conditions in read-modify-write distributed counters',
          'Structuring atomic token replenishment math and sliding burst window',
        ],
        timestamp: '19:20',
        contextMode: 'Code Architect',
      },
    ],
  },
];

export const ChatView: React.FC<ChatViewProps> = ({
  onBranchToCoding,
  onOpen3DStudio,
  onReplayIntro,
  newSessionSignal = 0,
  theme,
  bloomIntensity = 0.85,
  reducedMotion = false,
}) => {
  const coreBreathe = getBreathingPulseConfig('core', 0, reducedMotion);
  const composerBreathe = getBreathingPulseConfig('composer', 1, reducedMotion);
  const [sessions, setSessions] = useState<ChatSessionItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as ChatSessionItem[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleaned = parsed.map(sanitizeStoredSession);
            // Ensure pre-seeded history sessions are available if missing
            const existingIds = new Set(cleaned.map((s) => s.id));
            const merged = [...cleaned];
            for (const seed of DEFAULT_SESSIONS) {
              if (!existingIds.has(seed.id)) {
                merged.push(seed);
              }
            }
            return merged;
          }
        }
      } catch {
        // Fallback to default seed sessions
      }
    }
    return DEFAULT_SESSIONS;
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (savedId) return savedId;
    }
    return 'session-default';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);

  const [input, setInput] = useState('');
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [attachedDemoFile, setAttachedDemoFile] = useState<string | null>(null);
  const [isDictatingDemo, setIsDictatingDemo] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [blobStyle, setBlobStyle] = useState<'iridescent-3d' | 'reference-orb'>('iridescent-3d');

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastSignalRef = useRef(newSessionSignal);

  const [voiceState, setVoiceState] = useState(() => ultronVoiceEngine.getLiveState());

  useEffect(() => {
    return ultronVoiceEngine.subscribe((st) => setVoiceState(st));
  }, []);

  // Sync sessions to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      } catch {
        // Ignore quota errors
      }
    }
  }, [sessions]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
      } catch {
        // Ignore
      }
    }
  }, [activeSessionId]);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession.messages;
  const activeContext = activeSession.contextMode;

  const handleCreateSession = (customTitle?: string) => {
    const titleToUse = customTitle?.trim() || `Session ${sessions.length + 1}`;
    const created = createChatSession(titleToUse, activeContext);
    setSessions((prev) => [created, ...prev]);
    setActiveSessionId(created.id);
    setIsMobileHistoryOpen(false);
    setInput('');
    setAttachedDemoFile(null);
  };

  // Respond to top-nav "New Session" button signal
  useEffect(() => {
    if (newSessionSignal !== lastSignalRef.current) {
      lastSignalRef.current = newSessionSignal;
      handleCreateSession('New Session');
    }
  }, [newSessionSignal]);

  // Naturally expand composer textarea as user types
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(168, Math.max(44, el.scrollHeight));
    el.style.height = `${nextHeight}px`;
  }, [input]);

  const suggestionChips = [
    {
      label: 'Distributed rate limiter in TypeScript',
      prompt:
        'Design a high-throughput distributed token bucket and sliding-window rate limiter in TypeScript with Redis fallback.',
    },
    {
      label: 'Optical compute interconnects',
      prompt:
        'Synthesize the state of optical compute interconnects and silicon photonics for 2026 AI clusters.',
    },
    {
      label: 'Zero-knowledge rollup verification',
      prompt:
        'Compare Starknet STARKs versus SNARK polynomial commitments for low-latency rollups.',
    },
    {
      label: 'Multi-agent consensus protocol',
      prompt:
        'Outline a supervisory protocol for coordinating autonomous sub-agents with deterministic rollback.',
    },
  ];

  useEffect(() => {
    if (messages.length > 1 || streamingContent) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingContent]);

  const handleRenameSession = (sessionId: string, nextTitle: string) => {
    if (nextTitle.trim()) {
      setSessions((prev) => renameChatSession(prev, sessionId, nextTitle.trim()));
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    const updated = deleteChatSession(sessions, sessionId);
    setSessions(updated);
    if (activeSession.id === sessionId) {
      setActiveSessionId(updated[0].id);
    }
  };

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedDemoFile(`${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`);
      setStatusNotice('Demo mode: Attachment staged locally for preview (no external upload).');
    }
    e.target.value = '';
  };

  const handleToggleDemoDictation = () => {
    if (isDictatingDemo) {
      setIsDictatingDemo(false);
      setStatusNotice(null);
      return;
    }
    setIsDictatingDemo(true);
    setStatusNotice('Demo voice input: Simulating local transcription (microphone backend not connected)...');
    setTimeout(() => {
      setInput((prev) =>
        prev
          ? `${prev} Design a resilient event-driven microservice mesh.`
          : 'Design a resilient event-driven microservice mesh with idempotent replay.'
      );
      setIsDictatingDemo(false);
      setStatusNotice('Demo transcription inserted into composer.');
      textareaRef.current?.focus();
    }, 900);
  };

  const handleSend = (textToSend?: string) => {
    const rawText = textToSend ?? input;
    const text = rawText.trim();
    if (!text || isStreaming) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const contentWithAttachment = attachedDemoFile
      ? `[Attached file (Demo): ${attachedDemoFile}]\n\n${text}`
      : text;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: contentWithAttachment,
      timestamp: nowTime,
      contextMode: activeContext,
    };

    const currentSessionId = activeSession.id;
    const shouldAutoTitle =
      activeSession.messages.length <= 1 &&
      (activeSession.title === 'Primary Neural Directive' ||
        activeSession.title === 'Current Session' ||
        activeSession.title === 'New Session' ||
        activeSession.title.startsWith('Session '));

    const derivedTitle = shouldAutoTitle
      ? text.slice(0, 36) + (text.length > 36 ? '...' : '')
      : activeSession.title;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? {
              ...s,
              title: derivedTitle,
              updatedAt: nowTime,
              messages: [...s.messages, userMsg],
            }
          : s
      )
    );

    setInput('');
    setAttachedDemoFile(null);
    setStatusNotice(null);
    setIsStreaming(true);
    setStreamingContent('');

    const { fullResponse, thinkingSteps } = generateSimpleUltronAnswer(text, activeContext);

    let charIndex = 0;
    const interval = setInterval(() => {
      charIndex += 22;
      if (charIndex >= fullResponse.length) {
        clearInterval(interval);
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: fullResponse,
          thinkingSteps,
          timestamp: replyTime,
          contextMode: activeContext,
        };
        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSessionId
              ? {
                  ...s,
                  updatedAt: replyTime,
                  messages: [...s.messages, assistantMsg],
                }
              : s
          )
        );
        setIsStreaming(false);
        setStreamingContent('');
      } else {
        setStreamingContent(fullResponse.slice(0, charIndex));
      }
    }, 24);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleThinking = (id: string) => {
    setExpandedThinking((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isHomeEmptyState = messages.length <= 1 && !isStreaming;

  return (
    <div className="flex h-[calc(100vh-57px)] max-w-7xl mx-auto px-3 sm:px-6 py-3 gap-5 relative">
      {/* Glassmorphic Collapsible Conversation-History Sidebar */}
      <UltronHistorySidebar
        sessions={sessions}
        activeSessionId={activeSession.id}
        isOpen={isSidebarOpen}
        onToggleOpen={setIsSidebarOpen}
        isMobileOpen={isMobileHistoryOpen}
        onToggleMobileOpen={setIsMobileHistoryOpen}
        onSelectSession={setActiveSessionId}
        onCreateSession={() => handleCreateSession()}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        theme={theme}
        reducedMotion={reducedMotion}
      />

      {/* Main Assistant Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Subtle Contextual Sub-Bar */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open Conversation History"
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] text-xs text-slate-300 border border-white/[0.07] transition-colors"
              >
                <PanelLeftOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>History</span>
              </button>
            )}

            {/* Mobile History Drawer Toggle */}
            <div className="relative lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileHistoryOpen((v) => !v)}
                aria-expanded={isMobileHistoryOpen}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] text-xs text-slate-200 border border-white/10"
              >
                <span className="truncate max-w-[150px]">{activeSession.title}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            <span className="hidden sm:inline text-xs text-slate-400 truncate max-w-[240px]">
              {activeSession.title}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {onReplayIntro && (
              <button
                type="button"
                onClick={onReplayIntro}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
              >
                <Play className="w-3 h-3 text-amber-400" />
                <span>Replay Intro</span>
              </button>
            )}
            {onOpen3DStudio && (
              <button
                type="button"
                onClick={onOpen3DStudio}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
              >
                <Box className="w-3.5 h-3.5 text-amber-400" />
                <span>3D Studio</span>
              </button>
            )}
          </div>
        </div>

        {/* Central Scroll Area */}
        <div className="flex-1 overflow-y-auto py-4 pb-16 md:pb-4 px-1 sm:px-2 flex flex-col">
          {isHomeEmptyState ? (
            /* Refined AI-Assistant Home Screen */
            <div className="my-auto py-2 flex flex-col items-center justify-center text-center max-w-2xl mx-auto w-full">
              {/* Central Animated 3D Energy Blob with Rhythmic Breathing Scale Pulse */}
              <div className="relative flex flex-col items-center">
                <div
                  data-testid="assistant-breathing-core"
                  className={coreBreathe.className}
                >
                  {blobStyle === 'iridescent-3d' ? (
                    <UltronEnergyBlob3D
                      size={200}
                      theme={theme}
                      bloomIntensity={bloomIntensity}
                      activity={
                        isStreaming ? 'streaming' : input.trim().length > 0 ? 'typing' : 'idle'
                      }
                      interactive={true}
                      onClick={() => ultronVoiceEngine.speakAboutSelf(true, false)}
                    />
                  ) : (
                    <UltronOrbCanvas
                      size={200}
                      state="idle"
                      theme={theme}
                      interactive={true}
                      showBackdropImage={true}
                    />
                  )}
                </div>

                {/* Discreet visual core mode toggle & Voice introduction */}
                <div className="mt-2 flex items-center justify-center gap-2.5 text-[11px] text-slate-500 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setBlobStyle('iridescent-3d')}
                    className={`whitespace-nowrap shrink-0 transition-colors ${
                      blobStyle === 'iridescent-3d'
                        ? 'text-slate-200 font-medium'
                        : 'hover:text-slate-300'
                    }`}
                  >
                    3D Iridescent Core
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => setBlobStyle('reference-orb')}
                    className={`whitespace-nowrap shrink-0 transition-colors ${
                      blobStyle === 'reference-orb'
                        ? 'text-slate-200 font-medium'
                        : 'hover:text-slate-300'
                    }`}
                  >
                    Reference Matrix
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => ultronVoiceEngine.speakAboutSelf(true, false)}
                    className="whitespace-nowrap shrink-0 text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 font-medium"
                    title="Ask Ultron to speak about himself"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Introduce Ultron</span>
                  </button>
                </div>

                {/* Live Vocal Telemetry Pill when Ultron is speaking */}
                {voiceState.isSpeaking && (
                  <div className="mt-3.5 px-4 py-2 rounded-full bg-slate-950/90 border border-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.22)] flex items-center gap-3 max-w-lg animate-fade-in pointer-events-auto">
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="w-1 h-3.5 bg-amber-400 rounded-full animate-pulse" />
                      <span className="w-1 h-5 bg-amber-300 rounded-full animate-pulse [animation-delay:150ms]" />
                      <span className="w-1 h-2.5 bg-cyan-400 rounded-full animate-pulse [animation-delay:300ms]" />
                    </div>
                    <p className="text-xs text-amber-200 font-mono text-left truncate flex-1">
                      <span className="text-amber-400 font-semibold uppercase tracking-wider text-[10px] mr-1">Ultron:</span>
                      &ldquo;{voiceState.text}&rdquo;
                    </p>
                    <button
                      type="button"
                      onClick={() => ultronVoiceEngine.stop()}
                      className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 shrink-0 transition-colors"
                      title="Mute / Stop speech"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Short Heading Required by Specification */}
              <h1
                style={{ textWrap: 'balance' }}
                className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100 mt-5"
              >
                What would you like to build?
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md leading-relaxed">
                Explore system architecture, synthesize research, or draft production code in an interactive demo workspace.
              </p>

              {/* Prompt Composer (Positioned centrally in empty state with rhythmic breathing pulse) */}
              <div className="w-full mt-6">
                <form
                  data-testid="assistant-breathing-composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  style={
                    composerBreathe.delayMs
                      ? { animationDelay: `${composerBreathe.delayMs}ms` }
                      : undefined
                  }
                  className={`w-full rounded-2xl bg-[#0a0c14]/90 border transition-all duration-200 p-3 text-left shadow-[0_16px_40px_-12px_rgba(0,0,0,0.65)] ${composerBreathe.className} ${
                    isComposerFocused
                      ? 'border-amber-400/45 ring-1 ring-amber-400/20'
                      : 'border-white/[0.09] hover:border-white/[0.15]'
                  }`}
                >
                  {/* Staged Demo Attachment Chip */}
                  {attachedDemoFile && (
                    <div className="mb-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-slate-200">
                      <Paperclip className="w-3 h-3 text-amber-400" />
                      <span>{attachedDemoFile}</span>
                      <button
                        type="button"
                        onClick={() => setAttachedDemoFile(null)}
                        aria-label="Remove attachment"
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onFocus={() => setIsComposerFocused(true)}
                    onBlur={() => setIsComposerFocused(false)}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Describe an architecture, research question, or component to build..."
                    aria-label="Prompt input"
                    className="w-full bg-transparent resize-none text-sm text-slate-100 placeholder-slate-500 focus:outline-none leading-relaxed max-h-40"
                  />

                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/[0.05]">
                    <div className="flex items-center gap-1.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleAttachmentSelect}
                        className="hidden"
                        aria-hidden="true"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Attach file (Demo)"
                        title="Attach file (Demo preview)"
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleDemoDictation}
                        aria-label="Voice input (Demo)"
                        title="Voice dictation (Simulated demo)"
                        className={`p-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
                          isDictatingDemo
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                        }`}
                      >
                        <Mic className="w-4 h-4" />
                      </button>

                      <span className="text-[11px] text-slate-500 pl-1 hidden sm:inline">
                        Demo workspace · simulated responses
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={!input.trim() || isStreaming}
                      aria-label="Send prompt"
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-35 text-slate-950 font-semibold text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                      <span>Send</span>
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>

                {statusNotice && (
                  <p className="text-[11px] text-amber-300/90 mt-2 text-left px-1">
                    {statusNotice}
                  </p>
                )}

                {/* Understated Suggestion Chips Beneath the Composer (Staggered rhythmic breathing) */}
                <div
                  aria-label="Suggested prompts"
                  className="mt-4 flex flex-wrap items-center justify-center gap-2"
                >
                  {suggestionChips.map((chip, idx) => {
                    const chipBreathe = getBreathingPulseConfig('chip', idx, reducedMotion);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(chip.prompt)}
                        style={
                          chipBreathe.delayMs
                            ? { animationDelay: `${chipBreathe.delayMs}ms` }
                            : undefined
                        }
                        className={`px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] hover:border-white/[0.15] text-xs text-slate-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${chipBreathe.className}`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Active Conversation Thread */
            <div className="space-y-6 max-w-3xl mx-auto w-full pb-4">
              {messages.map((msg, msgIdx) => {
                const isAssistant = msg.role === 'assistant';
                const panelBreathe = getBreathingPulseConfig('panel', msgIdx, reducedMotion);
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                  >
                    {/* Unboxed Metadata Header (Zero-Pill Discipline) */}
                    <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-400 tabular-nums">
                      <span className="font-medium text-slate-200">
                        {isAssistant ? 'Ultron' : 'You'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{msg.timestamp}</span>
                      {isAssistant && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-500">Demo response</span>
                        </>
                      )}
                    </div>

                    <div
                      style={
                        isAssistant && panelBreathe.delayMs
                          ? { animationDelay: `${panelBreathe.delayMs}ms` }
                          : undefined
                      }
                      className={`max-w-2xl rounded-2xl p-4 md:p-5 text-sm leading-relaxed ${
                        isAssistant
                          ? `bg-[#0a0c14]/90 text-slate-100 border border-white/[0.08] ${panelBreathe.className}`
                          : 'bg-white/[0.08] text-white border border-white/[0.12]'
                      }`}
                    >
                      {isAssistant && msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
                        <div className="mb-3.5 pb-2.5 border-b border-white/[0.07]">
                          <button
                            type="button"
                            onClick={() => toggleThinking(msg.id)}
                            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            <span>Reasoning steps ({msg.thinkingSteps.length})</span>
                            {expandedThinking[msg.id] ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {expandedThinking[msg.id] && (
                            <div className="mt-2 space-y-1 pl-3 border-l border-white/15 text-xs text-slate-400 font-mono">
                              {msg.thinkingSteps.map((step, sIdx) => (
                                <div key={sIdx}>{step}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {isAssistant ? (
                        <SimpleMessageRenderer content={msg.content} />
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}

                      {isAssistant && (
                        <div className="mt-4 pt-3 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/[0.05] hover:text-white transition-colors"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => ultronVoiceEngine.triggerBlobTapSpeech()}
                              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/[0.05] hover:text-white transition-colors"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Vocalize</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSend(msg.content.slice(0, 50))}
                              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/[0.05] hover:text-white transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Regenerate</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => onBranchToCoding(msg.content)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/10 transition-colors font-medium text-xs"
                          >
                            <Code2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Open in Coding Agent</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isStreaming && (
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-400">
                    <span className="font-medium text-amber-300">Ultron · Synthesizing...</span>
                  </div>
                  <div className="max-w-2xl rounded-2xl p-4 md:p-5 text-sm leading-relaxed bg-[#0a0c14]/90 text-slate-100 border border-amber-500/30">
                    <SimpleMessageRenderer content={streamingContent} />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Docked Composer when in an active conversation thread */}
        {!isHomeEmptyState && (
          <div className="pt-2 max-w-3xl mx-auto w-full">
            {voiceState.isSpeaking && (
              <div className="mb-2.5 px-3.5 py-1.5 rounded-full bg-slate-950/90 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-center gap-2.5 animate-fade-in">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="w-1 h-3 bg-amber-400 rounded-full animate-pulse" />
                  <span className="w-1 h-4 bg-amber-300 rounded-full animate-pulse [animation-delay:120ms]" />
                  <span className="w-1 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:240ms]" />
                </div>
                <span className="text-xs text-amber-200 font-mono truncate flex-1">
                  <span className="text-amber-400 font-semibold uppercase tracking-wider text-[10px] mr-1">Ultron:</span>
                  &ldquo;{voiceState.text}&rdquo;
                </span>
                <button
                  type="button"
                  onClick={() => ultronVoiceEngine.stop()}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 shrink-0 transition-colors"
                  title="Mute / Stop speech"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className={`rounded-2xl bg-[#0a0c14]/95 p-2.5 border transition-all ${composerBreathe.className} ${
                isComposerFocused
                  ? 'border-amber-400/45 ring-1 ring-amber-400/20'
                  : 'border-white/[0.1]'
              }`}
            >
              {attachedDemoFile && (
                <div className="mb-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-slate-200">
                  <Paperclip className="w-3 h-3 text-amber-400" />
                  <span>{attachedDemoFile}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedDemoFile(null)}
                    aria-label="Remove attachment"
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach file (Demo)"
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleToggleDemoDictation}
                  aria-label="Voice input (Demo)"
                  className={`p-2 rounded-lg transition-colors ${
                    isDictatingDemo
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onFocus={() => setIsComposerFocused(true)}
                  onBlur={() => setIsComposerFocused(false)}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Follow up or ask Ultron to build..."
                  disabled={isStreaming}
                  className="flex-1 bg-transparent resize-none px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none max-h-36"
                />

                <button
                  type="submit"
                  disabled={!input.trim() || isStreaming}
                  aria-label="Send prompt"
                  className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-35 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-all"
                >
                  <span>Send</span>
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
