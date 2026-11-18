import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeUnifiedDiff,
  parseDocumentCitations,
  filterCommands,
  voiceStateReducer,
  calculateNeuralActivity,
  createChatSession,
  renameChatSession,
  deleteChatSession,
  getLayerPresetConfig,
  compute3DMorphTargetPosition,
  compute3DBackCurvePoint,
  computeIntroChoreography,
  computeUEmblemPoint,
  cleanMarkdownSyntax,
  generateSimpleUltronAnswer,
  sanitizeStoredSession,
  getSystemStatusThemeConfig,
  getBreathingPulseConfig,
  computeBreathingScale,
  computeSystemVitals,
  clampFloatingPosition,
  filterChatSessions,
  getSessionPreviewSnippet,
  type CommandItem,
} from './ultronLogic';

test('computeUnifiedDiff identifies additions, deletions, and context lines correctly', () => {
  const original = `const port = 3000;\nconst host = 'localhost';\nconsole.log(port);`;
  const modified = `const port = 8080;\nconst host = 'localhost';\nconsole.log(port);\nconsole.log('started');`;

  const diff = computeUnifiedDiff(original, modified);
  assert.ok(diff.lines.length >= 4);
  assert.equal(diff.deletions >= 1, true);
  assert.equal(diff.additions >= 2, true);

  const contextLine = diff.lines.find((l) => l.type === 'context' && l.text.includes('host'));
  assert.ok(contextLine, 'Context line should be preserved');
});

test('parseDocumentCitations extracts bracketed citations and section anchors', () => {
  const sample = `Ultron uses hierarchical memory [Ref 1.2: Section 4 - Neural Attention]. Results confirmed in [Citation 3: Performance Benchmarks].`;
  const citations = parseDocumentCitations(sample);

  assert.equal(citations.length, 2);
  assert.equal(citations[0].id, '1.2');
  assert.equal(citations[0].targetSection, 'Section 4 - Neural Attention');
  assert.equal(citations[1].id, '3');
  assert.equal(citations[1].targetSection, 'Performance Benchmarks');
});

test('filterCommands performs fuzzy case-insensitive category and title search', () => {
  const commands: CommandItem[] = [
    { id: '1', title: 'Open Coding Agent', category: 'Modes', iconName: 'Code', description: 'Plan, edit and inspect code' },
    { id: '2', title: 'Activate Voice Mode', category: 'Modes', iconName: 'Mic', description: 'Speak with Ultron neural core' },
    { id: '3', title: 'Toggle Theme', category: 'Settings', iconName: 'Sun', description: 'Switch between dark and light modes' },
    { id: '4', title: 'Upload Document', category: 'Tools', iconName: 'FileUp', description: 'Analyze PDF or notes' },
  ];

  const searchCoding = filterCommands(commands, 'code');
  assert.equal(searchCoding.length, 1);
  assert.equal(searchCoding[0].id, '1');

  const searchModes = filterCommands(commands, 'modes');
  // 'modes' matches category of items 1 and 2, and description 'light modes' in item 3
  assert.equal(searchModes.length, 3);

  const emptySearch = filterCommands(commands, '');
  assert.equal(emptySearch.length, 4);
});

test('voiceStateReducer transitions through the conversational lifecycle', () => {
  let state = voiceStateReducer('idle', { type: 'START_LISTENING' });
  assert.equal(state, 'listening');

  state = voiceStateReducer(state, { type: 'PROCESS_QUERY' });
  assert.equal(state, 'thinking');

  state = voiceStateReducer(state, { type: 'START_SPEAKING' });
  assert.equal(state, 'speaking');

  state = voiceStateReducer(state, { type: 'FINISH_SPEAKING' });
  assert.equal(state, 'idle');

  // Interrupt during speech
  state = voiceStateReducer('speaking', { type: 'INTERRUPT' });
  assert.equal(state, 'idle');
});

test('calculateNeuralActivity modulates rotation speed and scale based on active state', () => {
  const idleMetrics = calculateNeuralActivity('idle', 1000);
  const thinkingMetrics = calculateNeuralActivity('thinking', 1000);

  assert.ok(thinkingMetrics.ringRotationSpeed > idleMetrics.ringRotationSpeed);
  assert.ok(thinkingMetrics.pulseSpeed > idleMetrics.pulseSpeed);
});

test('createChatSession, renameChatSession, and deleteChatSession manage conversation history accurately', () => {
  const s1 = createChatSession('Optical Compute Research', 'Deep Research', 's-1');
  const s2 = createChatSession('Rate Limiter Spec', 'Code Architect', 's-2');
  assert.equal(s1.title, 'Optical Compute Research');
  assert.equal(s1.messages.length, 1);

  const renamed = renameChatSession([s1, s2], 's-1', 'Silicon Photonics 2026');
  assert.equal(renamed[0].title, 'Silicon Photonics 2026');
  assert.equal(renamed[1].title, 'Rate Limiter Spec');

  const afterDeleteOne = deleteChatSession(renamed, 's-1');
  assert.equal(afterDeleteOne.length, 1);
  assert.equal(afterDeleteOne[0].id, 's-2');

  // Deleting the last session creates a fresh fallback session so list is never empty
  const afterDeleteLast = deleteChatSession(afterDeleteOne, 's-2');
  assert.equal(afterDeleteLast.length, 1);
  assert.equal(afterDeleteLast[0].id, 'session-default');
});

