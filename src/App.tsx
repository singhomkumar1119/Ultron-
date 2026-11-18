import React, { useState, useEffect, useCallback } from 'react';
import { CinematicOpening } from './components/CinematicOpening';
import { OnboardingModal } from './components/OnboardingModal';
import { Navigation, type AppMode } from './components/Navigation';
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

const SESSION_INTRO_KEY = 'ultron_intro_seen_session_v2';

export default function App() {
  // Always play the full-screen opening sequence automatically when Ultron opens
  // (unless ?autostart=1 is explicitly passed in the URL)
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return false;
    }
    return true;
  });

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentMode, setCurrentMode] = useState<AppMode>('chat');
  const [newSessionSignal, setNewSessionSignal] = useState(0);
  const [theme, setTheme] = useState<'amber' | 'cyan' | 'violet'>('amber');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [bloomIntensity, setBloomIntensity] = useState<number>(0.85);

  // Modals & Panels
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [pendingCodingTask, setPendingCodingTask] = useState<string | undefined>(undefined);

  // Sync dark class on document element
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener
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

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
  };

  const handleSelectMode = (mode: AppMode) => {
    if (mode === 'voice') {
      setIsVoiceOpen(true);
    } else {
      setCurrentMode(mode);
    }
  };

  const handleNewSessionFromNav = () => {
    setCurrentMode('chat');
    setNewSessionSignal((prev) => prev + 1);
  };

  const handleBranchToCoding = (prompt: string) => {
    setPendingCodingTask(`Implement solution for: ${prompt.slice(0, 80)}`);
    setCurrentMode('coding');
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'amber' ? 'cyan' : prev === 'cyan' ? 'violet' : 'amber'));
  };

  const handleReplayIntro = () => {
    setShowIntro(true);
  };

  return (
    <div
      className={`min-h-screen relative flex flex-col ${
        isDarkMode ? 'dark bg-[#040407] text-slate-100' : 'bg-slate-50 text-slate-900'
      } antialiased selection:bg-amber-500/20 selection:text-amber-200 transition-colors duration-300`}
    >
      {/* Full-Screen 7-Stage Cinematic Opening Sequence */}
      {showIntro && (
        <CinematicOpening
          onComplete={handleFinishIntro}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          reducedMotion={reducedMotion}
          bloomIntensity={bloomIntensity}
          theme={theme}
        />
      )}

      {/* Optional Guide Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={handleCloseOnboarding}
      />

      {/* Minimal Top Navigation Bar */}
      <Navigation
        currentMode={currentMode}
        onSelectMode={handleSelectMode}
        onNewSession={handleNewSessionFromNav}
        onOpenCommand={() => setIsCommandOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        theme={theme}
        reducedMotion={reducedMotion}
      />

      {/* Restrained Atmospheric Background Depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className={`absolute -top-48 left-1/2 -translate-x-1/2 w-[780px] h-[380px] rounded-full blur-[150px] opacity-15 transition-all duration-700 ${
            !reducedMotion ? 'ultron-breathe-core' : ''
          } ${
            theme === 'amber'
              ? 'bg-indigo-600'
              : theme === 'cyan'
              ? 'bg-cyan-500'
              : 'bg-purple-600'
          }`}
        />
      </div>

      {/* Primary Workspace Viewport */}
      <main className="flex-1 relative z-10 overflow-hidden pb-16 md:pb-0">
        {currentMode === 'chat' && (
          <ChatView
            onBranchToCoding={handleBranchToCoding}
            onOpen3DStudio={() => setCurrentMode('3d-core')}
            onReplayIntro={handleReplayIntro}
            newSessionSignal={newSessionSignal}
            theme={theme}
            bloomIntensity={bloomIntensity}
            reducedMotion={reducedMotion}
          />
        )}

        {currentMode === '3d-core' && (
          <Ultron3DCoreView
            theme={theme}
            onChangeTheme={setTheme}
            bloomIntensity={bloomIntensity}
            onChangeBloomIntensity={setBloomIntensity}
          />
        )}

        {currentMode === 'coding' && (
          <CodingAgentView
            initialTask={pendingCodingTask}
          />
        )}

        {currentMode === 'docs' && (
          <DocumentAnalysisView
            theme={theme}
          />
        )}

        {currentMode === 'projects' && (
          <ProjectsView
            onSelectMode={handleSelectMode}
          />
        )}
      </main>

      {/* Draggable Floating Real-Time System Vitals Panel */}
      <UltronSystemVitalsPanel
        theme={theme}
        reducedMotion={reducedMotion}
      />

      {/* Full-Display Cinematic Ultron Lines & Vocal Projection (Triggered when tapping the Core) */}
      <UltronDisplayProjection
        theme={theme}
        soundEnabled={soundEnabled}
      />

      {/* Full-Screen Voice Mode Overlay */}
      {isVoiceOpen && (
        <VoiceModeView
          onClose={() => setIsVoiceOpen(false)}
          theme={theme}
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

      {/* System Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onSelectTheme={setTheme}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        reducedMotion={reducedMotion}
        onToggleReducedMotion={() => setReducedMotion(!reducedMotion)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        onReplayIntro={handleReplayIntro}
        bloomIntensity={bloomIntensity}
        onChangeBloomIntensity={setBloomIntensity}
      />
    </div>
  );
}
