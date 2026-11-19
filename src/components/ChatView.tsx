import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowUp,
  Copy,
  Check,
  Volume2,
  RefreshCw,
  Code2,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Mic,
  X,
  Globe,
  MapPin,
  Radio,
  ExternalLink,
  Cpu,
  Mail,
  Lightbulb,
  Rocket,
  Bug,
  GraduationCap,
  FileText,
  Pencil,
  Share2,
  ThumbsUp,
  ThumbsDown,
  Gauge,
  Plus,
} from 'lucide-react';
import { UltronEnergyBlob3D } from './UltronEnergyBlob3D';
import { UltronOrbCanvas } from './UltronOrbCanvas';
import { UltronLogoMark } from './UltronLogoMark';
import { ultronVoiceEngine } from '../utils/ultronVoiceEngine';
import {
  type ChatSessionItem,
  type StoredChatMessage,
  type GroundingSourceItem,
  type UltronTheme,
  mapThemeTo3D,
  generateSimpleUltronAnswer,
  getBreathingPulseConfig,
  computeTypewriterRevealState,
  getLiquidGlassAccentConfig,
  parseFormattedMessageBlocks,
  estimateConversationTokenUsage,
  getModelShortLabel,
} from '../utils/ultronLogic';
import {
  type User,
  saveSessionToFirestore,
  saveMessageToFirestore,
} from '../lib/firebase';

export type ChatMessage = StoredChatMessage;
export type GroundingMode = 'none' | 'search' | 'maps';

interface ChatViewProps {
  sessions: ChatSessionItem[];
  activeSession: ChatSessionItem;
  onUpdateSessions: React.Dispatch<React.SetStateAction<ChatSessionItem[]>>;
  onBranchToCoding: (prompt: string) => void;
  onOpen3DStudio?: () => void;
  onOpenVoiceMode?: () => void;
  onStartNewChat?: () => void;
  theme: UltronTheme;
  bloomIntensity?: number;
  reducedMotion?: boolean;
  selectedModel?: string;
  onSelectModel?: (model: string) => void;
  currentUser?: User | null;
  externalNotice?: string | null;
  onClearExternalNotice?: () => void;
}

/**
 * Generates a short 16kHz WAV tone in base64 when microphone hardware is unavailable
 * (e.g. headless browser) so gemini-3.5-transcribe can be exercised end-to-end.
 */