test('getLayerPresetConfig and compute3DMorphTargetPosition produce finite distinct 3D formations', () => {
  const vesper = getLayerPresetConfig('vesper-cortex');
  assert.equal(vesper.headline, 'Motion instead of chrome');

  const pCore = compute3DMorphTargetPosition(12, 360, 'ultron-core', 0);
  const pVesper = compute3DMorphTargetPosition(12, 360, 'vesper-cortex', 0);
  const pExploded = compute3DMorphTargetPosition(12, 360, 'ultron-core', 1.0);

  assert.ok(pCore.every((n) => Number.isFinite(n)));
  assert.ok(pVesper.every((n) => Number.isFinite(n)));
  assert.notDeepEqual(pCore, pVesper);

  const rBase = Math.hypot(pCore[0], pCore[1], pCore[2]);
  const rExploded = Math.hypot(pExploded[0], pExploded[1], pExploded[2]);
  assert.ok(rExploded > rBase, 'Exploded factor must increase radial separation');

  const orbitPt = compute3DBackCurvePoint(Math.PI / 3, 1.45, 1.15, 0.35, -0.25, -0.42);
  assert.ok(orbitPt.every((n) => Number.isFinite(n)));
});

test('computeIntroChoreography progresses through all 7 opening stages and computeUEmblemPoint forms symmetric U shape', () => {
  const s0 = computeIntroChoreography(0.1);
  assert.equal(s0.stageName, 'glow');

  const s1 = computeIntroChoreography(0.5);
  assert.equal(s1.stageName, 'gather');
  assert.ok(s1.particleGatherWeight > 0);

  const s2 = computeIntroChoreography(1.2);
  assert.equal(s2.stageName, 'deform');
  assert.ok(s2.blobDeformWeight > 0.3);

  const s3 = computeIntroChoreography(1.9);
  assert.equal(s3.stageName, 'filaments');
  assert.ok(s3.filamentRevealWeight > 0.4);

  const s4 = computeIntroChoreography(2.4);
  assert.equal(s4.stageName, 'emblem');

  const s5 = computeIntroChoreography(3.0);
  assert.equal(s5.stageName, 'wordmark');
  assert.ok(s5.uEmblemMorphWeight > 0.9);
  assert.ok(s5.wordmarkRevealWeight > 0.5);

  const s6 = computeIntroChoreography(3.7);
  assert.equal(s6.stageName, 'transition');
  assert.ok(s6.dissolveWeight > 0.7);

  // Symmetric top endpoints and negative-Y bottom arc of the U emblem
  const leftTop = computeUEmblemPoint(0.0, 1.0);
  const bottomMid = computeUEmblemPoint(0.5, 1.0);
  const rightTop = computeUEmblemPoint(1.0, 1.0);

  assert.ok(leftTop[0] < 0 && rightTop[0] > 0);
  assert.ok(Math.abs(leftTop[1] - rightTop[1]) < 1e-6);
  assert.ok(bottomMid[1] < leftTop[1]);
});

test('cleanMarkdownSyntax removes raw ###, **, *, and conversational // comments cleanly', () => {
  const dirty = `### State of Silicon Photonics (Demo)
1. **Bandwidth Density**: Multi-wavelength lasers.
// Demo evaluation pipeline
Sub-millisecond **P99** latency.`;

  const cleaned = cleanMarkdownSyntax(dirty);
  assert.equal(cleaned.includes('###'), false, 'Should not contain ###');
  assert.equal(cleaned.includes('**'), false, 'Should not contain **');
  assert.equal(cleaned.includes('//'), false, 'Should not contain //');
  assert.ok(cleaned.includes('State of Silicon Photonics (Demo)'));
  assert.ok(cleaned.includes('1. Bandwidth Density: Multi-wavelength lasers.'));
});

test('generateSimpleUltronAnswer provides authoritative explanations with zero raw syntax', () => {
  const result = generateSimpleUltronAnswer('Synthesize the state of optical compute interconnects and silicon photonics');
  assert.equal(result.fullResponse.includes('###'), false);
  assert.equal(result.fullResponse.includes('**'), false);
  assert.equal(result.fullResponse.includes('//'), false);
  assert.ok(result.fullResponse.includes('State of Silicon Photonics and Optical Interconnects'));
  assert.ok(result.fullResponse.includes('High Bandwidth Density:'));
  assert.ok(result.thinkingSteps.length >= 3);
});

