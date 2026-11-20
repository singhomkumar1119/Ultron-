import React, { useState, useEffect, useCallback } from 'react';
import { CinematicOpening } from './components/CinematicOpening';
import { OnboardingModal } from './components/OnboardingModal';
import { Navigation, type AppMode } from './components/Navigation';
import { UltronHistorySidebar } from './components/UltronHistorySidebar';
import { ChatView } from './components/ChatView';
import { CodingAgentView } from './components/CodingAgentView';
import { VoiceModeView } from './components/VoiceModeView';
import { DocumentAnalysisView } from './components/DocumentAnalysisView';
import { ProjectsView } from './components/ProjectsView';
import { CommandPalette } from './components/CommandPalette';
import { SettingsModal } from './components/SettingsModal';
import { UltronDisplayProjection } from './components/UltronDisplayProjection';
import { Ultron3DCoreView } from './components/Ultron3DCoreView';
import { UltronSystemVitalsPanel } from './components/UltronSystemVitalsPanel';
import { UltronCinematicBackdrop } from './components/UltronCinematicBackdrop';
import {
  type UltronTheme,
  type AppearanceMode,
  type ChatSessionItem,
  resolveDarkMode,
  mapThemeTo3D,
  createChatSession,
  renameChatSession,
  deleteChatSession,
  sanitizeStoredSession,
} from './utils/ultronLogic';

const SESSION_INTRO_KEY = 'ultron_intro_seen_session_v2';
const STORAGE_KEY = 'ultron_chat_sessions_v1';
const ACTIVE_SESSION_KEY = 'ultron_active_session_id_v1';
const APPEARANCE_KEY = 'ultron_appearance_mode_v1';

