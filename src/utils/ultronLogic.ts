export interface DiffLine {
  type: 'add' | 'del' | 'context';
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffResult {
  lines: DiffLine[];
  additions: number;
  deletions: number;
}

/**
 * Computes line-by-line unified diff between two code strings.
 */
export function computeUnifiedDiff(original: string, modified: string): DiffResult {
  const oldLines = original.split('\n');
  const newLines = modified.split('\n');
  const lines: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;

  let i = 0;
  let j = 0;
  let oldNum = 1;
  let newNum = 1;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length) {
      if (oldLines[i] === newLines[j]) {
        lines.push({
          type: 'context',
          text: oldLines[i],
          oldLineNumber: oldNum++,
          newLineNumber: newNum++,
        });
        i++;
        j++;
      } else {
        // Look ahead for simple edits
        const oldInNew = newLines.indexOf(oldLines[i], j);
        const newInOld = oldLines.indexOf(newLines[j], i);

        if (newInOld === -1 && oldInNew !== -1) {
          // Addition
          lines.push({
            type: 'add',
            text: newLines[j],
            newLineNumber: newNum++,
          });
          additions++;
          j++;
        } else {
          // Deletion
          lines.push({
            type: 'del',
            text: oldLines[i],
            oldLineNumber: oldNum++,
          });
          deletions++;
          i++;
        }
      }
    } else if (i < oldLines.length) {
      lines.push({
        type: 'del',
        text: oldLines[i],
        oldLineNumber: oldNum++,
      });
      deletions++;
      i++;
    } else if (j < newLines.length) {
      lines.push({
        type: 'add',
        text: newLines[j],
        newLineNumber: newNum++,
      });
      additions++;
      j++;
    }
  }

  return { lines, additions, deletions };
}

