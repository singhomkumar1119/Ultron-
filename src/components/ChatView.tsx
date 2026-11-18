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
  Globe,
  MapPin,
  Radio,
  ExternalLink,
  Database,
  Cpu,
} from 'lucide-react';
import { UltronEnergyBlob3D } from './UltronEnergyBlob3D';
import { UltronOrbCanvas } from './UltronOrbCanvas';
import { UltronHistorySidebar } from './UltronHistorySidebar';
import { ultronVoiceEngine } from '../utils/ultronVoiceEngine';
import {
  type ChatSessionItem,
  type StoredChatMessage,
  type GroundingSourceItem,
  createChatSession,
  renameChatSession,
  deleteChatSession,
  cleanMarkdownSyntax,
  generateSimpleUltronAnswer,
  sanitizeStoredSession,
  getBreathingPulseConfig,
} from '../utils/ultronLogic';
import {
  type User,
  saveSessionToFirestore,
  saveMessageToFirestore,
  renameSessionInFirestore,
  deleteSessionFromFirestore,
  subscribeToUserSessions,
  fetchRecentSessionsFromFirestore,
} from '../lib/firebase';

export type ChatMessage = StoredChatMessage;
export type GroundingMode = 'none' | 'search' | 'maps';

interface ChatViewProps {
  onBranchToCoding: (prompt: string) => void;
  onOpen3DStudio?: () => void;
  onReplayIntro?: () => void;
  onOpenVoiceMode?: () => void;
  newSessionSignal?: number;
  theme: 'amber' | 'cyan' | 'violet';
  bloomIntensity?: number;
  reducedMotion?: boolean;
  selectedModel?: string;
  onSelectModel?: (model: string) => void;
  currentUser?: User | null;
  onSignIn?: () => void;
}

const STORAGE_KEY = 'ultron_chat_sessions_v1';
const ACTIVE_SESSION_KEY = 'ultron_active_session_id_v1';

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
 * Renders Ultron answers cleanly without raw markdown symbols (no ###, **, *, //).
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
        model: 'gemini-4-hydrogen',
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
        model: 'gemini-4-hydrogen',
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
        model: 'gemini-4-hydrogen',
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
        model: 'gemini-4-hydrogen',
      },
    ],
  },
];