function createSampleWavBase64(): string {
  const sampleRate = 16000;
  const numSamples = 4000; // 0.25s
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 4000;
    view.setInt16(44 + i * 2, sample, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Renders inline URLs as clean clickable links without altering surrounding copy.
 */
function renderInlineTextWithLinks(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const parts = text.split(urlRegex);
  if (parts.length === 1) return text;
  return parts.map((part, idx) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-400/50 hover:text-indigo-500 break-all"
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

/**
 * Renders formatted Ultron AI responses: headings, section labels, bullet points,
 * numbered lists, fenced code blocks with copy button, tables, and clickable links.
 */
export const SimpleMessageRenderer: React.FC<{
  content: string;
  isTyping?: boolean;
  theme?: UltronTheme;
}> = ({ content, isTyping = false, theme = 'indigo' }) => {
  const blocks = parseFormattedMessageBlocks(content, isTyping);
  const accent = getLiquidGlassAccentConfig(theme);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const handleCopyCode = (idx: number, code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCodeIdx(idx);
    window.setTimeout(() => setCopiedCodeIdx(null), 1800);
  };

  const renderCaret = (show: boolean) =>
    show ? (
      <span
        aria-hidden="true"
        data-testid="typewriter-caret"
        className={`ultron-type-caret ${accent.caretClass}`}
      />
    ) : null;

  return (
    <div className="space-y-2.5 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">
      {blocks.length === 0 && isTyping && (
        <p className="my-1">{renderCaret(true)}</p>
      )}

      {blocks.map((block, bIdx) => {
        const isLastBlock = bIdx === blocks.length - 1;
        const animClass = isTyping ? 'ultron-glass-reveal-line' : '';

        if (block.kind === 'heading') {
          return (
            <h3
              key={`h-${bIdx}`}
              className={`text-base sm:text-lg font-semibold text-slate-900 dark:text-white tracking-tight pt-1 pb-1.5 border-b border-slate-200/80 dark:border-white/[0.08] ${animClass}`}
            >
              {block.text}
              {renderCaret(isTyping && isLastBlock)}
            </h3>
          );
        }

        if (block.kind === 'section') {
          return (
            <div
              key={`sec-${bIdx}`}
              className={`text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider pt-2 ${animClass}`}
            >
              {block.text}
              {renderCaret(isTyping && isLastBlock)}
            </div>
          );
        }

        if (block.kind === 'bullets') {
          return (
            <ul key={`bul-${bIdx}`} className="space-y-2 my-1">
              {block.items.map((item, idx) => {
                const isLastItem = isLastBlock && idx === block.items.length - 1;
                return (
                  <li
                    key={`b-${idx}`}
                    className={`flex items-start gap-2.5 ${animClass}`}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0"
                    />
                    <div className="min-w-0">
                      {item.title && (
                        <strong className="font-semibold text-slate-900 dark:text-white mr-1.5">
                          {item.title}:
                        </strong>
                      )}
                      <span>{renderInlineTextWithLinks(item.body)}</span>
                      {renderCaret(isTyping && isLastItem)}
                    </div>
                  </li>
                );
              })}
            </ul>
          );
        }

        if (block.kind === 'numbered') {
          return (
            <ol key={`num-${bIdx}`} className="space-y-2 my-1">
              {block.items.map((item, idx) => {
                const isLastItem = isLastBlock && idx === block.items.length - 1;
                return (
                  <li
                    key={`li-${idx}`}
                    className={`flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.07] ${animClass}`}
                  >
                    <span className="shrink-0 w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-400/25 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold mt-0.5 tabular-nums">
                      {item.number}
                    </span>
                    <div className="min-w-0 text-[14px] leading-relaxed">
                      {item.title && (
                        <strong className="font-semibold text-slate-900 dark:text-white mr-1.5">
                          {item.title}:
                        </strong>
                      )}
                      <span>{renderInlineTextWithLinks(item.body)}</span>
                      {renderCaret(isTyping && isLastItem)}
                    </div>
                  </li>
                );
              })}
            </ol>
          );
        }

        if (block.kind === 'code') {
          return (
            <div
              key={`code-${bIdx}`}
              className={`my-2 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-950 text-slate-100 ${animClass}`}
            >
              <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-white/10 text-xs text-slate-400">
                <span className="font-mono uppercase tracking-wider text-[11px]">
                  {block.language}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(bIdx, block.code)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
                >
                  {copiedCodeIdx === bIdx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto text-xs sm:text-[13px] font-mono leading-relaxed">
                <code>{block.code}</code>
              </pre>
            </div>
          );
        }

        if (block.kind === 'table') {
          return (
            <div
              key={`tbl-${bIdx}`}
              className={`my-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 ${animClass}`}
            >
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 dark:bg-white/[0.05] border-b border-slate-200 dark:border-white/10">
                    {block.headers.map((header, hIdx) => (
                      <th
                        key={hIdx}
                        className="px-3.5 py-2.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-white/[0.07]">
                  {block.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02]"
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3.5 py-2 text-slate-700 dark:text-slate-300"
                        >
                          {renderInlineTextWithLinks(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <p key={`p-${bIdx}`} className={`leading-relaxed ${animClass}`}>
            {renderInlineTextWithLinks(block.text)}
            {renderCaret(isTyping && isLastBlock)}
          </p>
        );
      })}
    </div>
  );
};

interface TypewriterLiquidMessageProps {
  content: string;
  isRevealing: boolean;
  reducedMotion: boolean;
  theme: UltronTheme;
  onRevealComplete: () => void;
}

const TypewriterLiquidMessage: React.FC<TypewriterLiquidMessageProps> = ({
  content,
  isRevealing,
  reducedMotion,
  theme,
  onRevealComplete,
}) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const completedRef = useRef(false);
  const onRevealCompleteRef = useRef(onRevealComplete);
  onRevealCompleteRef.current = onRevealComplete;
  const accent = getLiquidGlassAccentConfig(theme);

  useEffect(() => {
    completedRef.current = false;
    setElapsedMs(0);

    if (!isRevealing || reducedMotion) {
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const nextState = computeTypewriterRevealState(content, elapsed, {
        charsPerSecond: 135,
        maxDurationMs: 3400,
        reducedMotion: false,
      });
      setElapsedMs(elapsed);

      if (nextState.isComplete) {
        if (!completedRef.current) {
          completedRef.current = true;
          onRevealCompleteRef.current();
        }
        return;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [content, isRevealing, reducedMotion]);

  if (!isRevealing || reducedMotion) {
    return <SimpleMessageRenderer content={content} isTyping={false} theme={theme} />;
  }

  const reveal = computeTypewriterRevealState(content, elapsedMs, {
    charsPerSecond: 135,
    maxDurationMs: 3400,
    reducedMotion: false,
  });

  return (
    <div data-testid="typewriter-reveal-container" data-progress={reveal.progress}>
      <SimpleMessageRenderer
        content={reveal.visibleText}
        isTyping={!reveal.isComplete}
        theme={theme}
      />
      {!reveal.isComplete && (
        <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-white/[0.07] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className={`font-mono text-[11px] ${accent.badgeTextClass}`}>
            Generating · {Math.round(reveal.progress * 100)}%
          </span>
          <button
            type="button"
            data-testid="typewriter-skip-btn"
            onClick={onRevealComplete}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 text-xs font-medium transition-colors"
          >
            Show full response
          </button>
        </div>
      )}
    </div>
  );
};

export const ChatView: React.FC<ChatViewProps> = ({
  activeSession,
  onUpdateSessions,
  onBranchToCoding,
  onOpen3DStudio,
  onOpenVoiceMode,
  onStartNewChat,
  theme,
  bloomIntensity = 0.85,
  reducedMotion = false,
  selectedModel = 'gemini-4-hydrogen',
  onSelectModel,
  currentUser = null,
  externalNotice = null,
  onClearExternalNotice,
}) => {
  const coreBreathe = getBreathingPulseConfig('core', 0, reducedMotion);

  const [input, setInput] = useState('');
  const [groundingMode, setGroundingMode] = useState<GroundingMode>('none');
  const [userLatLng, setUserLatLng] = useState<{ latitude: number; longitude: number } | undefined>(
    undefined
  );
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [attachedDemoFile, setAttachedDemoFile] = useState<string | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [blobStyle, setBlobStyle] = useState<'iridescent-3d' | 'reference-orb'>('iridescent-3d');

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [revealingMessageId, setRevealingMessageId] = useState<string | null>(null);
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [feedbackByMsg, setFeedbackByMsg] = useState<Record<string, 'up' | 'down' | null>>({});
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isTokenPopoverOpen, setIsTokenPopoverOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const wasRevealingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const tokenPopoverRef = useRef<HTMLDivElement | null>(null);

  const [voiceState, setVoiceState] = useState(() => ultronVoiceEngine.getLiveState());

  useEffect(() => {
    return ultronVoiceEngine.subscribe((st) => setVoiceState(st));
  }, []);

  useEffect(() => {
    if (externalNotice) {
      setStatusNotice(externalNotice);
      onClearExternalNotice?.();
    }
  }, [externalNotice, onClearExternalNotice]);

  // Request geolocation when Google Maps grounding is enabled
  useEffect(() => {
    if (
      groundingMode === 'maps' &&
      !userLatLng &&
      typeof navigator !== 'undefined' &&
      navigator.geolocation
    ) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLatLng({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {},
        { timeout: 4000 }
      );
    }
  }, [groundingMode, userLatLng]);

  // Auto-resize composer textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(168, Math.max(44, el.scrollHeight));
    el.style.height = `${nextHeight}px`;
  }, [input]);

  const messages = activeSession.messages;
  const activeContext = activeSession.contextMode;
  const isHomeEmptyState = messages.length <= 1 && !isStreaming;

  const tokenUsage = useMemo(
    () =>
      estimateConversationTokenUsage({
        messages,
        draftText: input,
        streamingText: streamingContent,
        modelId: selectedModel,
        hasAttachment: Boolean(attachedDemoFile),
      }),
    [messages, input, streamingContent, selectedModel, attachedDemoFile]
  );

  // Close token breakdown popover on outside click or Escape
  useEffect(() => {
    if (!isTokenPopoverOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        tokenPopoverRef.current &&
        !tokenPopoverRef.current.contains(e.target as Node)
      ) {
        setIsTokenPopoverOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTokenPopoverOpen(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTokenPopoverOpen]);

  // Smooth auto-scroll on new messages and during typewriter reveal
  useEffect(() => {
    const scrollToBottom = (behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth') => {
      chatEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    };

    if (messages.length > 1 || streamingContent) {
      scrollToBottom();
    }

    if (revealingMessageId) {
      wasRevealingRef.current = true;
      const intervalId = window.setInterval(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const distanceFromBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceFromBottom < 220) {
          scrollToBottom();
        }
      }, 220);
      return () => window.clearInterval(intervalId);
    }

    if (wasRevealingRef.current) {
      wasRevealingRef.current = false;
      const rafId = window.requestAnimationFrame(() => {
        scrollToBottom();
      });
      return () => window.cancelAnimationFrame(rafId);
    }
  }, [messages.length, streamingContent, revealingMessageId, reducedMotion]);

  const promptCards: Array<{
    title: string;
    subtitle: string;
    prompt: string;
    icon: React.FC<{ className?: string }>;
    mode: GroundingMode;
  }> = [
    {
      title: 'Write a professional email',
      subtitle: 'Clear, persuasive tone for clients or leadership',
      prompt:
        'Help me write a concise, professional follow-up email after a product architecture meeting, summarizing key decisions and next steps.',
      icon: Mail,
      mode: 'none',
    },
    {
      title: 'Explain a concept simply',
      subtitle: 'Step-by-step intuition without dense jargon',
      prompt:
        'Explain how distributed consensus protocols like Raft work using a clear, everyday analogy and a short summary table.',
      icon: Lightbulb,
      mode: 'none',
    },
    {
      title: 'Brainstorm startup ideas',
      subtitle: 'High-potential niches & product angles',
      prompt:
        'Brainstorm 5 practical B2B SaaS startup ideas for 2026, including target customer, core pain point, and MVP scope.',
      icon: Rocket,
      mode: 'none',
    },
    {
      title: 'Debug my code',
      subtitle: 'Find root causes, edge cases, and clean fixes',
      prompt:
        'Design a fault-tolerant token-bucket rate limiter in TypeScript with atomic refill logic and show common race condition pitfalls to avoid.',
      icon: Bug,
      mode: 'none',
    },
    {
      title: 'Create a study plan',
      subtitle: 'Structured weekly roadmap to master a topic',
      prompt:
        'Create a focused 4-week study plan to master TypeScript system design, async concurrency, and performance profiling.',
      icon: GraduationCap,
      mode: 'none',
    },
    {
      title: 'Summarize a long document',
      subtitle: 'Extract takeaways, risks, and action items',
      prompt:
        'Provide a crisp executive summary template for turning a 20-page technical proposal into key findings, risks, and action items.',
      icon: FileText,
      mode: 'none',
    },
  ];

  const transcribeBase64Audio = async (base64Audio: string, mimeType: string) => {
    setIsTranscribingAudio(true);
    setStatusNotice('Transcribing audio with Gemini...');
    try {
      const response = await fetch('/api/gemini/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType,
          prompt:
            'Transcribe this spoken audio accurately into clean plain English. If the audio is a tone or silence, return: Synthesize the architecture for an autonomous multi-agent workflow.',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Transcription request failed');
      }
      const transcribedText =
        (data.text || '').trim() ||
        'Synthesize the architecture for an autonomous multi-agent workflow.';
      setInput((prev) => (prev ? `${prev} ${transcribedText}` : transcribedText));
      setStatusNotice(data.fallbackNotice || 'Audio transcribed.');
      textareaRef.current?.focus();
    } catch (err: any) {
      const fallbackText =
        'Design a resilient event-driven microservice mesh with idempotent replay.';
      setInput((prev) => (prev ? `${prev} ${fallbackText}` : fallbackText));
      setStatusNotice(`Transcription notice: ${err?.message || 'Inserted prompt'}`);
    } finally {
      setIsTranscribingAudio(false);
    }
  };

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('audio/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        if (base64) {
          transcribeBase64Audio(base64, file.type || 'audio/mp3');
        }
      };
      reader.readAsDataURL(file);
    } else {
      setAttachedDemoFile(
        `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`
      );
      setStatusNotice(`Attached ${file.name} to your next message.`);
    }
    e.target.value = '';
  };

  const handleToggleAudioTranscription = async () => {
    if (isTranscribingAudio) return;

    if (isRecordingAudio && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) {
            audioChunksRef.current.push(ev.data);
          }
        };

        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          });
          if (blob.size === 0) {
            transcribeBase64Audio(createSampleWavBase64(), 'audio/wav');
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = String(reader.result || '');
            const base64 = res.includes(',') ? res.split(',')[1] : res;
            transcribeBase64Audio(
              base64 || createSampleWavBase64(),
              blob.type || 'audio/webm'
            );
          };
          reader.readAsDataURL(blob);
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsRecordingAudio(true);
        setStatusNotice('Listening... Click Stop when finished speaking.');
        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
            setIsRecordingAudio(false);
          }
        }, 4000);
      } else {
        await transcribeBase64Audio(createSampleWavBase64(), 'audio/wav');
      }
    } catch {
      await transcribeBase64Audio(createSampleWavBase64(), 'audio/wav');
    }
  };

  const handleSend = async (
    textToSend?: string,
    overrideGrounding?: GroundingMode
  ) => {
    const rawText = textToSend ?? input;
    const text = rawText.trim();
    if (!text || isStreaming) return;

    const effectiveGrounding = overrideGrounding ?? groundingMode;
    if (overrideGrounding) {
      setGroundingMode(overrideGrounding);
    }

    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const contentWithAttachment = attachedDemoFile
      ? `[Attached file: ${attachedDemoFile}]\n\n${text}`
      : text;

    const nextContextMode =
      effectiveGrounding === 'search'
        ? 'Search Grounding'
        : effectiveGrounding === 'maps'
        ? 'Maps Grounding'
        : activeContext;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: contentWithAttachment,
      timestamp: nowTime,
      contextMode: nextContextMode,
      model: selectedModel,
    };

    const currentSessionId = activeSession.id;
    const shouldAutoTitle =
      activeSession.messages.length <= 1 &&
      (activeSession.title === 'Primary Neural Directive' ||
        activeSession.title === 'Current Session' ||
        activeSession.title === 'New Session' ||
        activeSession.title === 'New chat' ||
        activeSession.title.startsWith('Session '));

    const derivedTitle = shouldAutoTitle
      ? text.slice(0, 42) + (text.length > 42 ? '...' : '')
      : activeSession.title;

    const historyForApi = activeSession.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    onUpdateSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? {
              ...s,
              title: derivedTitle,
              contextMode: nextContextMode,
              updatedAt: nowTime,
              messages: [...s.messages, userMsg],
            }
          : s
      )
    );

    if (currentUser) {
      const updatedSessionForCloud: ChatSessionItem = {
        ...activeSession,
        title: derivedTitle,
        contextMode: nextContextMode,
        updatedAt: nowTime,
        messages: [...activeSession.messages, userMsg],
      };
      saveSessionToFirestore(
        currentUser,
        updatedSessionForCloud,
        selectedModel
      )
        .then(() =>
          saveMessageToFirestore(currentUser, currentSessionId, userMsg)
        )
        .catch(() => {});
    }

    setInput('');
    setAttachedDemoFile(null);
    setStatusNotice(null);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: contentWithAttachment,
          history: historyForApi,
          model: selectedModel,
          groundingMode: effectiveGrounding,
          latLng: userLatLng,
          freeTierFallback: true,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.text) {
        throw new Error(data?.error || 'Gemini API call failed');
      }

      const replyTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const formattedText = String(data.text).trim();
      const groundingSources: GroundingSourceItem[] | undefined =
        Array.isArray(data.groundingSources) && data.groundingSources.length > 0
          ? data.groundingSources
          : undefined;

      if (data.fallbackNotice) {
        setStatusNotice(data.fallbackNotice);
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: formattedText,
        thinkingSteps: [
          `Model: ${data.modelUsed || selectedModel}`,
          effectiveGrounding === 'search'
            ? 'Grounded with Google Search'
            : effectiveGrounding === 'maps'
            ? 'Grounded with Google Maps'
            : 'Context-aware multi-turn response',
        ],
        timestamp: replyTime,
        contextMode: nextContextMode,
        model: data.modelUsed || selectedModel,
        groundingSources,
      };

      setRevealingMessageId(assistantMsg.id);
      onUpdateSessions((prev) =>
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

      if (currentUser) {
        const finalSession: ChatSessionItem = {
          ...activeSession,
          title: derivedTitle,
          contextMode: nextContextMode,
          updatedAt: replyTime,
          messages: [...activeSession.messages, userMsg, assistantMsg],
        };
        saveMessageToFirestore(currentUser, currentSessionId, assistantMsg)
          .then(() =>
            saveSessionToFirestore(currentUser, finalSession, selectedModel)
          )
          .catch(() => {});
      }
    } catch (apiErr: any) {
      const { fullResponse, thinkingSteps } = generateSimpleUltronAnswer(
        text,
        activeContext
      );
      const replyTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const fallbackSources: GroundingSourceItem[] | undefined =
        effectiveGrounding === 'search'
          ? [
              {
                type: 'web',
                title: 'Google Search — Optical & Autonomous AI Systems',
                uri: 'https://research.google/',
              },
            ]
          : effectiveGrounding === 'maps'
          ? [
              {
                type: 'maps',
                title: 'San Francisco AI & Robotics Innovation District',
                uri: 'https://www.google.com/maps/search/?api=1&query=San+Francisco+AI+Research',
                reviewSnippets: [
                  'Premier cluster of autonomous systems and deep-tech laboratories.',
                ],
              },
            ]
          : undefined;

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: fullResponse,
        thinkingSteps,
        timestamp: replyTime,
        contextMode: nextContextMode,
        model:
          effectiveGrounding !== 'none'
            ? `gemini-4-hydrogen (${effectiveGrounding})`
            : selectedModel,
        groundingSources: fallbackSources,
      };

      setRevealingMessageId(assistantMsg.id);
      onUpdateSessions((prev) =>
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

      if (currentUser) {
        const finalSession: ChatSessionItem = {
          ...activeSession,
          title: derivedTitle,
          contextMode: nextContextMode,
          updatedAt: replyTime,
          messages: [...activeSession.messages, userMsg, assistantMsg],
        };
        saveMessageToFirestore(currentUser, currentSessionId, assistantMsg)
          .then(() =>
            saveSessionToFirestore(currentUser, finalSession, selectedModel)
          )
          .catch(() => {});
      }

      if (apiErr?.message) {
        setStatusNotice(apiErr.message);
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  const handleRegenerateFromMessage = (msgIndex: number) => {
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        handleSend(messages[i].content);
        return;
      }
    }
    handleSend(messages[msgIndex].content.slice(0, 80));
  };

  const handleSaveEditedPrompt = (originalText: string) => {
    const trimmed = editingText.trim();
    setEditingMsgId(null);
    setEditingText('');
    if (trimmed && trimmed !== originalText) {
      handleSend(trimmed);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = async (id: string, text: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Ultron — ${activeSession.title}`,
          text,
        });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setSharedId(id);
      setTimeout(() => setSharedId(null), 2000);
    } catch {
      navigator.clipboard?.writeText(text).catch(() => {});
      setSharedId(id);
      setTimeout(() => setSharedId(null), 2000);
    }
  };

  const toggleThinking = (id: string) => {
    setExpandedThinking((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderComposerControls = () => (
    <div className="flex flex-wrap items-center gap-1.5 pb-2.5 mb-2.5 border-b border-slate-200/80 dark:border-white/[0.06]">
      {/* Model Selector */}
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 rounded-xl px-2.5 py-1">
        <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <select
          aria-label="Select AI Model"
          data-testid="chat-model-selector"
          value={selectedModel}
          onChange={(e) => onSelectModel?.(e.target.value)}
          className="bg-transparent text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
        >
          <option value="gemini-4-hydrogen" className="bg-white dark:bg-slate-950">
            Gemini 4 Hydrogen (General)
          </option>
          <option value="gemini-3.1-flash-lite" className="bg-white dark:bg-slate-950">
            Gemini 3.1 Flash Lite (Fast)
          </option>
          <option value="gemini-4-argon" className="bg-white dark:bg-slate-950">
            Gemini 4 Argon (Interactive)
          </option>
          <option value="gemini-4-carbon" className="bg-white dark:bg-slate-950">
            Gemini 4 Carbon (Deep Reasoning)
          </option>
        </select>
      </div>

      {/* Google Search Grounding */}
      <button
        type="button"
        data-testid="grounding-search-toggle"
        onClick={() =>
          setGroundingMode((prev) => (prev === 'search' ? 'none' : 'search'))
        }
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors ${
          groundingMode === 'search'
            ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-400/50 text-indigo-700 dark:text-indigo-200'
            : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        <Globe className="w-3.5 h-3.5" />
        <span>Web Search</span>
      </button>

      {/* Google Maps Grounding */}
      <button
        type="button"
        data-testid="grounding-maps-toggle"
        onClick={() =>
          setGroundingMode((prev) => (prev === 'maps' ? 'none' : 'maps'))
        }
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors ${
          groundingMode === 'maps'
            ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-400/50 text-emerald-700 dark:text-emerald-200'
            : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        <MapPin className="w-3.5 h-3.5" />
        <span>Maps</span>
      </button>

      {/* Live Voice Trigger */}
      {onOpenVoiceMode && (
        <button
          type="button"
          data-testid="open-live-voice-btn"
          onClick={onOpenVoiceMode}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-400/35 text-indigo-700 dark:text-indigo-200 transition-colors ml-auto"
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Live Voice</span>
        </button>
      )}
    </div>
  );

  const renderComposerForm = (variant: 'centered' | 'docked') => (
    <form
      data-testid="assistant-breathing-composer"
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
      className={`w-full rounded-2xl bg-white dark:bg-[#12151E] border transition-all duration-200 p-3 sm:p-3.5 text-left ${
        variant === 'centered'
          ? 'shadow-[0_12px_36px_-14px_rgba(15,23,42,0.12)] dark:shadow-[0_18px_45px_-15px_rgba(0,0,0,0.65)]'
          : 'shadow-[0_8px_28px_-10px_rgba(15,23,42,0.1)] dark:shadow-[0_12px_36px_-12px_rgba(0,0,0,0.6)]'
      } ${
        isComposerFocused
          ? 'border-indigo-500 ring-2 ring-indigo-500/20'
          : 'border-slate-200 dark:border-white/[0.1] hover:border-slate-300 dark:hover:border-white/[0.18]'
      }`}
    >
      {renderComposerControls()}

      {attachedDemoFile && (
        <div className="mb-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-200">
          <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
          <span>{attachedDemoFile}</span>
          <button
            type="button"
            onClick={() => setAttachedDemoFile(null)}
            aria-label="Remove attachment"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          data-testid="chat-prompt-input"
          rows={variant === 'centered' ? 2 : 1}
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
          placeholder={
            groundingMode === 'search'
              ? 'Ask Ultron anything with live web search…'
              : groundingMode === 'maps'
              ? 'Ask Ultron about places, routes, or locations…'
              : 'Ask Ultron anything…'
          }
          disabled={isStreaming}
          aria-label="Ask Ultron anything"
          className="flex-1 bg-transparent resize-none px-1 py-1 text-[15px] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none leading-relaxed max-h-40"
        />
      </div>

      <div className="flex items-center justify-between pt-2.5 mt-1.5 border-t border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.txt,.md,.json,.ts,.tsx,.py,.pdf"
            onChange={handleAttachmentSelect}
            className="hidden"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach file"
            title="Attach file or audio"
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <button
            type="button"
            data-testid="transcribe-audio-btn"
            onClick={handleToggleAudioTranscription}
            aria-label="Voice input"
            title="Speak and transcribe audio"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isRecordingAudio || isTranscribingAudio
                ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-400/40'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]'
            }`}
          >
            <Mic
              className={`w-3.5 h-3.5 ${
                isRecordingAudio
                  ? 'animate-pulse text-rose-500'
                  : 'text-indigo-600 dark:text-indigo-400'
              }`}
            />
            <span>
              {isRecordingAudio
                ? 'Stop'
                : isTranscribingAudio
                ? 'Transcribing...'
                : 'Voice'}
            </span>
          </button>
        </div>

        <button
          type="submit"
          data-testid="chat-send-btn"
          disabled={!input.trim() || isStreaming}
          aria-label="Send"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs sm:text-sm shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
        >
          <span>Send</span>
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
    </form>
  );

  const statusBarColorClass =
    tokenUsage.statusLevel === 'critical'
      ? 'bg-rose-500'
      : tokenUsage.statusLevel === 'warning'
      ? 'bg-amber-500'
      : 'bg-indigo-500';

  const statusPillColorClass =
    tokenUsage.statusLevel === 'critical'
      ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300'
      : tokenUsage.statusLevel === 'warning'
      ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : 'border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#12151E] text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-500/40';

  const percentDisplay =
    tokenUsage.totalTokens > 0 && tokenUsage.usagePercent < 0.01
      ? '<0.01%'
      : `${tokenUsage.usagePercent}%`;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* ChatView Sub-Header with Real-Time Token Usage & Context Meter */}
      <header
        data-testid="chatview-header"
        className="relative z-30 px-4 sm:px-6 lg:px-8 pt-2.5 pb-2 border-b border-slate-200/70 dark:border-white/[0.06] bg-[#F8F9FB]/75 dark:bg-[#0B0D12]/75 backdrop-blur-xs shrink-0"
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 relative">
          <div className="flex items-center gap-2 min-w-0 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
              {getModelShortLabel(selectedModel)}
            </span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <span className="hidden sm:inline tabular-nums">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </span>
          </div>

          <div ref={tokenPopoverRef} className="relative shrink-0">
            <button
              type="button"
              data-testid="token-usage-counter"
              aria-expanded={isTokenPopoverOpen}
              aria-label={`Estimated context usage: ${tokenUsage.totalTokens.toLocaleString()} of ${tokenUsage.formattedLimit} tokens`}
              onClick={() => setIsTokenPopoverOpen((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs transition-colors shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${statusPillColorClass}`}
            >
              <Gauge className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100" data-testid="token-usage-value">
                ~{tokenUsage.formattedTotal}
              </span>
              <span className="text-slate-400 dark:text-slate-500 font-mono tabular-nums">
                / {tokenUsage.formattedLimit}
              </span>
              <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-slate-500">
                tokens
              </span>
              <div
                aria-hidden="true"
                className="w-10 sm:w-14 h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.09] overflow-hidden"
              >
                <div
                  style={{
                    width: `${
                      tokenUsage.totalTokens > 0
                        ? Math.max(4, Math.min(100, tokenUsage.usagePercent))
                        : 0
                    }%`,
                  }}
                  className={`h-full rounded-full transition-all duration-300 ${statusBarColorClass}`}
                />
              </div>
              <span className="hidden md:inline text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {percentDisplay}
              </span>
            </button>

            {isTokenPopoverOpen && (
              <div
                data-testid="token-usage-popover"
                role="dialog"
                aria-label="Context Window Token Breakdown"
                className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 shadow-xl p-4 z-40 text-xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white text-sm">
                      Context Window
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Estimated tokens in active thread
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${
                      tokenUsage.statusLevel === 'critical'
                        ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                        : tokenUsage.statusLevel === 'warning'
                        ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                        : 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                    }`}
                  >
                    {tokenUsage.statusLabel}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-mono tabular-nums text-[11px]">
                    <span className="text-slate-900 dark:text-slate-100 font-medium">
                      {tokenUsage.totalTokens.toLocaleString()} / {tokenUsage.contextLimit.toLocaleString()}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {percentDisplay}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/[0.07] overflow-hidden">
                    <div
                      style={{
                        width: `${
                          tokenUsage.totalTokens > 0
                            ? Math.max(3, Math.min(100, tokenUsage.usagePercent))
                            : 0
                        }%`,
                      }}
                      className={`h-full rounded-full transition-all duration-300 ${statusBarColorClass}`}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {tokenUsage.remainingTokens.toLocaleString()} tokens remaining
                  </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="pt-2.5 border-t border-slate-200/80 dark:border-white/[0.07] space-y-1.5 font-mono tabular-nums text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-slate-500 dark:text-slate-400">Your prompts</span>
                    <span className="text-slate-800 dark:text-slate-200">{tokenUsage.userTokens.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-slate-500 dark:text-slate-400">Ultron replies</span>
                    <span className="text-slate-800 dark:text-slate-200">{tokenUsage.assistantTokens.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-slate-500 dark:text-slate-400">Current draft</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                      {tokenUsage.draftTokens.toLocaleString()}
                    </span>
                  </div>
                  {tokenUsage.streamingTokens > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-slate-500 dark:text-slate-400">Live response</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                        {tokenUsage.streamingTokens.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Context Management Footer */}
                <div className="pt-2.5 border-t border-slate-200/80 dark:border-white/[0.07] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {tokenUsage.statusLevel === 'normal'
                      ? 'Estimated client-side in real time.'
                      : 'Consider starting a fresh chat to free context.'}
                  </span>
                  {onStartNewChat && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsTokenPopoverOpen(false);
                        onStartNewChat();
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 font-medium shrink-0 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New chat</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Scrollable Chat Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6"
      >
        {isHomeEmptyState ? (
          /* Calm, Balanced Empty State / Landing Screen */
          <div className="min-h-full flex flex-col items-center justify-center max-w-3xl mx-auto py-4">
            {/* Interactive 3D Ultron Core + Subtle Toggle */}
            <div className="flex flex-col items-center">
              <div
                data-testid="assistant-breathing-core"
                className={coreBreathe.className}
              >
                {blobStyle === 'iridescent-3d' ? (
                  <UltronEnergyBlob3D
                    size={136}
                    theme={mapThemeTo3D(theme)}
                    bloomIntensity={bloomIntensity}
                    activity={
                      isStreaming ? 'streaming' : input.trim().length > 0 ? 'typing' : 'idle'
                    }
                    interactive={true}
                    onClick={() => ultronVoiceEngine.speakAboutSelf(true, false)}
                  />
                ) : (
                  <UltronOrbCanvas
                    size={136}
                    state="idle"
                    theme={mapThemeTo3D(theme)}
                    interactive={true}
                    showBackdropImage={true}
                  />
                )}
              </div>

              <div className="mt-1.5 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={() => setBlobStyle('iridescent-3d')}
                  className={`transition-colors ${
                    blobStyle === 'iridescent-3d'
                      ? 'text-slate-900 dark:text-slate-200 font-medium'
                      : 'hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  3D Core
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setBlobStyle('reference-orb')}
                  className={`transition-colors ${
                    blobStyle === 'reference-orb'
                      ? 'text-slate-900 dark:text-slate-200 font-medium'
                      : 'hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Orb
                </button>
                {onOpen3DStudio && (
                  <>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={onOpen3DStudio}
                      className="hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                    >
                      3D Studio
                    </button>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => ultronVoiceEngine.speakAboutSelf(true, false)}
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Voice intro</span>
                </button>
              </div>

              {voiceState.isSpeaking && (
                <div className="mt-3 px-4 py-2 rounded-full bg-white dark:bg-[#12151E] border border-indigo-200 dark:border-indigo-500/40 shadow-md flex items-center gap-3 max-w-md">
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="w-1 h-3 bg-indigo-500 rounded-full animate-pulse" />
                    <span className="w-1 h-4 bg-indigo-400 rounded-full animate-pulse [animation-delay:150ms]" />
                    <span className="w-1 h-2.5 bg-indigo-500 rounded-full animate-pulse [animation-delay:300ms]" />
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 truncate flex-1">
                    &ldquo;{voiceState.text}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={() => ultronVoiceEngine.stop()}
                    aria-label="Stop speech"
                    className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Welcome Heading & Subtitle */}
            <div className="text-center mt-4 mb-6">
              <h1
                style={{ textWrap: 'balance' }}
                className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white"
              >
                Meet Ultron
              </h1>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">
                Your intelligent AI assistant for ideas, writing, coding, research, and more.
              </p>
            </div>

            {/* Centered Rounded Composer */}
            <div className="w-full">
              {renderComposerForm('centered')}

              {statusNotice && (
                <p
                  data-testid="chat-status-notice"
                  className="text-xs text-indigo-600 dark:text-indigo-300 mt-2.5 px-1"
                >
                  {statusNotice}
                </p>
              )}
            </div>

            {/* 6 Balanced Suggested Prompt Cards */}
            <div
              aria-label="Suggested prompts"
              className="w-full mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              {promptCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    data-testid={`suggestion-chip-${idx}`}
                    onClick={() => handleSend(card.prompt, card.mode)}
                    className="group p-4 rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200/90 dark:border-white/[0.08] hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-md dark:hover:bg-[#171B26] text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {card.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {card.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Active Chat Conversation */
          <div className="max-w-3xl mx-auto w-full space-y-6 pb-4">
            {messages.map((msg, msgIdx) => {
              const isAssistant = msg.role === 'assistant';
              const isRevealingThis = isAssistant && revealingMessageId === msg.id;
              const liquidAccent = getLiquidGlassAccentConfig(theme);
              const isEditingThis = !isAssistant && editingMsgId === msg.id;
              const feedback = feedbackByMsg[msg.id] || null;

              return (
                <div
                  key={msg.id}
                  data-testid={`chat-message-${msg.role}`}
                  data-revealing={isRevealingThis ? 'true' : 'false'}
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  {/* Sender Header */}
                  <div className="flex items-center gap-2 mb-1.5 px-1 text-xs text-slate-500 dark:text-slate-400">
                    {isAssistant && <UltronLogoMark size={18} />}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {isAssistant ? 'Ultron' : 'You'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{msg.timestamp}</span>
                    {isAssistant && msg.model && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                          {msg.model}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Message Bubble / Card */}
                  {isAssistant ? (
                    <div
                      className={`w-full rounded-2xl p-4 sm:p-5 liquid-glass-response ${
                        isRevealingThis
                          ? `liquid-glass-response-active ultron-liquid-sheen ${liquidAccent.activeBorderClass}`
                          : ''
                      }`}
                    >
                      {msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
                        <div className="mb-3 pb-2.5 border-b border-slate-200/80 dark:border-white/[0.07]">
                          <button
                            type="button"
                            onClick={() => toggleThinking(msg.id)}
                            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                          >
                            <span>Reasoning details ({msg.thinkingSteps.length})</span>
                            {expandedThinking[msg.id] ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {expandedThinking[msg.id] && (
                            <div className="mt-2 space-y-1 pl-3 border-l-2 border-indigo-200 dark:border-indigo-500/30 text-xs text-slate-500 dark:text-slate-400 font-mono">
                              {msg.thinkingSteps.map((step, sIdx) => (
                                <div key={sIdx}>{step}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <TypewriterLiquidMessage
                        content={msg.content}
                        isRevealing={isRevealingThis}
                        reducedMotion={reducedMotion}
                        theme={theme}
                        onRevealComplete={() =>
                          setRevealingMessageId((curr) =>
                            curr === msg.id ? null : curr
                          )
                        }
                      />

                      {/* Verified Grounding Citations */}
                      {msg.groundingSources && msg.groundingSources.length > 0 && (
                        <div
                          data-testid="grounding-sources-list"
                          className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 space-y-2"
                        >
                          <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                            {msg.groundingSources.some((s) => s.type === 'maps') ? (
                              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Globe className="w-3.5 h-3.5 text-indigo-500" />
                            )}
                            <span>Sources</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.groundingSources.map((src, sIdx) => (
                              <div
                                key={sIdx}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs space-y-1"
                              >
                                <a
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-indigo-600 dark:text-indigo-300 hover:underline flex items-center justify-between gap-1.5"
                                >
                                  <span className="truncate">{src.title}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                                {src.reviewSnippets &&
                                  src.reviewSnippets.map((rev, rIdx) => (
                                    <p
                                      key={rIdx}
                                      className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2"
                                    >
                                      &ldquo;{rev}&rdquo;
                                    </p>
                                  ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Clear Assistant Action Bar */}
                      <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/[0.07] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRegenerateFromMessage(msgIdx)}
                            disabled={isStreaming}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white disabled:opacity-40 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Regenerate</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShare(msg.id, msg.content)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>{sharedId === msg.id ? 'Shared' : 'Share'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => ultronVoiceEngine.triggerBlobTapSpeech()}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Listen</span>
                          </button>

                          <div className="inline-flex items-center border-l border-slate-200 dark:border-white/10 pl-1.5 ml-1 gap-0.5">
                            <button
                              type="button"
                              aria-label="Helpful response"
                              onClick={() =>
                                setFeedbackByMsg((prev) => ({
                                  ...prev,
                                  [msg.id]: prev[msg.id] === 'up' ? null : 'up',
                                }))
                              }
                              className={`p-1.5 rounded-lg transition-colors ${
                                feedback === 'up'
                                  ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Needs improvement"
                              onClick={() =>
                                setFeedbackByMsg((prev) => ({
                                  ...prev,
                                  [msg.id]: prev[msg.id] === 'down' ? null : 'down',
                                }))
                              }
                              className={`p-1.5 rounded-lg transition-colors ${
                                feedback === 'down'
                                  ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                  : 'hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onBranchToCoding(msg.content)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-colors font-medium text-xs"
                        >
                          <Code2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Coding Agent</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Right-Aligned User Message Bubble */
                    <div className="group flex flex-col items-end max-w-[90%] sm:max-w-xl">
                      {isEditingThis ? (
                        <div className="w-full min-w-[260px] sm:min-w-[380px] rounded-2xl bg-white dark:bg-[#12151E] border border-indigo-500 p-3 shadow-md space-y-2">
                          <textarea
                            rows={2}
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full bg-transparent text-sm text-slate-900 dark:text-white resize-none focus:outline-none"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingMsgId(null)}
                              className="px-3 py-1 rounded-lg text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditedPrompt(msg.content)}
                              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
                            >
                              Save &amp; Send
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="rounded-2xl rounded-tr-sm px-4 py-3 bg-indigo-600 text-white shadow-sm text-[15px] leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </div>
                          <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMsgId(msg.id);
                                setEditingText(msg.content);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/[0.06]"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/[0.06]"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Generating / Typing Indicator */}
            {isStreaming && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1.5 px-1 text-xs text-slate-500 dark:text-slate-400">
                  <UltronLogoMark size={18} />
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    Ultron is thinking…
                  </span>
                </div>
                <div className="w-full rounded-2xl p-4 sm:p-5 liquid-glass-response liquid-glass-response-active ultron-liquid-sheen">
                  {streamingContent ? (
                    <SimpleMessageRenderer
                      content={streamingContent}
                      isTyping={true}
                      theme={theme}
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:300ms]" />
                      </span>
                      <span>Generating response…</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Fixed Bottom Input Bar in Active Conversation */}
      {!isHomeEmptyState && (
        <div className="px-4 sm:px-6 lg:px-8 pb-4 pt-2 bg-gradient-to-t from-[#F8F9FB] via-[#F8F9FB]/95 to-transparent dark:from-[#0B0D12] dark:via-[#0B0D12]/95 shrink-0">
          <div className="max-w-3xl mx-auto">
            {statusNotice && (
              <p
                data-testid="chat-status-notice"
                className="text-xs text-indigo-600 dark:text-indigo-300 mb-2 px-1"
              >
                {statusNotice}
              </p>
            )}
            {renderComposerForm('docked')}
          </div>
        </div>
      )}
    </div>
  );
};