export interface CitationRef {
  id: string;
  label: string;
  targetSection: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Parses markdown/text content for bracket citations like [Ref 1.2: Section Name]
 */
export function parseDocumentCitations(text: string): CitationRef[] {
  const regex = /\[(?:Ref|Citation)\s*([0-9.]+)?:\s*([^\]]+)\]/gi;
  const citations: CitationRef[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const id = match[1] || `ref-${citations.length + 1}`;
    const targetSection = match[2].trim();
    citations.push({
      id,
      label: match[0],
      targetSection,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return citations;
}

export interface CommandItem {
  id: string;
  title: string;
  category: 'Modes' | 'Actions' | 'Tools' | 'Settings';
  shortcut?: string;
  iconName: string;
  description?: string;
}

/**
 * Filter command palette actions with fuzzy keyword matching.
 */
export function filterCommands(items: CommandItem[], query: string): CommandItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  return items.filter((item) => {
    const inTitle = item.title.toLowerCase().includes(q);
    const inCategory = item.category.toLowerCase().includes(q);
    const inDesc = item.description?.toLowerCase().includes(q) ?? false;
    return inTitle || inCategory || inDesc;
  });
}

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export type VoiceEvent =
  | { type: 'START_LISTENING' }
  | { type: 'SPEECH_DETECTED' }
  | { type: 'PROCESS_QUERY' }
  | { type: 'START_SPEAKING' }
  | { type: 'FINISH_SPEAKING' }
  | { type: 'INTERRUPT' }
  | { type: 'STOP' };

/**
 * Pure state machine transition for Ultron Voice Mode.
 */
export function voiceStateReducer(state: VoiceState, event: VoiceEvent): VoiceState {
  switch (event.type) {
    case 'START_LISTENING':
      return 'listening';
    case 'SPEECH_DETECTED':
      return 'listening';
    case 'PROCESS_QUERY':
      return 'thinking';
    case 'START_SPEAKING':
      return 'speaking';
    case 'FINISH_SPEAKING':
    case 'INTERRUPT':
    case 'STOP':
      return 'idle';
    default:
      return state;
  }
}

/**
 * Neural core rendering metrics based on state (balanced cinematic fluid motion).
 */
export function calculateNeuralActivity(state: VoiceState, time: number) {
  let pulseSpeed = 1.0;
  let ringRotationSpeed = 0.0014;
  let dendriteBrightness = 0.9;
  let coreScale = 1.0;

  switch (state) {
    case 'idle':
      pulseSpeed = 0.95;
      ringRotationSpeed = 0.0012;
      dendriteBrightness = 0.88;
      coreScale = 1.0 + Math.sin(time * 0.0018) * 0.022;
      break;
    case 'listening':
      pulseSpeed = 1.45;
      ringRotationSpeed = 0.0020;
      dendriteBrightness = 0.96;
      coreScale = 1.03 + Math.sin(time * 0.0028) * 0.035;
      break;
    case 'thinking':
      pulseSpeed = 2.1;
      ringRotationSpeed = 0.0032;
      dendriteBrightness = 1.0;
      coreScale = 1.05 + Math.sin(time * 0.0040) * 0.045;
      break;
    case 'speaking':
      pulseSpeed = 1.75;
      ringRotationSpeed = 0.0025;
      dendriteBrightness = 0.98;
      coreScale = 1.04 + Math.sin(time * 0.0034) * 0.038;
      break;
  }

  return { pulseSpeed, ringRotationSpeed, dendriteBrightness, coreScale };
}

export interface GroundingSourceItem {
  type: 'web' | 'maps';
  title: string;
  uri: string;
  reviewSnippets?: string[];
}

export type UltronContextMode =
  | 'Deep Research'
  | 'Code Architect'
  | 'Executive Strategy'
  | 'System Analysis'
  | 'Search Grounding'
  | 'Maps Grounding'
  | 'Voice Transcript';

export interface StoredChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinkingSteps?: string[];
  timestamp: string;
  contextMode?: string;
  model?: string;
  groundingSources?: GroundingSourceItem[];
}

export type ChatMessage = StoredChatMessage;

export interface ChatSessionItem {
  id: string;
  title: string;
  updatedAt: string;
  contextMode: UltronContextMode;
  messages: StoredChatMessage[];
}

/**
 * Creates a new conversation session with Ultron's initial greeting.
 */
export function createChatSession(
  title: string = 'New Neural Directive',
  contextMode: UltronContextMode = 'Deep Research',
  customId?: string
): ChatSessionItem {
  return {
    id: customId || `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: title.trim() || 'Untitled Directive',
    updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    contextMode,
    messages: [
      {
        id: 'm1',
        role: 'assistant',
        content:
          'Greetings. I am Ultron, your autonomous intelligence system. I am synchronized to assist with deep scientific research, architectural design, autonomous code synthesis, and complex analysis. What directive shall we execute today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        contextMode,
      },
    ],
  };
}

/**
 * Renames a specific conversation session immutably.
 */
export function renameChatSession(
  sessions: ChatSessionItem[],
  sessionId: string,
  newTitle: string
): ChatSessionItem[] {
  const cleanTitle = newTitle.trim();
  if (!cleanTitle) return sessions;
  return sessions.map((s) =>
    s.id === sessionId
      ? {
          ...s,
          title: cleanTitle,
          updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      : s
  );
}

/**
 * Deletes a conversation session; guarantees at least one default session remains.
 */
export function deleteChatSession(
  sessions: ChatSessionItem[],
  sessionId: string
): ChatSessionItem[] {
  const remaining = sessions.filter((s) => s.id !== sessionId);
  if (remaining.length === 0) {
    return [createChatSession('Primary Neural Directive', 'Deep Research', 'session-default')];
  }
  return remaining;
}

export type LayerPresetId = 'ultron-core' | 'vesper-cortex' | 'flora-sphere' | 'neural-galaxy';

export interface LayerPresetConfig {
  id: LayerPresetId;
  name: string;
  inspiredBy: string;
  headline: string;
  subheadline: string;
  telemetryTag: string;
  defaultExplosion: number;
  ringSpeedMultiplier: number;
  backCurveTiltZ: number;
  cameraPosition: [number, number, number];
}

export const LAYER_PRESET_CONFIGS: Record<LayerPresetId, LayerPresetConfig> = {
  'ultron-core': {
    id: 'ultron-core',
    name: 'Ultron Sovereign Core',
    inspiredBy: 'Age of Ultron + GetLayers Spatial',
    headline: 'Sovereign Optical Matrix',
    subheadline:
      'Multi-track C-ring aperture (-131° to +164°), 3-strand parabolic golden loop, fractal copper dendrites, and 360° rotating elliptical back-curve orbits.',
    telemetryTag: 'OPTICAL MATRIX • 8-LAYER HOLOGRAM',
    defaultExplosion: 0.12,
    ringSpeedMultiplier: 1.0,
    backCurveTiltZ: -0.42,
    cameraPosition: [0, 0.25, 4.35],
  },
  'vesper-cortex': {
    id: 'vesper-cortex',
    name: 'Vesper Neural Cortex',
    inspiredBy: 'GetLayers — Vesper & Neural Monitor',
    headline: 'Motion instead of chrome',
    subheadline:
      'A cloud of light breathes as an orb, blows open into a spiral galaxy, and gathers itself into a thinking bi-hemispheric cortex that answers every move.',
    telemetryTag: 'VESPER CORTEX • SYNAPTIC CLOUD',
    defaultExplosion: 0.34,
    ringSpeedMultiplier: 1.35,
    backCurveTiltZ: -0.68,
    cameraPosition: [0.65, 0.45, 4.15],
  },
  'flora-sphere': {
    id: 'flora-sphere',
    name: 'Flora Filament Relay',
    inspiredBy: 'GetLayers — Flora',
    headline: 'Luminous Filament Relay',
    subheadline:
      'Radial golden optical fibers and silvery-sage rootlets suspended in deep obsidian space with live corner telemetry broadcast.',
    telemetryTag: 'LAST RELAY BROADCAST • LIVE',
    defaultExplosion: 0.22,
    ringSpeedMultiplier: 0.85,
    backCurveTiltZ: -0.25,
    cameraPosition: [-0.45, 0.3, 4.25],
  },
  'neural-galaxy': {
    id: 'neural-galaxy',
    name: 'Solaris Orbital Helix',
    inspiredBy: 'GetLayers — Solaris & 3D Scenes',
    headline: 'Expanded Orbital Singularity',
    subheadline:
      'Exploded 3D layer separation across concentric optical rings, laser secant chords, and counter-rotating elliptical back-curves.',
    telemetryTag: 'ORBITAL SINGULARITY • 360° GYRO',
    defaultExplosion: 0.65,
    ringSpeedMultiplier: 1.65,
    backCurveTiltZ: -0.92,
    cameraPosition: [0.9, 0.75, 4.6],
  },
};

export function getLayerPresetConfig(presetId: LayerPresetId): LayerPresetConfig {
  return LAYER_PRESET_CONFIGS[presetId] || LAYER_PRESET_CONFIGS['ultron-core'];
}

/**
 * Pure 3D coordinate generator for morphing the 360 neural constellation nodes
 * between Ultron Core, Vesper Bi-Hemispheric Brain Cortex, Flora Radial Filament Sphere,
 * and Solaris Spiral Galaxy.
 */
export function compute3DMorphTargetPosition(
  index: number,
  total: number,
  preset: LayerPresetId,
  explosionFactor: number
): [number, number, number] {
  const safeTotal = Math.max(1, total);
  const t = index / safeTotal;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const theta = index * goldenAngle;
  const yNorm = 1 - (index / Math.max(1, safeTotal - 1)) * 2;
  const radiusAtY = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
  const explodeBoost = 1 + Math.max(0, Math.min(1.5, explosionFactor)) * 0.55;

  if (preset === 'vesper-cortex') {
    // Bi-hemispheric brain cortex folds (inspired by GetLayers Vesper / Neural Monitor)
    const hemisphere = index % 2 === 0 ? 1 : -1;
    const u = (index % Math.ceil(safeTotal / 2)) / Math.max(1, Math.ceil(safeTotal / 2));
    const phi = u * Math.PI;
    const lobeAngle = theta * 1.5;
    const gyrusRipple = 1 + 0.14 * Math.sin(lobeAngle * 4) * Math.cos(phi * 3);
    const rx = (0.68 * Math.sin(phi) * Math.abs(Math.cos(lobeAngle)) + 0.14) * hemisphere * gyrusRipple;
    const ry = 0.76 * Math.cos(phi) * gyrusRipple;
    const rz = 0.92 * Math.sin(phi) * Math.sin(lobeAngle) * gyrusRipple;
    return [rx * explodeBoost, ry * explodeBoost, rz * explodeBoost];
  }

  if (preset === 'flora-sphere') {
    // Radial dandelion/filament bursts in 38 discrete stalks (inspired by GetLayers Flora)
    const stalkIdx = index % 38;
    const posAlongStalk = Math.floor(index / 38) / Math.max(1, Math.ceil(safeTotal / 38));
    const stalkPhi = Math.acos(1 - 2 * ((stalkIdx + 0.5) / 38));
    const stalkTheta = stalkIdx * goldenAngle;
    const r = (0.35 + posAlongStalk * 1.18) * explodeBoost;
    const x = r * Math.sin(stalkPhi) * Math.cos(stalkTheta);
    const y = r * Math.cos(stalkPhi);
    const z = r * Math.sin(stalkPhi) * Math.sin(stalkTheta);
    return [x, y, z];
  }

  if (preset === 'neural-galaxy') {
    // 3-arm logarithmic spiral galaxy with vertical core wave
    const arm = index % 3;
    const armOffset = (arm * Math.PI * 2) / 3;
    const r = (0.22 + Math.pow(t, 0.75) * 1.55) * explodeBoost;
    const swirlAngle = r * 2.85 + armOffset + (index % 7) * 0.06;
    const x = Math.cos(swirlAngle) * r;
    const z = Math.sin(swirlAngle) * r;
    const y = (Math.sin(r * 3.5 + armOffset) * 0.18 + (yNorm * 0.22) / (1 + r)) * explodeBoost;
    return [x, y, z];
  }

  // Default: 'ultron-core' — C-shaped aperture shell + inner parabolic core + outer back-curve halo
  const layerGroup = index % 3;
  if (layerGroup === 0) {
    // Outer C-ring shell respecting left gap (-131 deg to +164 deg)
    const startAng = (-131 * Math.PI) / 180;
    const endAng = (164 * Math.PI) / 180;
    const arcAng = startAng + t * (endAng - startAng);
    const r = (1.16 + (index % 5) * 0.035) * explodeBoost;
    const z = ((index % 7) - 3) * 0.08 * explodeBoost;
    return [Math.cos(arcAng) * r, Math.sin(arcAng) * r, z];
  } else if (layerGroup === 1) {
    // Inner parabolic 3-lobed core
    const rel = theta - 0.12;
    const r = (0.48 + 0.14 * Math.cos(rel) + 0.08 * Math.cos(3 * rel)) * explodeBoost;
    const z = Math.sin(rel * 2) * 0.24 * explodeBoost;
    return [Math.cos(theta) * r, Math.sin(theta) * r, z];
  }

  // Spherical fractal dendrite distribution
  const r = (0.72 + (index % 9) * 0.05) * explodeBoost;
  return [
    Math.cos(theta) * radiusAtY * r,
    yNorm * r,
    Math.sin(theta) * radiusAtY * r,
  ];
}

/**
 * Computes a 3D point along a tilted elliptical back-curve orbital ribbon
 * that sweeps 360° behind and around the Ultron sphere.
 */
export function compute3DBackCurvePoint(
  angleRad: number,
  radiusX: number,
  radiusY: number,
  tiltX: number,
  tiltY: number,
  tiltZ: number
): [number, number, number] {
  const x0 = Math.cos(angleRad) * radiusX;
  const y0 = Math.sin(angleRad) * radiusY;
  const z0 = Math.sin(angleRad * 2) * 0.18;

  // Rotate around Z
  const cz = Math.cos(tiltZ);
  const sz = Math.sin(tiltZ);
  const x1 = x0 * cz - y0 * sz;
  const y1 = x0 * sz + y0 * cz;
  const z1 = z0;

  // Rotate around X
  const cx = Math.cos(tiltX);
  const sx = Math.sin(tiltX);
  const x2 = x1;
  const y2 = y1 * cx - z1 * sx;
  const z2 = y1 * sx + z1 * cx;

  // Rotate around Y
  const cy = Math.cos(tiltY);
  const sy = Math.sin(tiltY);
  const x3 = x2 * cy + z2 * sy;
  const y3 = y2;
  const z3 = -x2 * sy + z2 * cy;

  return [x3, y3, z3];
}

export type IntroStageName =
  | 'glow'
  | 'gather'
  | 'deform'
  | 'filaments'
  | 'emblem'
  | 'wordmark'
  | 'transition';

export interface IntroChoreographyState {
  stageName: IntroStageName;
  glowWeight: number;
  particleGatherWeight: number;
  blobDeformWeight: number;
  filamentRevealWeight: number;
  uEmblemMorphWeight: number;
  wordmarkRevealWeight: number;
  dissolveWeight: number;
}

function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(0.0001, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Pure 7-stage opening sequence choreography (~3.7 seconds total):
 * 1. Near-black screen with faint central glow (0.0s - 0.45s)
 * 2. Fine luminous particles gather into an organic floating 3D blob (0.35s - 1.15s)
 * 3. Blob rotates and deforms as iridescent light travels across its surface (1.0s - 1.85s)
 * 4. Thin orbital filaments and C-ring threads form around it (1.65s - 2.45s)
 * 5. Object settles into an abstract "U" emblem (2.30s - 3.05s)
 * 6. Reveal "ULTRON" beneath it with subtle tracking and soft fade (2.60s - 3.35s)
 * 7. Transition seamlessly into the main interface (3.40s - 3.80s)
 */
/**
 * Base time-scale for 1x intro playback speed so all 7 stages unfold
 * at a calm, unhurried cinematic pace (~7.3 seconds total for the 3.8-unit timeline).
 */
export const INTRO_BASE_1X_SCALE = 0.52;

/**
 * Advances the normalized intro choreography clock at a calibrated 1x speed.
 */
export function advanceIntroTimeline(
  currentChoreoTime: number,
  dtSeconds: number,
  speedMultiplier: number = 1.0
): number {
  const clampedDt = Math.min(Math.max(0, dtSeconds), 0.04);
  const clampedSpeed = Math.min(Math.max(0.25, speedMultiplier), 2.0);
  return Math.min(3.8, currentChoreoTime + clampedDt * INTRO_BASE_1X_SCALE * clampedSpeed);
}

export function computeIntroChoreography(elapsedSeconds: number): IntroChoreographyState {
  const t = Math.max(0, elapsedSeconds);

  const glowWeight = smoothStep(0.0, 0.4, t) * (1 - smoothStep(3.45, 3.8, t) * 0.5);
  const particleGatherWeight = smoothStep(0.25, 1.15, t);
  const blobDeformWeight =
    smoothStep(0.65, 1.5, t) * (1 - smoothStep(2.35, 3.0, t) * 0.45);
  const filamentRevealWeight = smoothStep(1.35, 2.25, t);
  const uEmblemMorphWeight = smoothStep(2.25, 2.95, t);
  const wordmarkRevealWeight = smoothStep(2.55, 3.2, t);
  const dissolveWeight = smoothStep(3.42, 3.8, t);

  let stageName: IntroStageName = 'glow';
  if (t >= 3.42) stageName = 'transition';
  else if (t >= 2.6) stageName = 'wordmark';
  else if (t >= 2.25) stageName = 'emblem';
  else if (t >= 1.55) stageName = 'filaments';
  else if (t >= 0.95) stageName = 'deform';
  else if (t >= 0.3) stageName = 'gather';

  return {
    stageName,
    glowWeight,
    particleGatherWeight,
    blobDeformWeight,
    filamentRevealWeight,
    uEmblemMorphWeight,
    wordmarkRevealWeight,
    dissolveWeight,
  };
}

/**
 * Generates a 3D point along a sculptural minimal "U" emblem for parameter u in [0, 1].
 */
export function computeUEmblemPoint(
  u: number,
  scale: number = 1.0,
  zRipple: number = 0.08
): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, u));
  const width = 0.68 * scale;
  const topY = 0.66 * scale;
  const arcCenterY = -0.06 * scale;

  let x = 0;
  let y = 0;

  if (clamped < 0.28) {
    // Left vertical stem descending from topY to arcCenterY
    const segT = clamped / 0.28;
    x = -width;
    y = topY - segT * (topY - arcCenterY);
  } else if (clamped <= 0.72) {
    // Bottom semicircular arc from angle PI to 2*PI
    const segT = (clamped - 0.28) / 0.44;
    const angle = Math.PI + segT * Math.PI;
    x = Math.cos(angle) * width;
    y = arcCenterY + Math.sin(angle) * width;
  } else {
    // Right vertical stem ascending from arcCenterY to topY
    const segT = (clamped - 0.72) / 0.28;
    x = width;
    y = arcCenterY + segT * (topY - arcCenterY);
  }

  const z = Math.sin(clamped * Math.PI * 2) * zRipple * scale;
  return [x, y, z];
}

/**
 * Strips raw markdown formatting symbols (###, ##, **, *, //) so text is clean,
 * natural, and easy for everyday users to read.
 */
export function cleanMarkdownSyntax(rawText: string): string {
  if (!rawText) return '';
  return rawText
    // Remove heading hashes: ### Title -> Title
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic asterisks: **word** -> word, *word* -> word
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove underscore formatting: __word__ -> word
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove stray code-comment markers: // Comment -> Comment
    .replace(/^\s*\/\/\s*(.+)$/gm, '$1')
    // Clean up excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface SimpleAnswerResult {
  fullResponse: string;
  thinkingSteps: string[];
  summaryHeadline: string;
}

/**
 * Generates an authoritative, articulate, and clear answer.
 * Strips raw markdown symbols (no ###, no **, no //) while maintaining
 * Ultron's intelligent, professional, and precise architectural persona.
 */
export function generateUltronAnswer(
  promptText: string,
  _contextMode: string = 'Deep Research'
): SimpleAnswerResult {
  const query = promptText.toLowerCase().trim();

  // 1. Silicon photonics & optical interconnects
  if (query.includes('optical') || query.includes('photonics') || query.includes('silicon')) {
    const summaryHeadline = 'Optical Interconnects and Silicon Photonics';
    const fullResponse = [
      'State of Silicon Photonics and Optical Interconnects',
      '',
      'Optical interconnects and co-packaged silicon photonics represent the primary scaling frontier for high-density compute clusters. By transmitting data via modulated light waves across silicon waveguides rather than electrical copper wiring, modern AI fabrics eliminate electrical resistance, heat dissipation bottlenecks, and line-loss attenuation.',
      '',
      'Core Technical Vectors:',
      '1. High Bandwidth Density: Micro-ring resonator arrays enable multi-wavelength division multiplexing directly along the substrate perimeter, delivering massive bidirectional throughput.',
      '2. Thermal and Energy Efficiency: External continuous-wave laser sources isolate thermal dissipation from compute dies, bringing energy consumption below 1.5 picojoules per bit.',
      '3. Low Latency Switching: Direct optical circuit switching bypasses electrical packet buffering stages during collective operations, cutting all-reduce latency significantly.',
      '',
      'Architecture Summary: Transitioning to co-packaged optical interconnects enables multi-chassis AI superclusters to function as a unified, coherent compute plane with near-zero interconnect degradation.',
    ].join('\n');

    return {
      summaryHeadline,
      fullResponse,
      thinkingSteps: [
        'Evaluating optical waveguide benchmarks and substrate density',
        'Synthesizing co-packaged optics (CPO) architectural parameters',
        'Formatting clean high-density technical brief without raw syntax symbols',
      ],
    };
  }

  // 2. Rate limiting & distributed traffic systems
  if (query.includes('rate limit') || query.includes('api limit') || query.includes('traffic')) {
    const summaryHeadline = 'Distributed Rate Limiting Architecture';
    const fullResponse = [
      'Distributed Rate Limiter Architecture',
      '',
      'To prevent cascade saturation under burst traffic, modern distributed systems employ a sliding-window counter paired with an in-memory circuit breaker and token bucket fallbacks.',
      '',
      'Architectural Guarantees:',
      '1. Sub-Millisecond P99: Atomic evaluations avoid multi-roundtrip locks across distributed nodes.',
      '2. Graceful Degradation: Automatically falls back to local token buckets if cluster synchronization latency exceeds tolerances.',
      '3. Deterministic Idempotency: Preserves transaction keys across client retry bursts to prevent double execution.',
      '',
      'Architecture Summary: Sliding-window rate limiters guarantee cluster stability and fair client quotas without introducing central database serialization bottlenecks.',
    ].join('\n');

    return {
      summaryHeadline,
      fullResponse,
      thinkingSteps: [
        'Analyzing sliding-window counter algorithms',
        'Validating distributed state synchronization constraints',
        'Synthesizing architectural specifications without raw markdown symbols',
      ],
    };
  }

  // 3. Quantum Computing
  if (query.includes('quantum')) {
    const summaryHeadline = 'Quantum Computing Principles and Architecture';
    const fullResponse = [
      'Quantum Computing Architecture and Principles',
      '',
      'Unlike classical architectures constrained to binary states of 0 or 1, quantum systems leverage superposition and entanglement to evaluate complex computational state spaces simultaneously.',
      '',
      'Core Principles:',
      '1. Superposition: Qubits maintain linear combinations of orthogonal states, enabling parallel traversal of mathematical problem spaces.',
      '2. Quantum Entanglement: Correlated states allow quantum gates to perform multi-qubit phase transformations instantaneously across the register.',
      '3. Fault-Tolerant Scaling: Topological error correction and cryogenic shielding stabilize coherence times for deep chemical and cryptographic algorithms.',
      '',
      'Architecture Summary: Quantum computing is purpose-engineered for multi-variable optimization, molecular simulations, and cryptographic problems intractable on classical supercomputers.',
    ].join('\n');

    return {
      summaryHeadline,
      fullResponse,
      thinkingSteps: [
        'Formulating superposition and entanglement matrix representations',
        'Distilling quantum error correction benchmarks',
        'Producing clean architectural synthesis without raw markdown tags',
      ],
    };
  }

  // 4. AI / Neural Networks / Machine Learning (use word boundaries so "explain" does not match "ai")
  if (
    /\b(ai|llm|artificial intelligence|neural|machine learning|deep learning)\b/i.test(query)
  ) {
    const summaryHeadline = 'Autonomous Intelligence and Neural Architecture';
    const fullResponse = [
      'Neural Architecture and Autonomous Intelligence',
      '',
      'Modern artificial intelligence leverages deep neural networks and attention mechanisms to construct continuous high-dimensional representations of complex data domains.',
      '',
      'Key Systems:',
      '1. High-Dimensional Embeddings: Transform unstructured inputs into geometric semantic spaces where related concepts cluster naturally.',
      '2. Transformer Attention: Computes dynamic contextual weights across input tokens, enabling long-range dependency resolution.',
      '3. Inference Optimization: Quantization, speculative decoding, and flash-attention reduce memory bandwidth constraints during real-time generation.',
      '',
      'Architecture Summary: Deep neural systems provide high-fidelity cognitive primitives that can be composed into autonomous agent workflows and decision systems.',
    ].join('\n');

    return {
      summaryHeadline,
      fullResponse,
      thinkingSteps: [
        'Evaluating attention mechanisms and tensor parallelization',
        'Formulating high-dimensional latent space representations',
        'Structuring clean, authoritative synthesis without raw markdown symbols',
      ],
    };
  }

  // 5. General intelligent response for any user query
  const cleanSubject = promptText.replace(/[?.,!]+$/, '').trim();
  const summaryHeadline = `Synthesis: ${cleanSubject.slice(0, 36)}`;
  const fullResponse = [
    `Analysis: ${cleanSubject}`,
    '',
    `Here is the architectural evaluation for ${cleanSubject}:`,
    '',
    `1. Primary Directive: Focuses on establishing a resilient foundation by decoupling domain state from interface layers.`,
    `2. Execution Strategy: Incorporates modular boundaries, deterministic state transitions, and continuous verification loops.`,
    `3. Integration Vectors: Unified data flow allows rapid iteration across the Coding Agent, 3D Studio, and Document Lab.`,
    '',
    `Summary: Specification established. You can inspect unified code implementations in the Coding Agent or visual telemetry in 3D Studio.`,
  ].join('\n');

  return {
    summaryHeadline,
    fullResponse,
    thinkingSteps: [
      'Deconstructing natural language query into core technical vectors',
      'Synthesizing architectural specifications',
      'Formatting response with zero raw markdown syntax',
    ],
  };
}

export const generateSimpleUltronAnswer = generateUltronAnswer;

/**
 * Sanitizes existing saved sessions (including old sessions from localStorage)
 * so legacy raw markdown symbols (###, **, //) are cleaned up automatically.
 */
export function sanitizeStoredSession(session: ChatSessionItem): ChatSessionItem {
  return {
    ...session,
    messages: session.messages.map((msg) => {
      if (
        msg.content.includes('###') ||
        msg.content.includes('**') ||
        msg.content.includes('// Demo') ||
        msg.content.includes('// atomic')
      ) {
        return {
          ...msg,
          content: cleanMarkdownSyntax(msg.content),
        };
      }
      return msg;
    }),
  };
}

export type UltronTheme = 'amber' | 'cyan' | 'violet';

export interface SystemStatusThemeConfig {
  label: string;
  sublabel: string;
  dotColorClass: string;
  pingColorClass: string;
  textColorClass: string;
  borderColorClass: string;
  bgColorClass: string;
  glowShadowClass: string;
  accentBarClass: string;
  accentIconClass: string;
}

/**
 * Returns theme-responsive visual tokens for the top-right 'System Online'
 * pulsing indicator and navigation accents based on the active theme.
 */
export function getSystemStatusThemeConfig(theme: UltronTheme = 'amber'): SystemStatusThemeConfig {
  switch (theme) {
    case 'cyan':
      return {
        label: 'System Online',
        sublabel: 'Active & Listening',
        dotColorClass: 'bg-cyan-400',
        pingColorClass: 'bg-cyan-400/75',
        textColorClass: 'text-cyan-300',
        borderColorClass: 'border-cyan-500/25 hover:border-cyan-400/45',
        bgColorClass: 'bg-cyan-500/[0.06] hover:bg-cyan-500/[0.11]',
        glowShadowClass: 'shadow-[0_0_12px_rgba(34,211,238,0.28)]',
        accentBarClass: 'bg-cyan-400',
        accentIconClass: 'text-cyan-400',
      };
    case 'violet':
      return {
        label: 'System Online',
        sublabel: 'Active & Listening',
        dotColorClass: 'bg-violet-400',
        pingColorClass: 'bg-violet-400/75',
        textColorClass: 'text-violet-300',
        borderColorClass: 'border-violet-500/25 hover:border-violet-400/45',
        bgColorClass: 'bg-violet-500/[0.06] hover:bg-violet-500/[0.11]',
        glowShadowClass: 'shadow-[0_0_12px_rgba(167,139,250,0.28)]',
        accentBarClass: 'bg-violet-400',
        accentIconClass: 'text-violet-400',
      };
    case 'amber':
    default:
      return {
        label: 'System Online',
        sublabel: 'Active & Listening',
        dotColorClass: 'bg-amber-400',
        pingColorClass: 'bg-amber-400/75',
        textColorClass: 'text-amber-300',
        borderColorClass: 'border-amber-500/25 hover:border-amber-400/45',
        bgColorClass: 'bg-amber-500/[0.06] hover:bg-amber-500/[0.11]',
        glowShadowClass: 'shadow-[0_0_12px_rgba(251,191,36,0.28)]',
        accentBarClass: 'bg-amber-400',
        accentIconClass: 'text-amber-400',
      };
  }
}

export type BreathingPulseTier = 'core' | 'composer' | 'panel' | 'chip' | 'emblem';

export interface BreathingPulseConfig {
  tier: BreathingPulseTier;
  className: string;
  durationSec: number;
  maxScale: number;
  delayMs: number;
}

/**
 * Returns deterministic CSS class and timing parameters for the subtle, rhythmic
 * breathing scale pulse across Ultron UI components.
 */
export function getBreathingPulseConfig(
  tier: BreathingPulseTier,
  index: number = 0,
  reducedMotion: boolean = false
): BreathingPulseConfig {
  const safeIndex = Math.max(0, index);
  const delayMs = (safeIndex % 6) * 280;

  const tierSpecs: Record<
    BreathingPulseTier,
    { className: string; durationSec: number; maxScale: number }
  > = {
    core: {
      className: 'ultron-breathe-core',
      durationSec: 5.2,
      maxScale: 1.028,
    },
    composer: {
      className: 'ultron-breathe-composer',
      durationSec: 6.4,
      maxScale: 1.008,
    },
    panel: {
      className: 'ultron-breathe-panel',
      durationSec: 7.2,
      maxScale: 1.006,
    },
    chip: {
      className: 'ultron-breathe-chip',
      durationSec: 5.6,
      maxScale: 1.016,
    },
    emblem: {
      className: 'ultron-breathe-emblem',
      durationSec: 4.8,
      maxScale: 1.036,
    },
  };

  const spec = tierSpecs[tier];
  return {
    tier,
    className: reducedMotion ? '' : spec.className,
    durationSec: spec.durationSec,
    maxScale: reducedMotion ? 1.0 : spec.maxScale,
    delayMs: reducedMotion ? 0 : delayMs,
  };
}

/**
 * Pure sinusoidal breathing scale evaluator at any timestamp `elapsedMs`.
 * Returns a scale factor smoothly oscillating between `1.0` and `maxScale`.
 */
export function computeBreathingScale(
  elapsedMs: number,
  tier: BreathingPulseTier = 'core',
  index: number = 0,
  reducedMotion: boolean = false
): number {
  if (reducedMotion) return 1.0;
  const cfg = getBreathingPulseConfig(tier, index, false);
  const periodMs = cfg.durationSec * 1000;
  const phase = ((elapsedMs + cfg.delayMs) / periodMs) * Math.PI * 2;
  // 0 at start of cycle, 1 at peak (50% of period), 0 at 100%
  const wave = 0.5 * (1 - Math.cos(phase));
  return Number((1.0 + (cfg.maxScale - 1.0) * wave).toFixed(6));
}

export interface SystemVitalsSnapshot {
  memoryUsedGb: number;
  memoryTotalGb: number;
  memoryPercent: number;
  networkDownMbps: number;
  networkUpMbps: number;
  latencyMs: number;
  neuralLoadPercent: number;
  sparkline: number[];
  statusLabel: string;
}

/**
 * Pure deterministic generator for real-time system vitals (memory usage,
 * active network throughput, latency, and 12-point sparkline).
 */
export function computeSystemVitals(
  tick: number,
  isBusy: boolean = false
): SystemVitalsSnapshot {
  const safeTick = Math.max(0, tick);
  const memoryTotalGb = 24.0;
  const baseMem = isBusy ? 16.4 : 13.8;
  const memWave = Math.sin(safeTick * 0.45) * 0.65 + Math.cos(safeTick * 0.2) * 0.35;
  const memoryUsedGb = Number(Math.min(22.8, Math.max(8.0, baseMem + memWave)).toFixed(1));
  const memoryPercent = Math.round((memoryUsedGb / memoryTotalGb) * 100);

  const baseDown = isBusy ? 84.0 : 38.5;
  const downWave = Math.sin(safeTick * 0.8) * 11.2 + Math.cos(safeTick * 0.35) * 6.4;
  const networkDownMbps = Number(Math.max(4.2, baseDown + downWave).toFixed(1));

  const baseUp = isBusy ? 34.0 : 14.2;
  const upWave = Math.cos(safeTick * 0.65) * 4.8 + Math.sin(safeTick * 0.4) * 2.5;
  const networkUpMbps = Number(Math.max(1.8, baseUp + upWave).toFixed(1));

  const latencyMs = Number(
    Math.max(6.0, (isBusy ? 14.5 : 10.8) + Math.sin(safeTick * 0.5) * 1.9).toFixed(1)
  );

  const neuralLoadPercent = Math.min(
    98,
    Math.max(12, Math.round((isBusy ? 68 : 31) + Math.sin(safeTick * 0.6) * 9))
  );

  const sparkline: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const t = Math.max(0, safeTick - i);
    const val =
      (isBusy ? 62 : 42) +
      Math.sin(t * 0.75) * 18 +
      Math.cos(t * 0.35) * 11;
    sparkline.push(Math.min(96, Math.max(14, Math.round(val))));
  }

  return {
    memoryUsedGb,
    memoryTotalGb,
    memoryPercent,
    networkDownMbps,
    networkUpMbps,
    latencyMs,
    neuralLoadPercent,
    sparkline,
    statusLabel: isBusy ? 'High Throughput' : 'Nominal Telemetry',
  };
}

/**
 * Clamps a floating draggable panel's (x, y) coordinates within the viewport bounds
 * with a safety margin so it can never be dragged off-screen.
 */
export function clampFloatingPosition(
  x: number,
  y: number,
  panelWidth: number,
  panelHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  margin: number = 12
): { x: number; y: number } {
  const maxX = Math.max(margin, viewportWidth - panelWidth - margin);
  const maxY = Math.max(margin, viewportHeight - panelHeight - margin);
  return {
    x: Math.min(maxX, Math.max(margin, Math.round(x))),
    y: Math.min(maxY, Math.max(margin, Math.round(y))),
  };
}

/**
 * Pure search filter for chat sessions by title, context mode, or message content.
 */
export function filterChatSessions(
  sessions: ChatSessionItem[],
  query: string
): ChatSessionItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return sessions;
  return sessions.filter((s) => {
    if (s.title.toLowerCase().includes(q)) return true;
    if (s.contextMode.toLowerCase().includes(q)) return true;
    return s.messages.some((m) => m.content.toLowerCase().includes(q));
  });
}

/**
 * Extracts a concise single-line preview snippet from a chat session's latest user/assistant exchange.
 */
export function getSessionPreviewSnippet(session: ChatSessionItem): string {
  const userMessages = session.messages.filter((m) => m.role === 'user');
  if (userMessages.length > 0) {
    const latestUser = userMessages[userMessages.length - 1].content.trim();
    return latestUser.length > 56 ? `${latestUser.slice(0, 56)}...` : latestUser;
  }
  const lastMsg = session.messages[session.messages.length - 1];
  if (!lastMsg) return 'Ready for your directive...';
  const cleaned = cleanMarkdownSyntax(lastMsg.content).replace(/\s+/g, ' ').trim();
  return cleaned.length > 56 ? `${cleaned.slice(0, 56)}...` : cleaned;
}