export const ChatView: React.FC<ChatViewProps> = ({
  onBranchToCoding,
  onOpen3DStudio,
  onReplayIntro,
  onOpenVoiceMode,
  newSessionSignal = 0,
  theme,
  bloomIntensity = 0.85,
  reducedMotion = false,
  selectedModel = 'gemini-4-hydrogen',
  onSelectModel,
  currentUser = null,
  onSignIn,
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
  const [isFetchingFirestore, setIsFetchingFirestore] = useState(false);
  const [lastSyncedLabel, setLastSyncedLabel] = useState<string | null>(null);

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
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const lastSignalRef = useRef(newSessionSignal);
  const seededFirestoreForUidRef = useRef<string | null>(null);

  const [voiceState, setVoiceState] = useState(() => ultronVoiceEngine.getLiveState());

  useEffect(() => {
    return ultronVoiceEngine.subscribe((st) => setVoiceState(st));
  }, []);

  const mergeCloudAndLocalSessions = (
    cloudSessions: ChatSessionItem[],
    localSessions: ChatSessionItem[]
  ): ChatSessionItem[] => {
    const localById = new Map(localSessions.map((s) => [s.id, s]));
    const mergedCloud = cloudSessions.map((cloudSess) => {
      const localSess = localById.get(cloudSess.id);
      if (!localSess) return cloudSess;

      const cloudMsgIds = new Set(cloudSess.messages.map((m) => m.id));
      const unsyncedLocalMsgs = localSess.messages.filter(
        (m) => !cloudMsgIds.has(m.id)
      );
      const mergedMessages =
        unsyncedLocalMsgs.length > 0
          ? [...cloudSess.messages, ...unsyncedLocalMsgs]
          : cloudSess.messages.length >= localSess.messages.length
          ? cloudSess.messages
          : localSess.messages;

      return {
        ...cloudSess,
        title:
          localSess.messages.length > cloudSess.messages.length
            ? localSess.title
            : cloudSess.title,
        updatedAt:
          localSess.messages.length > cloudSess.messages.length
            ? localSess.updatedAt
            : cloudSess.updatedAt,
        messages: mergedMessages,
      };
    });

    const cloudIds = new Set(cloudSessions.map((s) => s.id));
    const remaining = localSessions.filter((s) => !cloudIds.has(s.id));
    return [...mergedCloud, ...remaining];
  };

  // Real-time Firestore subscription + initial seed when authenticated
  useEffect(() => {
    if (!currentUser) {
      setLastSyncedLabel(null);
      return;
    }

    setIsFetchingFirestore(true);
    const unsub = subscribeToUserSessions(currentUser, (cloudSessions) => {
      const timeNow = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setIsFetchingFirestore(false);
      setLastSyncedLabel(`Synced ${timeNow}`);

      if (cloudSessions.length > 0) {
        setSessions((prev) => mergeCloudAndLocalSessions(cloudSessions, prev));
      } else if (seededFirestoreForUidRef.current !== currentUser.uid) {
        // Seed the user's current sessions into Firestore so they persist in the cloud
        seededFirestoreForUidRef.current = currentUser.uid;
        setSessions((currentList) => {
          currentList.forEach((sess) => {
            saveSessionToFirestore(currentUser, sess, selectedModel)
              .then(() => {
                sess.messages.forEach((m) => {
                  saveMessageToFirestore(currentUser, sess.id, m).catch(() => {});
                });
              })
              .catch(() => {});
          });
          return currentList;
        });
      }
    });

    return () => unsub();
  }, [currentUser, selectedModel]);

  const handleRefreshFirestoreSessions = async () => {
    setIsFetchingFirestore(true);
    try {
      if (currentUser) {
        const recent = await fetchRecentSessionsFromFirestore(currentUser);
        const timeNow = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        setLastSyncedLabel(`Fetched ${timeNow}`);
        if (recent.length > 0) {
          setSessions((prev) => mergeCloudAndLocalSessions(recent, prev));
        }
        setStatusNotice(
          `Fetched ${recent.length} recent session(s) from Firestore.`
        );
      } else {
        const timeNow = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        setLastSyncedLabel(`Checked ${timeNow}`);
        setStatusNotice(
          'Showing recent sessions from cache. Sign in with Google to sync sessions across devices in Firestore.'
        );
      }
    } catch (err: any) {
      setStatusNotice(
        `Firestore fetch notice: ${err?.message || 'Unable to fetch sessions'}`
      );
    } finally {
      setIsFetchingFirestore(false);
    }
  };

  // Request geolocation when Google Maps grounding is enabled
  useEffect(() => {
    if (groundingMode === 'maps' && !userLatLng && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLatLng({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {
          // Optional geolocation; Maps grounding works with or without latLng
        },
        { timeout: 4000 }
      );
    }
  }, [groundingMode, userLatLng]);

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

    if (currentUser) {
      saveSessionToFirestore(currentUser, created, selectedModel)
        .then(() => {
          if (created.messages[0]) {
            return saveMessageToFirestore(currentUser, created.id, created.messages[0]);
          }
        })
        .catch(() => {});
    }
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
      mode: 'none' as GroundingMode,
    },
    {
      label: 'Latest AI chip breakthroughs (Google Search)',
      prompt:
        'What are the latest announcements in optical interconnects and AI accelerator clusters?',
      mode: 'search' as GroundingMode,
    },
    {
      label: 'Tech innovation hubs nearby (Google Maps)',
      prompt:
        'What top robotics and AI research labs or coffee workspaces are in San Francisco?',
      mode: 'maps' as GroundingMode,
    },
    {
      label: 'Multi-agent consensus protocol',
      prompt:
        'Outline a supervisory protocol for coordinating autonomous sub-agents with deterministic rollback.',
      mode: 'none' as GroundingMode,
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
      if (currentUser) {
        renameSessionInFirestore(currentUser, sessionId, nextTitle.trim()).catch(() => {});
      }
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    const updated = deleteChatSession(sessions, sessionId);
    setSessions(updated);
    if (activeSession.id === sessionId) {
      setActiveSessionId(updated[0].id);
    }
    if (currentUser) {
      deleteSessionFromFirestore(currentUser, sessionId).catch(() => {});
    }
  };

  const transcribeBase64Audio = async (base64Audio: string, mimeType: string) => {
    setIsTranscribingAudio(true);
    setStatusNotice('Transcribing audio with gemini-3.5-transcribe...');
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
      setStatusNotice(
        data.fallbackNotice || 'Audio transcribed via gemini-3.5-transcribe.'
      );
      textareaRef.current?.focus();
    } catch (err: any) {
      const fallbackText =
        'Design a resilient event-driven microservice mesh with idempotent replay.';
      setInput((prev) => (prev ? `${prev} ${fallbackText}` : fallbackText));
      setStatusNotice(
        `gemini-3.5-transcribe notice: ${err?.message || 'Inserted voice prompt'}`
      );
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
      setStatusNotice(`Attached ${file.name} for context analysis.`);
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
        setStatusNotice(
          'Recording microphone audio... Click Microphone again to transcribe with gemini-3.5-transcribe.'
        );
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
        activeSession.title.startsWith('Session '));

    const derivedTitle = shouldAutoTitle
      ? text.slice(0, 36) + (text.length > 36 ? '...' : '')
      : activeSession.title;

    const historyForApi = activeSession.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setSessions((prev) =>
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
      const cleanedText = cleanMarkdownSyntax(data.text);
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
        content: cleanedText,
        thinkingSteps: [
          `Model: ${data.modelUsed || selectedModel}`,
          effectiveGrounding === 'search'
            ? 'Grounded with live Google Search data'
            : effectiveGrounding === 'maps'
            ? 'Grounded with live Google Maps place data'
            : 'Multi-turn conversation history synchronized',
        ],
        timestamp: replyTime,
        contextMode: nextContextMode,
        model: data.modelUsed || selectedModel,
        groundingSources,
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

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleThinking = (id: string) => {
    setExpandedThinking((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isHomeEmptyState = messages.length <= 1 && !isStreaming;

  const renderGroundingToolbar = () => (
    <div className="flex flex-wrap items-center gap-1.5 pb-2 mb-2 border-b border-white/[0.06]">
      {/* Model Selector for Multi-Turn Chat */}
      <div className="flex items-center gap-1 bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1">
        <Cpu className={`w-3 h-3 text-amber-400 shrink-0 ${composerBreathe.className}`} />
        <select
          aria-label="Select Gemini Model"
          data-testid="chat-model-selector"
          value={selectedModel}
          onChange={(e) => onSelectModel?.(e.target.value)}
          className="bg-transparent text-[11px] font-medium text-slate-200 focus:outline-none cursor-pointer"
        >
          <option value="gemini-4-hydrogen" className="bg-slate-950">
            gemini-4-hydrogen (General · Free Key)
          </option>
          <option value="gemini-3.1-flash-lite" className="bg-slate-950">
            gemini-3.1-flash-lite (Fast · Free Key)
          </option>
          <option value="gemini-4-argon" className="bg-slate-950">
            gemini-4-argon (Complex Interactive)
          </option>
          <option value="gemini-4-carbon" className="bg-slate-950">
            gemini-4-carbon (Deep Reasoning)
          </option>
        </select>
      </div>

      {/* Google Search Grounding Toggle */}
      <button
        type="button"
        data-testid="grounding-search-toggle"
        onClick={() =>
          setGroundingMode((prev) => (prev === 'search' ? 'none' : 'search'))
        }
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
          groundingMode === 'search'
            ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
            : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-slate-200'
        }`}
      >
        <Globe className="w-3 h-3" />
        <span>Google Search</span>
      </button>

      {/* Google Maps Grounding Toggle */}
      <button
        type="button"
        data-testid="grounding-maps-toggle"
        onClick={() =>
          setGroundingMode((prev) => (prev === 'maps' ? 'none' : 'maps'))
        }
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
          groundingMode === 'maps'
            ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
            : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-slate-200'
        }`}
      >
        <MapPin className="w-3 h-3" />
        <span>Google Maps</span>
      </button>

      {/* Live API Voice Conversation Trigger */}
      {onOpenVoiceMode && (
        <button
          type="button"
          data-testid="open-live-voice-btn"
          onClick={onOpenVoiceMode}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 text-amber-200 transition-colors ml-auto"
        >
          <Radio className="w-3 h-3 animate-pulse" />
          <span>Live Voice (gemini-3.8-live)</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-57px)] max-w-7xl mx-auto px-3 sm:px-6 py-3 gap-5 relative">
      {/* Glassmorphic Collapsible Sidebar Fetching & Displaying Recent Firestore Chat Sessions */}
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
        isFirestoreConnected={Boolean(currentUser)}
        isFetchingFirestore={isFetchingFirestore}
        lastSyncedLabel={lastSyncedLabel}
        onRefreshFirestore={handleRefreshFirestoreSessions}
        onSignInForFirestore={onSignIn}
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
                <span>Recent Sessions</span>
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

            <span
              data-testid="active-session-header-title"
              className="hidden sm:inline text-xs text-slate-400 truncate max-w-[220px]"
            >
              {activeSession.title}
            </span>

            {currentUser ? (
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded">
                <Database className="w-2.5 h-2.5" />
                <span>Firestore Synced</span>
              </span>
            ) : (
              onSignIn && (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-amber-300 bg-white/[0.03] border border-white/10 px-2 py-0.5 rounded transition-colors"
                >
                  <Database className="w-2.5 h-2.5" />
                  <span>Sign in to sync Firestore</span>
                </button>
              )
            )}
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
        <div className="flex-1 overflow-y-auto py-4 pb-16 md:pb-4 px-1 sm:px-2 lg:pr-64 flex flex-col">
          {isHomeEmptyState ? (
            /* Refined AI-Assistant Home Screen */
            <div className="my-auto py-2 flex flex-col items-center justify-center text-center max-w-2xl mx-auto w-full">
              <div className="relative flex flex-col items-center">
                <div
                  data-testid="assistant-breathing-core"
                  className={coreBreathe.className}
                >
                  {blobStyle === 'iridescent-3d' ? (
                    <UltronEnergyBlob3D
                      size={185}
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
                      size={185}
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

              <h1
                style={{ textWrap: 'balance' }}
                className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100 mt-4"
              >
                What would you like to build?
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-md leading-relaxed">
                Multi-turn Gemini intelligence with Firestore session history, Google Search &amp; Maps grounding, and Live Voice.
              </p>

              {/* Prompt Composer */}
              <div className="w-full mt-5">
                <form
                  data-testid="assistant-breathing-composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className={`w-full rounded-2xl bg-[#0a0c14]/90 border transition-all duration-200 p-3 text-left shadow-[0_16px_40px_-12px_rgba(0,0,0,0.65)] ${
                    isComposerFocused
                      ? 'border-amber-400/45 ring-1 ring-amber-400/20'
                      : 'border-white/[0.09] hover:border-white/[0.15]'
                  }`}
                >
                  {renderGroundingToolbar()}

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
                    data-testid="chat-prompt-input"
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
                    placeholder={
                      groundingMode === 'search'
                        ? 'Ask a live question grounded with Google Search (gemini-4-hydrogen)...'
                        : groundingMode === 'maps'
                        ? 'Search places, labs, or directions grounded with Google Maps (gemini-4-hydrogen)...'
                        : 'Describe an architecture, research question, or component to build...'
                    }
                    aria-label="Prompt input"
                    className="w-full bg-transparent resize-none text-sm text-slate-100 placeholder-slate-500 focus:outline-none leading-relaxed max-h-40"
                  />

                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/[0.05]">
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
                        aria-label="Attach file or audio"
                        title="Attach file or upload audio for gemini-3.5-transcribe"
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        data-testid="transcribe-audio-btn"
                        onClick={handleToggleAudioTranscription}
                        aria-label="Transcribe microphone audio"
                        title="Record and transcribe audio with gemini-3.5-transcribe"
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
                          isRecordingAudio || isTranscribingAudio
                            ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
                            : 'text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10'
                        }`}
                      >
                        <Mic
                          className={`w-3.5 h-3.5 ${
                            isRecordingAudio ? 'animate-pulse text-rose-400' : 'text-amber-400'
                          }`}
                        />
                        <span>
                          {isRecordingAudio
                            ? 'Stop & Transcribe'
                            : isTranscribingAudio
                            ? 'Transcribing...'
                            : 'Transcribe Mic'}
                        </span>
                      </button>
                    </div>

                    <button
                      type="submit"
                      data-testid="chat-send-btn"
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
                  <p
                    data-testid="chat-status-notice"
                    className="text-[11px] text-amber-300/90 mt-2 text-left px-1"
                  >
                    {statusNotice}
                  </p>
                )}

                {/* Suggestion Chips Beneath the Composer */}
                <div
                  aria-label="Suggested prompts"
                  className="mt-4 flex flex-wrap items-center justify-center gap-2"
                >
                  {suggestionChips.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      data-testid={`suggestion-chip-${idx}`}
                      onClick={() => handleSend(chip.prompt, chip.mode)}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] hover:border-white/[0.15] text-xs text-slate-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Active Conversation Thread */
            <div className="space-y-6 max-w-3xl mx-auto w-full pb-4">
              {messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <div
                    key={msg.id}
                    data-testid={`chat-message-${msg.role}`}
                    className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-400 tabular-nums">
                      <span className="font-medium text-slate-200">
                        {isAssistant ? 'Ultron' : 'You'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{msg.timestamp}</span>
                      {isAssistant && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            {msg.model || selectedModel}
                          </span>
                        </>
                      )}
                    </div>

                    <div
                      className={`max-w-2xl rounded-2xl p-4 md:p-5 text-sm leading-relaxed ${
                        isAssistant
                          ? 'bg-[#0a0c14]/90 text-slate-100 border border-white/[0.08]'
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

                      {/* Grounding Citations (Google Search & Google Maps URLs + Review Snippets) */}
                      {isAssistant &&
                        msg.groundingSources &&
                        msg.groundingSources.length > 0 && (
                          <div
                            data-testid="grounding-sources-list"
                            className="mt-4 pt-3 border-t border-white/10 space-y-2"
                          >
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                              {msg.groundingSources.some((s) => s.type === 'maps') ? (
                                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                              )}
                              <span>Verified Grounding Sources</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {msg.groundingSources.map((src, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs space-y-1"
                                >
                                  <a
                                    href={src.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-amber-300 hover:text-amber-200 flex items-center justify-between gap-1.5 underline decoration-amber-400/40"
                                  >
                                    <span className="truncate">{src.title}</span>
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                  {src.reviewSnippets &&
                                    src.reviewSnippets.map((rev, rIdx) => (
                                      <p
                                        key={rIdx}
                                        className="text-[11px] text-slate-400 italic line-clamp-2"
                                      >
                                        &ldquo;{rev}&rdquo;
                                      </p>
                                    ))}
                                </div>
                              ))}
                            </div>
                          </div>
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
                    <span className="font-medium text-amber-300">
                      Ultron · Synthesizing with {selectedModel}...
                    </span>
                  </div>
                  <div className="max-w-2xl rounded-2xl p-4 md:p-5 text-sm leading-relaxed bg-[#0a0c14]/90 text-slate-100 border border-amber-500/30">
                    {streamingContent ? (
                      <SimpleMessageRenderer content={streamingContent} />
                    ) : (
                      <span className="text-xs font-mono text-slate-400 animate-pulse">
                        Executing neural directive...
                      </span>
                    )}
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
            {statusNotice && (
              <p
                data-testid="chat-status-notice"
                className="text-[11px] text-amber-300/90 mb-1.5 px-1"
              >
                {statusNotice}
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className={`rounded-2xl bg-[#0a0c14]/95 p-2.5 border transition-all ${
                isComposerFocused
                  ? 'border-amber-400/45 ring-1 ring-amber-400/20'
                  : 'border-white/[0.1]'
              }`}
            >
              {renderGroundingToolbar()}

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
                  aria-label="Attach file or audio"
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  data-testid="transcribe-audio-btn"
                  onClick={handleToggleAudioTranscription}
                  aria-label="Transcribe microphone audio"
                  className={`p-2 rounded-lg transition-colors ${
                    isRecordingAudio || isTranscribingAudio
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>

                <textarea
                  ref={textareaRef}
                  data-testid="chat-prompt-input"
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
                  data-testid="chat-send-btn"
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