test('sanitizeStoredSession cleans legacy raw markdown symbols from stored sessions', () => {
  const legacySession = {
    id: 's-legacy',
    title: 'Legacy Session',
    updatedAt: '12:00',
    contextMode: 'Deep Research' as const,
    messages: [
      {
        id: 'm1',
        role: 'assistant' as const,
        content: '### Old Heading\n\n1. **Item One**: Description\n// atomic check',
        timestamp: '12:00',
      },
    ],
  };

  const sanitized = sanitizeStoredSession(legacySession);
  const content = sanitized.messages[0].content;
  assert.equal(content.includes('###'), false);
  assert.equal(content.includes('**'), false);
  assert.equal(content.includes('// atomic'), false);
  assert.ok(content.includes('Old Heading'));
  assert.ok(content.includes('Item One: Description'));
});

test('getSystemStatusThemeConfig returns distinct theme-aware classes for System Online pulsing indicator', () => {
  const amber = getSystemStatusThemeConfig('amber');
  const cyan = getSystemStatusThemeConfig('cyan');
  const violet = getSystemStatusThemeConfig('violet');

  assert.equal(amber.label, 'System Online');
  assert.equal(cyan.label, 'System Online');
  assert.equal(violet.label, 'System Online');

  assert.ok(amber.dotColorClass.includes('amber'));
  assert.ok(cyan.dotColorClass.includes('cyan'));
  assert.ok(violet.dotColorClass.includes('violet'));

  assert.notEqual(amber.textColorClass, cyan.textColorClass);
  assert.notEqual(cyan.textColorClass, violet.textColorClass);
});

test('getBreathingPulseConfig and computeBreathingScale produce subtle rhythmic scale pulses and respect reducedMotion', () => {
  const coreCfg = getBreathingPulseConfig('core', 0, false);
  const chipCfg = getBreathingPulseConfig('chip', 2, false);
  const reducedCfg = getBreathingPulseConfig('core', 0, true);

  assert.equal(coreCfg.className, 'ultron-breathe-core');
  assert.ok(coreCfg.maxScale > 1.0 && coreCfg.maxScale <= 1.04);
  assert.equal(chipCfg.delayMs, 560);
  assert.equal(reducedCfg.className, '');
  assert.equal(reducedCfg.maxScale, 1.0);

  // At t=0ms (index=0), scale starts at 1.0; at half period (2600ms for 5.2s core), reaches peak maxScale
  const scaleStart = computeBreathingScale(0, 'core', 0, false);
  const scalePeak = computeBreathingScale(2600, 'core', 0, false);
  const scaleReduced = computeBreathingScale(2600, 'core', 0, true);

  assert.equal(scaleStart, 1.0);
  assert.equal(scalePeak, coreCfg.maxScale);
  assert.equal(scaleReduced, 1.0);
});

test('computeSystemVitals and clampFloatingPosition generate bounded telemetry and viewport-clamped coordinates', () => {
  const idleVitals = computeSystemVitals(10, false);
  const busyVitals = computeSystemVitals(10, true);

  assert.equal(idleVitals.memoryTotalGb, 24.0);
  assert.ok(idleVitals.memoryUsedGb >= 8.0 && idleVitals.memoryUsedGb <= 24.0);
  assert.ok(busyVitals.networkDownMbps > idleVitals.networkDownMbps);
  assert.equal(idleVitals.sparkline.length, 12);

  const clampedTopLeft = clampFloatingPosition(-50, -30, 260, 180, 1440, 900, 12);
  assert.equal(clampedTopLeft.x, 12);
  assert.equal(clampedTopLeft.y, 12);

  const clampedBottomRight = clampFloatingPosition(2000, 1200, 260, 180, 1440, 900, 12);
  assert.equal(clampedBottomRight.x, 1440 - 260 - 12);
  assert.equal(clampedBottomRight.y, 900 - 180 - 12);
});

test('filterChatSessions and getSessionPreviewSnippet filter and summarize chat history accurately', () => {
  const s1 = createChatSession('Silicon Photonics 2026', 'Deep Research', 's-1');
  const s2 = createChatSession('Token Bucket Rate Limiter', 'Code Architect', 's-2');
  s2.messages.push({
    id: 'u-1',
    role: 'user',
    content: 'Design a distributed token-bucket rate limiter in TypeScript with Redis Lua scripts.',
    timestamp: '21:10',
  });

  const filteredByTitle = filterChatSessions([s1, s2], 'photonics');
  assert.equal(filteredByTitle.length, 1);
  assert.equal(filteredByTitle[0].id, 's-1');

  const filteredByContent = filterChatSessions([s1, s2], 'redis lua');
  assert.equal(filteredByContent.length, 1);
  assert.equal(filteredByContent[0].id, 's-2');

  const snippet = getSessionPreviewSnippet(s2);
  assert.ok(snippet.includes('Design a distributed token-bucket'));
});