const DEFAULT_SESSIONS: ChatSessionItem[] = [
  createChatSession('New chat', 'Deep Research', 'session-default'),
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
        content: `## State of Silicon Photonics and Optical Interconnects

Optical interconnects and co-packaged silicon photonics represent the primary scaling frontier for high-density compute clusters. By transmitting data via modulated light waves across silicon waveguides rather than electrical copper wiring, modern AI fabrics eliminate electrical resistance, heat dissipation bottlenecks, and line-loss attenuation.

Core Technical Vectors:
1. High Bandwidth Density: Micro-ring resonator arrays enable multi-wavelength division multiplexing directly along the substrate perimeter, delivering massive bidirectional throughput.
2. Thermal and Energy Efficiency: External continuous-wave laser sources isolate thermal dissipation from compute dies, bringing energy consumption below 1.5 picojoules per bit.
3. Low Latency Switching: Direct optical circuit switching bypasses electrical packet buffering stages during collective operations, cutting all-reduce latency significantly.

| Interconnect Metric | Copper Backplane | Co-Packaged Silicon Photonics |
| --- | --- | --- |
| Energy per bit | 8–12 pJ/bit | < 1.5 pJ/bit |
| Reach at 224G | < 1 meter | > 100 meters |
| Thermal profile | High die coupling | Isolated external laser |`,
        thinkingSteps: [
          'Evaluating optical waveguide benchmarks and substrate density',
          'Synthesizing co-packaged optics (CPO) architectural parameters',
          'Formatting clean high-density technical brief',
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
        content: `## Distributed Token-Bucket Rate Limiter Architecture

To achieve sub-millisecond P99 latency across edge gateways without race conditions, combine local in-memory token leases with atomic Redis cluster synchronization:

1. Atomic Refill Evaluation: Compute token replenishment and decrement in a single server-side atomic step using monotonic timestamps so concurrent workers never double-spend capacity.
2. Sliding-Window Burst Guard: Pair the primary token bucket with a short sub-second sliding counter to absorb traffic spikes while enforcing strict average throughput.
3. Graceful Degradation: Fall back to deterministic local memory quotas with bounded jitter if the coordination cluster experiences a network partition.

\`\`\`ts
export function takeToken(bucket: { tokens: number; capacity: number }, cost = 1): boolean {
  if (bucket.tokens < cost) return false;
  bucket.tokens -= cost;
  return true;
}
\`\`\``,
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

export default function App() {
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return false;
    }
    return true;
  });

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentMode, setCurrentMode] = useState<AppMode>('chat');
  const [theme, setTheme] = useState<UltronTheme>('indigo');
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(APPEARANCE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          return saved;
        }
      } catch {
        // Ignore storage errors
      }
    }
    return 'dark';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  const isDarkMode = resolveDarkMode(appearanceMode, systemPrefersDark);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedModel, setSelectedModel] = useState('gemini-4-hydrogen');
  const [bloomIntensity, setBloomIntensity] = useState<number>(0.85);

  // Sidebar & Session State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [chatNotice, setChatNotice] = useState<string | null>(null);

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
        // Fallback to defaults
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

  // Modals & Overlays
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [pendingCodingTask, setPendingCodingTask] = useState<string | undefined>(undefined);

  // System theme media listener
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Persist appearance mode & sync `.dark` root class
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(APPEARANCE_KEY, appearanceMode);
    } catch {
      // Ignore storage errors
    }
  }, [isDarkMode, appearanceMode]);

  // Persist sessions & active session to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Ignore quota errors
    }
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    } catch {
      // Ignore
    }
  }, [activeSessionId]);

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFinishIntro = useCallback(() => {
    setShowIntro(false);
    try {
      sessionStorage.setItem(SESSION_INTRO_KEY, 'true');
    } catch {
      // Ignore storage restrictions
    }
  }, []);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const handleCreateSession = (customTitle?: string) => {
    const titleToUse = customTitle?.trim() || 'New chat';
    const created = createChatSession(titleToUse, activeSession?.contextMode || 'Deep Research');
    setSessions((prev) => [created, ...prev]);
    setActiveSessionId(created.id);
    setCurrentMode('chat');
    setIsMobileSidebarOpen(false);
    setChatNotice(null);
  };

  const handleRenameSession = (sessionId: string, nextTitle: string) => {
    if (!nextTitle.trim()) return;
    setSessions((prev) => renameChatSession(prev, sessionId, nextTitle.trim()));
  };

  const handleDeleteSession = (sessionId: string) => {
    const updated = deleteChatSession(sessions, sessionId);
    setSessions(updated);
    if (activeSession.id === sessionId) {
      setActiveSessionId(updated[0].id);
    }
  };

  const handleClearLocalSessions = () => {
    const fresh = createChatSession('New chat', 'Deep Research', 'session-default');
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
    setCurrentMode('chat');
    setChatNotice('Cleared local chat cache.');
  };

  const handleSelectMode = (mode: AppMode) => {
    if (mode === 'voice') {
      setIsVoiceOpen(true);
    } else {
      setCurrentMode(mode);
    }
  };

  const handleBranchToCoding = (prompt: string) => {
    setPendingCodingTask(`Implement solution for: ${prompt.slice(0, 80)}`);
    setCurrentMode('coding');
  };

  const handleToggleTheme = () => {
    setTheme((prev) =>
      prev === 'indigo'
        ? 'cyan'
        : prev === 'cyan'
        ? 'amber'
        : prev === 'amber'
        ? 'violet'
        : 'indigo'
    );
  };

  const handleToggleDarkMode = () => {
    setAppearanceMode(isDarkMode ? 'light' : 'dark');
  };

  return (
    <div
      className={`h-screen w-full overflow-hidden relative flex ${
        isDarkMode ? 'dark bg-[#050509] text-slate-100' : 'bg-[#F8F9FB] text-slate-900'
      } antialiased selection:bg-indigo-500/20 selection:text-indigo-700 dark:selection:bg-[#FF173D]/25 dark:selection:text-white transition-colors duration-200`}
    >
      {/* Immersive Multi-Layer 3D Sci-Fi Robotic AI Backdrop */}
      <UltronCinematicBackdrop
        isDarkMode={isDarkMode}
        reducedMotion={reducedMotion}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Full-Screen 7-Stage Cinematic Opening Sequence */}
      {showIntro && (
        <CinematicOpening
          onComplete={handleFinishIntro}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          reducedMotion={reducedMotion}
          bloomIntensity={bloomIntensity}
          theme={mapThemeTo3D(theme)}
        />
      )}

      {/* Help / Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      {/* Persistent Left Sidebar (Desktop) & Slide-Over Drawer (Mobile) */}
      <UltronHistorySidebar
        sessions={sessions}
        activeSessionId={activeSession.id}
        currentMode={currentMode}
        onSelectMode={handleSelectMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setShowOnboarding(true)}
        isOpen={isSidebarOpen}
        onToggleOpen={setIsSidebarOpen}
        isMobileOpen={isMobileSidebarOpen}
        onToggleMobileOpen={setIsMobileSidebarOpen}
        onSelectSession={setActiveSessionId}
        onCreateSession={() => handleCreateSession('New chat')}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        theme={theme}
      />

      {/* Right Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
        <Navigation
          currentMode={currentMode}
          activeSessionTitle={activeSession.title}
          isSidebarOpen={isSidebarOpen}
          onOpenDesktopSidebar={() => setIsSidebarOpen(true)}
          onOpenMobileDrawer={() => setIsMobileSidebarOpen(true)}
          onSelectMode={handleSelectMode}
          onNewSession={() => handleCreateSession('New chat')}
          onOpenCommand={() => setIsCommandOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          theme={theme}
        />

        <main className="flex-1 min-h-0 overflow-hidden relative">
          {currentMode === 'chat' && (
            <ChatView
              sessions={sessions}
              activeSession={activeSession}
              onUpdateSessions={setSessions}
              onBranchToCoding={handleBranchToCoding}
              onOpen3DStudio={() => setCurrentMode('3d-core')}
              onOpenVoiceMode={() => setIsVoiceOpen(true)}
              onStartNewChat={() => handleCreateSession('New chat')}
              theme={theme}
              bloomIntensity={bloomIntensity}
              reducedMotion={reducedMotion}
              soundEnabled={soundEnabled}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              externalNotice={chatNotice}
              onClearExternalNotice={() => setChatNotice(null)}
            />
          )}

          {currentMode === '3d-core' && (
            <Ultron3DCoreView
              theme={mapThemeTo3D(theme)}
              onChangeTheme={(next) => setTheme(next)}
              bloomIntensity={bloomIntensity}
              onChangeBloomIntensity={setBloomIntensity}
            />
          )}

          {currentMode === 'coding' && (
            <CodingAgentView initialTask={pendingCodingTask} />
          )}

          {currentMode === 'docs' && (
            <DocumentAnalysisView theme={mapThemeTo3D(theme)} />
          )}

          {currentMode === 'projects' && (
            <ProjectsView onSelectMode={handleSelectMode} />
          )}
        </main>
      </div>

      {/* Draggable Floating Real-Time System Vitals Panel (Minimized by default for calm UI) */}
      <UltronSystemVitalsPanel
        theme={theme}
        reducedMotion={reducedMotion}
      />

      {/* Full-Display Cinematic Ultron Lines & Vocal Projection */}
      <UltronDisplayProjection
        theme={mapThemeTo3D(theme)}
        soundEnabled={soundEnabled}
      />

      {/* Full-Screen Voice Mode Overlay */}
      {isVoiceOpen && (
        <VoiceModeView
          onClose={() => setIsVoiceOpen(false)}
          theme={mapThemeTo3D(theme)}
          soundEnabled={soundEnabled}
          selectedModel={selectedModel}
          history={activeSession.messages.map((m) => ({
            role: m.role,
            content: m.content,
          }))}
        />
      )}

      {/* Universal Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onSelectMode={handleSelectMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleTheme={handleToggleTheme}
      />

      {/* Clean Grouped Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onSelectTheme={setTheme}
        appearanceMode={appearanceMode}
        onSelectAppearanceMode={setAppearanceMode}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        reducedMotion={reducedMotion}
        onToggleReducedMotion={() => setReducedMotion(!reducedMotion)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        onReplayIntro={() => setShowIntro(true)}
        bloomIntensity={bloomIntensity}
        onChangeBloomIntensity={setBloomIntensity}
        sessionCount={sessions.length}
        onClearLocalHistory={handleClearLocalSessions}
        onOpenHelp={() => {
          setIsSettingsOpen(false);
          setShowOnboarding(true);
        }}
      />
    </div>
  );
}
