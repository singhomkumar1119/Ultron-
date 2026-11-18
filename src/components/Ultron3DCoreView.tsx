import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  Sparkles,
  RotateCcw,
  Eye,
  Sliders,
  Compass,
  Volume2,
  ChevronDown,
  ChevronUp,
  Layers,
  Sun,
} from 'lucide-react';
import { ultronVoiceEngine } from '../utils/ultronVoiceEngine';

export type OrbModelId = 'ultron-core' | 'jarvis-matrix' | 'synaptic-iris' | 'solaris-helix';

interface OrbModelSpec {
  id: OrbModelId;
  name: string;
  code: string;
}

const ORB_MODELS: OrbModelSpec[] = [
  { id: 'ultron-core', name: 'Ultron Sovereign Core', code: 'OPTICAL MATRIX' },
  { id: 'jarvis-matrix', name: 'Vesper Neural Cortex', code: 'SYNAPTIC GRID' },
  { id: 'synaptic-iris', name: 'Flora Filament Relay', code: 'DENDRITE CORE' },
  { id: 'solaris-helix', name: 'Solaris Orbital Helix', code: 'CAUSTIC RING' },
];

interface OrbThemeSpec {
  id: 'amber' | 'cyan' | 'violet';
  name: string;
  coreColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentCyan: string;
}

const ORB_THEMES: OrbThemeSpec[] = [
  {
    id: 'amber',
    name: 'Ultron Molten Copper & Gold',
    coreColor: '#ffe885',
    primaryColor: '#f59e0b',
    secondaryColor: '#d94e0f',
    accentCyan: '#7e9992',
  },
  {
    id: 'cyan',
    name: 'Cobalt Cryo Matrix',
    coreColor: '#e0f2fe',
    primaryColor: '#38bdf8',
    secondaryColor: '#0284c7',
    accentCyan: '#a5f3fc',
  },
  {
    id: 'violet',
    name: 'Quantum Violet Singularity',
    coreColor: '#f3e8ff',
    primaryColor: '#c084fc',
    secondaryColor: '#9333ea',
    accentCyan: '#f0abfc',
  },
];

interface Ultron3DCoreViewProps {
  theme?: 'amber' | 'cyan' | 'violet';
  onChangeTheme?: (theme: 'amber' | 'cyan' | 'violet') => void;
  bloomIntensity?: number;
  onChangeBloomIntensity?: (value: number) => void;
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Creates a soft circular additive glow sprite texture for pinpoint ember nodes
 */
function createPinpointGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 250, 225, 1.0)');
    grad.addColorStop(0.22, 'rgba(255, 195, 85, 0.85)');
    grad.addColorStop(0.55, 'rgba(215, 78, 12, 0.28)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Loads the user's attached reference image (`preview.webp` / `WhatsApp_Image_2026-11-04_at_4.41.51_PM_795f87bc.jpeg`)
 * and extracts 3 concentric radial depth bands (Inner Core, Mid Fractal Dendrites, Outer C-Ring & Back Curves)
 * with black background key-out and radial alpha feathering so they form true 3D volumetric hologram shells.
 */
function createReferenceDepthShellTextures(
  onLoaded: (shells: THREE.CanvasTexture[]) => void
): void {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const size = 1024;
    // In the 516x581 reference image, the orb center is (258, 326) with radius ~238px
    const cropSize = 486;
    const sx = Math.max(0, 258 - cropSize / 2);
    const sy = Math.max(0, 326 - cropSize / 2);

    const bands: Array<[number, number]> = [
      [0.0, 0.44], // Shell 0: Inner dark void + woven core + inner parabolic loop
      [0.24, 0.82], // Shell 1: Dense copper-orange fractal dendrites + secant chords + parabolic apex
      [0.66, 1.0], // Shell 2: Outer multi-track golden C-ring + silvery-sage rootlets + back orbits
    ];

    const textures: THREE.CanvasTexture[] = bands.map(([rMin, rMax]) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          img,
          sx,
          sy,
          cropSize,
          Math.min(cropSize, img.height - sy),
          0,
          0,
          size,
          size
        );
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;
        const half = size / 2;

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const dx = (x - half) / half;
            const dy = (y - half) / half;
            const r = Math.hypot(dx, dy);
            const idx = (y * size + x) * 4;

            if (r < rMin || r > rMax || r > 0.98) {
              data[idx + 3] = 0;
              continue;
            }

            // Feather radial band edges smoothly
            let radialMask = 1.0;
            if (rMin > 0 && r < rMin + 0.1) {
              radialMask = (r - rMin) / 0.1;
            }
            if (r > rMax - 0.1) {
              radialMask = Math.min(radialMask, (rMax - r) / 0.1);
            }

            const red = data[idx];
            const green = data[idx + 1];
            const blue = data[idx + 2];
            const luma = 0.299 * red + 0.587 * green + 0.114 * blue;

            // Key out near-black compression artifacts while boosting copper/gold luminosity
            const cleanAlpha =
              luma < 14 ? 0 : Math.min(255, Math.pow((luma - 14) / 241, 0.82) * 255);
            // Slightly enrich warm copper/gold saturation
            data[idx] = Math.min(255, Math.round(red * 1.12));
            data[idx + 1] = Math.min(255, Math.round(green * 1.06));
            data[idx + 3] = Math.round(cleanAlpha * radialMask);
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      return tex;
    });

    onLoaded(textures);
  };
  img.src = '/assets/aistudio/WhatsApp_Image_2026-11-04_at_4.41.51_PM_795f87bc.jpeg';
}

/**
 * Helper to push an organic, multi-segment crooked line between two 3D points
 * so dendrites look like real curved neural roots rather than straight sticks.
 */
function pushOrganicCurvedBranch(
  out: number[],
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  subdivisions: number,
  jitterAmp: number,
  rand: () => number
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular vector in XY plane for lateral organic wiggle
  const px = -dy / len;
  const py = dx / len;

  let prevX = x0;
  let prevY = y0;
  let prevZ = z0;

  // Deterministic harmonic wave + micro-jitter along the branch
  const phase = rand() * Math.PI * 2;
  const bendSign = rand() > 0.5 ? 1 : -1;

  for (let s = 1; s <= subdivisions; s++) {
    const t = s / subdivisions;
    let nx = x0 + dx * t;
    let ny = y0 + dy * t;
    let nz = z0 + (z1 - z0) * t;

    if (s < subdivisions) {
      const envelope = Math.sin(t * Math.PI);
      const lateralOffset =
        (Math.sin(t * Math.PI * 2 + phase) * 0.65 * bendSign + (rand() - 0.5) * 0.9) *
        jitterAmp *
        envelope;
      nx += px * lateralOffset;
      ny += py * lateralOffset;
      nz += (rand() - 0.5) * jitterAmp * 0.45 * envelope;
    }

    out.push(prevX, prevY, prevZ, nx, ny, nz);
    prevX = nx;
    prevY = ny;
    prevZ = nz;
  }
}

export const Ultron3DCoreView: React.FC<Ultron3DCoreViewProps> = ({
  theme = 'amber',
  onChangeTheme,
  bloomIntensity,
  onChangeBloomIntensity,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedModel, setSelectedModel] = useState<OrbModelId>('ultron-core');
  const [explodeDepth, setExplodeDepth] = useState<number>(0.14);
  const [backOrbitSpeed, setBackOrbitSpeed] = useState<number>(1.0);
  const [localBloom, setLocalBloom] = useState<number>(0.35);
  const [cameraPreset, setCameraPreset] = useState<'front' | 'angled' | 'macro' | 'top'>('front');
  const [hudMinimized, setHudMinimized] = useState<boolean>(false);

  const activeBloom = bloomIntensity !== undefined ? bloomIntensity : localBloom;
  const handleBloomChange = (val: number) => {
    setLocalBloom(val);
    onChangeBloomIntensity?.(val);
  };

  const explodeRef = useRef(explodeDepth);
  explodeRef.current = explodeDepth;

  const orbitSpeedRef = useRef(backOrbitSpeed);
  orbitSpeedRef.current = backOrbitSpeed;

  const bloomRef = useRef(activeBloom);
  bloomRef.current = activeBloom;

  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);

  const activeTheme = ORB_THEMES.find((t) => t.id === theme) || ORB_THEMES[0];
  const activeModel = ORB_MODELS.find((m) => m.id === selectedModel) || ORB_MODELS[0];

  const applyCameraPreset = (preset: 'front' | 'angled' | 'macro' | 'top') => {
    setCameraPreset(preset);
    if (!cameraRef.current || !controlsRef.current) return;

    if (preset === 'front') {
      targetCamPosRef.current = new THREE.Vector3(0, 0, 2.88);
    } else if (preset === 'angled') {
      targetCamPosRef.current = new THREE.Vector3(1.28, 0.72, 2.48);
    } else if (preset === 'macro') {
      targetCamPosRef.current = new THREE.Vector3(0.24, 0.12, 1.55);
    } else if (preset === 'top') {
      targetCamPosRef.current = new THREE.Vector3(0, 2.55, 1.05);
    }
    targetLookAtRef.current = new THREE.Vector3(0, -0.05, 0);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h' || e.key === 'H') {
        setHudMinimized((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#020101');
    scene.fog = new THREE.FogExp2('#020101', 0.14);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 2.88);
    cameraRef.current = camera;

    // 2. WebGLRenderer & Post-Processing EffectComposer (UnrealBloomPass)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      bloomRef.current * 0.42,
      0.28, // restrained radius so fine tracks don't blur into glare
      0.62 // high threshold so only bright golden caustics get a delicate halo
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // 3. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.85;
    controls.maxDistance = 5.5;
    controls.minDistance = 0.85;
    controls.target.set(0, -0.05, 0);
    controls.update();
    const cancelCamPresetOnInteract = () => {
      targetCamPosRef.current = null;
      targetLookAtRef.current = null;
    };
    controls.addEventListener('start', cancelCamPresetOnInteract);
    controlsRef.current = controls;

    // 4. Palette setup matching preview.webp (fiery copper-orange, molten gold, warm amber, silvery-sage)
    const isUltronDefault = theme === 'amber' && selectedModel === 'ultron-core';
    const goldBrightColor = new THREE.Color(isUltronDefault ? '#ffe885' : activeTheme.coreColor);
    const goldMidColor = new THREE.Color(isUltronDefault ? '#f59e0b' : activeTheme.primaryColor);
    const copperTrunkColor = new THREE.Color(isUltronDefault ? '#d94e0f' : activeTheme.secondaryColor);
    const copperDeepColor = new THREE.Color(isUltronDefault ? '#9e2a04' : activeTheme.secondaryColor);
    const sageTipColor = new THREE.Color(isUltronDefault ? '#7e9992' : activeTheme.accentCyan);
    const chordGoldColor = new THREE.Color(isUltronDefault ? '#e5b869' : activeTheme.coreColor);

    const disposableGeometries: THREE.BufferGeometry[] = [];
    const disposableMaterials: THREE.Material[] = [];
    const disposableTextures: THREE.Texture[] = [];

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const rand = seededRandom(
      selectedModel === 'ultron-core'
        ? 20150501
        : selectedModel === 'jarvis-matrix'
          ? 20080502
          : selectedModel === 'synaptic-iris'
            ? 304919
            : 908172
    );

    // =========================================================================
    // LAYER 1: 3-DEPTH VOLUMETRIC REFERENCE HOLOGRAM SHELLS
    // Provides 100% authentic ultra-fine neural filament density from preview.webp
    // sliced into 3 concentric 3D depth planes that separate along Z.
    // =========================================================================
    const holoShellsGroup = new THREE.Group();
    rootGroup.add(holoShellsGroup);
    const shellMeshes: THREE.Mesh[] = [];

    if (selectedModel === 'ultron-core') {
      createReferenceDepthShellTextures((textures) => {
        // Scale 1.14 aligns the cropped reference image's C-ring radius (0.79 * 1.14 = 0.90)
        // 1:1 with the 3D procedural C-ring tracks (r = 0.855 to 0.942)
        const shellRadii = [1.14, 1.14, 1.14];
        const shellOpacities = [0.76, 0.72, 0.62];
        textures.forEach((tex, idx) => {
          disposableTextures.push(tex);
          const geo = new THREE.PlaneGeometry(shellRadii[idx] * 2, shellRadii[idx] * 2, 28, 28);
          // Subtle spherical dome curvature on each hologram shell
          const pos = geo.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            const px = pos.getX(i);
            const py = pos.getY(i);
            const r2 = px * px + py * py;
            const domeZ = (idx - 1) * 0.04 + Math.cos(Math.min(Math.PI / 2, r2 * 1.1)) * 0.045;
            pos.setZ(i, domeZ);
          }
          pos.needsUpdate = true;
          disposableGeometries.push(geo);

          const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: shellOpacities[idx],
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
          disposableMaterials.push(mat);

          const mesh = new THREE.Mesh(geo, mat);
          holoShellsGroup.add(mesh);
          shellMeshes.push(mesh);
        });
      });
    }

    // =========================================================================
    // LAYER 2: CENTRAL DARK VOID & WOVEN COPPER-GOLD TORUS PUPIL (r = 0.13 - 0.21)
    // =========================================================================
    const coreVoidGroup = new THREE.Group();
    rootGroup.add(coreVoidGroup);

    // Deep obsidian spherical occlusion core so the pupil stays pitch-dark
    const voidGeo = new THREE.SphereGeometry(0.122, 32, 32);
    const voidMat = new THREE.MeshBasicMaterial({ color: '#020101' });
    disposableGeometries.push(voidGeo);
    disposableMaterials.push(voidMat);
    coreVoidGroup.add(new THREE.Mesh(voidGeo, voidMat));

    // Woven copper-gold filament loops around the dark pupil
    const pupilWovenVerts: number[] = [];
    const pupilAccentVerts: number[] = [];
    for (let strand = 0; strand < 7; strand++) {
      const baseR = 0.145 + (strand % 3) * 0.022;
      const steps = 140;
      const phase = strand * 0.92;
      for (let s = 0; s < steps; s++) {
        // Segmented hairline strokes
        if (s % 9 === 0) continue;
        const a0 = (s / steps) * Math.PI * 2;
        const a1 = ((s + 1) / steps) * Math.PI * 2;
        const r0 = baseR + Math.sin(a0 * 5 + phase) * 0.016 + Math.cos(a0 * 3 - phase) * 0.01;
        const r1 = baseR + Math.sin(a1 * 5 + phase) * 0.016 + Math.cos(a1 * 3 - phase) * 0.01;
        const z0 = Math.cos(a0 * 4 + phase) * 0.028;
        const z1 = Math.cos(a1 * 4 + phase) * 0.028;

        const targetArr = strand % 2 === 0 ? pupilWovenVerts : pupilAccentVerts;
        targetArr.push(
          Math.cos(a0) * r0,
          Math.sin(a0) * r0,
          z0,
          Math.cos(a1) * r1,
          Math.sin(a1) * r1,
          z1
        );
      }
    }

    const pupilGeo = new THREE.BufferGeometry();
    pupilGeo.setAttribute('position', new THREE.Float32BufferAttribute(pupilWovenVerts, 3));
    const pupilMat = new THREE.LineBasicMaterial({
      color: copperTrunkColor,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
    });
    disposableGeometries.push(pupilGeo);
    disposableMaterials.push(pupilMat);
    coreVoidGroup.add(new THREE.LineSegments(pupilGeo, pupilMat));

    const pupilGoldGeo = new THREE.BufferGeometry();
    pupilGoldGeo.setAttribute('position', new THREE.Float32BufferAttribute(pupilAccentVerts, 3));
    const pupilGoldMat = new THREE.LineBasicMaterial({
      color: goldMidColor,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
    });
    disposableGeometries.push(pupilGoldGeo);
    disposableMaterials.push(pupilGoldMat);
    coreVoidGroup.add(new THREE.LineSegments(pupilGoldGeo, pupilGoldMat));

    // =========================================================================
    // LAYER 3: CONCENTRIC SEGMENTED TECHNICAL RINGS (r = 0.25 to 0.83)
    // =========================================================================
    const techRingsGroup = new THREE.Group();
    rootGroup.add(techRingsGroup);

    const techRingRadii = [0.24, 0.31, 0.39, 0.48, 0.58, 0.69, 0.82];
    techRingRadii.forEach((radius, idx) => {
      const segs = 140 + idx * 20;
      const ringVerts: number[] = [];
      const zOff = (idx - 3) * 0.015;
      for (let s = 0; s < segs; s++) {
        // Micro-segmented technical arc dashes
        if (s % 6 === 0 || (idx % 2 === 0 && s % 13 < 3)) continue;
        const a0 = (s / segs) * Math.PI * 2;
        const a1 = ((s + 0.85) / segs) * Math.PI * 2;

        // Respect the open-left aperture gap on outer rings
        const deg = ((a0 * 180) / Math.PI + 360) % 360;
        if (radius > 0.42 && deg > 132 && deg < 190 && s % 2 === 0) continue;

        ringVerts.push(
          Math.cos(a0) * radius,
          Math.sin(a0) * radius,
          zOff,
          Math.cos(a1) * radius,
          Math.sin(a1) * radius,
          zOff
        );
      }
      const rGeo = new THREE.BufferGeometry();
      rGeo.setAttribute('position', new THREE.Float32BufferAttribute(ringVerts, 3));
      const rMat = new THREE.LineBasicMaterial({
        color: idx % 2 === 0 ? goldMidColor : copperTrunkColor,
        transparent: true,
        opacity: idx === 2 || idx === 6 ? 0.42 : 0.24,
        blending: THREE.AdditiveBlending,
      });
      disposableGeometries.push(rGeo);
      disposableMaterials.push(rMat);
      const ringLine = new THREE.LineSegments(rGeo, rMat);
      ringLine.userData = { speed: (idx % 2 === 0 ? 1 : -1) * (0.04 + idx * 0.012) };
      techRingsGroup.add(ringLine);
    });

    // =========================================================================
    // LAYER 4: TILTED 3-STRAND PARABOLIC / ROUNDED-TRIANGULAR GOLDEN LOOP
    // Matches the exact asymmetric rounded-triangular / parabolic golden caustic
    // in preview.webp: bright golden-white at top crown (12:00) and right apex (-14° / 3:30),
    // and broken/delicate on the left side where the straight secant chords cross.
    // =========================================================================
    const parabolicGroup = new THREE.Group();
    rootGroup.add(parabolicGroup);

    const apexAngle = (-14 * Math.PI) / 180; // 3:30 clock position in +Y up
    const paraBrightVerts: number[] = [];
    const paraAmberVerts: number[] = [];
    const paraCopperVerts: number[] = [];

    for (let strand = 0; strand < 6; strand++) {
      const steps = 240;
      const rOffset = (strand - 2.5) * 0.011;
      const zShift = (strand - 2.5) * 0.012;

      for (let s = 0; s < steps; s++) {
        const t0 = (s / steps) * Math.PI * 2;
        const t1 = ((s + 1) / steps) * Math.PI * 2;
        const rel0 = t0 - apexAngle;
        const rel1 = t1 - apexAngle;

        // In preview.webp, the left side of the parabolic loop (around rel ≈ π) is broken/delicate
        const leftBreak = Math.cos(rel0); // +1 at right apex, -1 at left side
        if (leftBreak < -0.35 && (s + strand * 3) % 5 < 3) continue;
        // Micro-segmented caustic texture all around
        if ((s + strand * 7) % 11 === 0) continue;

        const r0 =
          0.435 +
          rOffset +
          0.165 * Math.cos(rel0) +
          0.088 * Math.cos(3 * rel0) +
          0.024 * Math.sin(2 * rel0 + strand * 0.5);
        const r1 =
          0.435 +
          rOffset +
          0.165 * Math.cos(rel1) +
          0.088 * Math.cos(3 * rel1) +
          0.024 * Math.sin(2 * rel1 + strand * 0.5);

        const z0 = zShift + Math.sin(rel0 * 2 + strand * 0.4) * 0.042;
        const z1 = zShift + Math.sin(rel1 * 2 + strand * 0.4) * 0.042;

        const x0 = Math.cos(t0) * r0;
        const y0 = Math.sin(t0) * r0;
        const x1 = Math.cos(t1) * r1;
        const y1 = Math.sin(t1) * r1;

        // Top crown (~85°), right apex (~-14°), and bottom-right (~-70°) are hottest golden-white
        const isHotZone =
          leftBreak > 0.25 || Math.sin(t0) > 0.65 || (Math.sin(t0) < -0.5 && Math.cos(t0) > -0.2);

        if (strand <= 1 && isHotZone) {
          paraBrightVerts.push(x0, y0, z0, x1, y1, z1);
        } else if (strand <= 3) {
          paraAmberVerts.push(x0, y0, z0, x1, y1, z1);
        } else {
          paraCopperVerts.push(x0, y0, z0, x1, y1, z1);
        }
      }
    }

    const paraBrightGeo = new THREE.BufferGeometry();
    paraBrightGeo.setAttribute('position', new THREE.Float32BufferAttribute(paraBrightVerts, 3));
    const paraBrightMat = new THREE.LineBasicMaterial({
      color: goldBrightColor,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
    });
    disposableGeometries.push(paraBrightGeo);
    disposableMaterials.push(paraBrightMat);
    parabolicGroup.add(new THREE.LineSegments(paraBrightGeo, paraBrightMat));

    const paraAmberGeo = new THREE.BufferGeometry();
    paraAmberGeo.setAttribute('position', new THREE.Float32BufferAttribute(paraAmberVerts, 3));
    const paraAmberMat = new THREE.LineBasicMaterial({
      color: goldMidColor,
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
    });
    disposableGeometries.push(paraAmberGeo);
    disposableMaterials.push(paraAmberMat);
    parabolicGroup.add(new THREE.LineSegments(paraAmberGeo, paraAmberMat));

    const paraCopperGeo = new THREE.BufferGeometry();
    paraCopperGeo.setAttribute('position', new THREE.Float32BufferAttribute(paraCopperVerts, 3));
    const paraCopperMat = new THREE.LineBasicMaterial({
      color: copperTrunkColor,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
    });
    disposableGeometries.push(paraCopperGeo);
    disposableMaterials.push(paraCopperMat);
    parabolicGroup.add(new THREE.LineSegments(paraCopperGeo, paraCopperMat));

    // =========================================================================
    // LAYER 5: STRAIGHT PRECISION SECANT LASER CHORDS
    // Exact secant lines visible in preview.webp:
    // - Double parallel near-vertical secant chords on the left of the central pupil
    // - Diagonal rays from the 10:30 upper-left jaw (+131°) through the core
    // - Lower-left (-115°) to right-apex (-14°) chords
    // =========================================================================
    const chordsGroup = new THREE.Group();
    rootGroup.add(chordsGroup);

    const chordPairsDeg: Array<[number, number, number, number, number]> = [
      // [angle1Deg, r1, angle2Deg, r2, zOffset]
      // Double parallel secant chords slicing down the left of the pupil
      [110, 0.66, -118, 0.78, 0.032],
      [113, 0.64, -115, 0.76, 0.028],
      // Secondary crossing chord from top-left to bottom-center-left
      [126, 0.82, -98, 0.78, 0.022],
      [129, 0.84, -76, 0.74, 0.018],
      // Upper-left jaw (+131°) tangential & inward rays
      [131, 0.88, -14, 0.68, 0.025],
      [134, 0.92, -38, 0.76, -0.015],
      [142, 0.96, -54, 0.62, -0.02],
      // Lower-left to right-apex secants
      [-124, 0.68, -12, 0.72, 0.02],
      [-121, 0.66, -15, 0.70, 0.016],
      // Upper-center crown to lower-right chord
      [82, 0.48, -32, 0.72, -0.022],
      // Subtle radial measurement hairlines
      [52, 0.22, 52, 0.84, -0.01],
      [-64, 0.22, -64, 0.84, -0.01],
      [18, 0.24, 18, 0.84, -0.01],
    ];

    const chordVerts: number[] = [];
    chordPairsDeg.forEach(([deg1, r1, deg2, r2, zOff]) => {
      const a1 = (deg1 * Math.PI) / 180;
      const a2 = (deg2 * Math.PI) / 180;
      chordVerts.push(
        Math.cos(a1) * r1,
        Math.sin(a1) * r1,
        zOff,
        Math.cos(a2) * r2,
        Math.sin(a2) * r2,
        -zOff
      );
    });

    const chordsGeo = new THREE.BufferGeometry();
    chordsGeo.setAttribute('position', new THREE.Float32BufferAttribute(chordVerts, 3));
    const chordsMat = new THREE.LineBasicMaterial({
      color: chordGoldColor,
      transparent: true,
      opacity: 0.56,
      blending: THREE.AdditiveBlending,
    });
    disposableGeometries.push(chordsGeo);
    disposableMaterials.push(chordsMat);
    chordsGroup.add(new THREE.LineSegments(chordsGeo, chordsMat));

    // =========================================================================
    // LAYER 6: ORGANIC CURVED COPPER-ORANGE FRACTAL DENDRITES & SILVERY-SAGE ROOTLETS
    // Subdivided with midpoint curvature and multi-strand bundling so they look
    // like fiery, crooked neural roots rather than straight sticks.
    // =========================================================================
    const dendritesGroup = new THREE.Group();
    rootGroup.add(dendritesGroup);

    const trunkBrightVerts: number[] = [];
    const branchDeepVerts: number[] = [];
    const sageRootletVerts: number[] = [];
    const emberNodePositions: number[] = [];

    const treeCount = 86;
    for (let i = 0; i < treeCount; i++) {
      const baseAngle = (i / treeCount) * Math.PI * 2 + (rand() - 0.5) * 0.04;
      const deg = ((baseAngle * 180) / Math.PI + 360) % 360;

      // In preview.webp, the open left gap (132° to 188°) has shorter recessed copper tendrils
      const inLeftGap = deg > 132 && deg < 188;
      if (inLeftGap && rand() < 0.42) continue;

      const r0 = 0.18 + rand() * 0.07;
      const r1 = inLeftGap ? 0.33 + rand() * 0.11 : 0.38 + rand() * 0.13;
      const a1 = baseAngle + (rand() - 0.5) * 0.14;
      const z0 = (rand() - 0.5) * 0.07;
      const z1 = z0 + (rand() - 0.5) * 0.09;

      const x0 = Math.cos(baseAngle) * r0;
      const y0 = Math.sin(baseAngle) * r0;
      const x1 = Math.cos(a1) * r1;
      const y1 = Math.sin(a1) * r1;

      // Multi-strand curved primary trunk (2 slightly offset organic filaments for thickness)
      pushOrganicCurvedBranch(trunkBrightVerts, x0, y0, z0, x1, y1, z1, 5, 0.022, rand);
      pushOrganicCurvedBranch(
        branchDeepVerts,
        x0 + 0.004,
        y0 - 0.004,
        z0,
        x1 - 0.004,
        y1 + 0.004,
        z1,
        5,
        0.026,
        rand
      );

      // Generation 2: 2 to 3 crooked copper-orange forks
      const forks2 = inLeftGap ? 2 : 2 + Math.floor(rand() * 2);
      for (let b = 0; b < forks2; b++) {
        const spread2 = (b - (forks2 - 1) / 2) * (0.11 + rand() * 0.08) + (rand() - 0.5) * 0.05;
        const a2 = a1 + spread2;
        const r2 = inLeftGap ? r1 + 0.09 + rand() * 0.09 : 0.56 + rand() * 0.14;
        const z2 = z1 + (rand() - 0.5) * 0.11;

        const x2 = Math.cos(a2) * r2;
        const y2 = Math.sin(a2) * r2;

        pushOrganicCurvedBranch(trunkBrightVerts, x1, y1, z1, x2, y2, z2, 5, 0.024, rand);
        // Cross-webbing filament between adjacent dendrites
        if (b === 0 && rand() < 0.45) {
          const bridgeAngle = a2 + 0.09;
          const bx = Math.cos(bridgeAngle) * (r2 * 0.92);
          const by = Math.sin(bridgeAngle) * (r2 * 0.92);
          pushOrganicCurvedBranch(branchDeepVerts, x2, y2, z2, bx, by, z2 * 0.9, 3, 0.015, rand);
        }

        if (rand() < 0.35) {
          emberNodePositions.push(x2, y2, z2);
        }

        // Generation 3: Outer copper tendrils & silvery-sage rootlets reaching the C-ring inner rim
        const forks3 = inLeftGap ? 1 : 2 + Math.floor(rand() * 2);
        for (let c = 0; c < forks3; c++) {
          const spread3 = (c - (forks3 - 1) / 2) * (0.08 + rand() * 0.06);
          const a3 = a2 + spread3;
          const r3 = inLeftGap ? r2 + 0.07 + rand() * 0.06 : 0.72 + rand() * 0.11;
          const z3 = z2 + (rand() - 0.5) * 0.08;

          const x3 = Math.cos(a3) * r3;
          const y3 = Math.sin(a3) * r3;

          pushOrganicCurvedBranch(branchDeepVerts, x2, y2, z2, x3, y3, z3, 4, 0.018, rand);

          // Generation 4: Fine silvery-sage / muted-cyan rootlets anchoring into the C-ring (r = 0.83 - 0.89)
          if (!inLeftGap && rand() < 0.78) {
            const forks4 = 1 + Math.floor(rand() * 2);
            for (let d = 0; d < forks4; d++) {
              const a4 = a3 + (d - 0.5) * 0.055 + (rand() - 0.5) * 0.03;
              const r4 = 0.825 + rand() * 0.058;
              const z4 = z3 * 0.5;
              const x4 = Math.cos(a4) * r4;
              const y4 = Math.sin(a4) * r4;

              pushOrganicCurvedBranch(sageRootletVerts, x3, y3, z3, x4, y4, z4, 4, 0.012, rand);
            }
          }
        }
      }
    }

    const trunkBrightGeo = new THREE.BufferGeometry();
    trunkBrightGeo.setAttribute('position', new THREE.Float32BufferAttribute(trunkBrightVerts, 3));
    const trunkBrightMat = new THREE.LineBasicMaterial({
      color: copperTrunkColor,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
    });
    disposableGeometries.push(trunkBrightGeo);
    disposableMaterials.push(trunkBrightMat);
    dendritesGroup.add(new THREE.LineSegments(trunkBrightGeo, trunkBrightMat));

    const branchDeepGeo = new THREE.BufferGeometry();
    branchDeepGeo.setAttribute('position', new THREE.Float32BufferAttribute(branchDeepVerts, 3));
    const branchDeepMat = new THREE.LineBasicMaterial({
      color: copperDeepColor,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
    });
    disposableGeometries.push(branchDeepGeo);
    disposableMaterials.push(branchDeepMat);
    dendritesGroup.add(new THREE.LineSegments(branchDeepGeo, branchDeepMat));

    const sageGeo = new THREE.BufferGeometry();
    sageGeo.setAttribute('position', new THREE.Float32BufferAttribute(sageRootletVerts, 3));
    const sageMat = new THREE.LineBasicMaterial({
      color: sageTipColor,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
    });
    disposableGeometries.push(sageGeo);
    disposableMaterials.push(sageMat);
    dendritesGroup.add(new THREE.LineSegments(sageGeo, sageMat));

    // =========================================================================
    // LAYER 7: OPEN-LEFT C-SHAPED MULTI-TRACK GOLDEN RIM (-170° to +131°)
    // Locked 1:1 onto the exact upper-left jaw (+131° / 10:30) and lower-left jaw
    // (-170° / 8:20) of preview.webp, with 5 segmented golden tracks & inward jaws.
    // =========================================================================
    const cRingGroup = new THREE.Group();
    rootGroup.add(cRingGroup);

    const cStartRad = (-170 * Math.PI) / 180; // Lower-left jaw (8:20 position)
    const cEndRad = (131 * Math.PI) / 180; // Upper-left jaw (10:30 position)
    const totalCArc = cEndRad - cStartRad; // 301° solid arc, leaving 59° open gap on left

    const cRingRadii = [0.855, 0.876, 0.898, 0.92, 0.942];
    const cRingBrightVerts: number[] = [];
    const cRingAmberVerts: number[] = [];

    cRingRadii.forEach((rTrack, tIdx) => {
      const segs = 240;
      const zOff = (tIdx - 2) * 0.009;

      for (let s = 0; s < segs; s++) {
        // Authentic staggered arc-segment breaks matching the telemetry blocks in preview.webp
        const blockPattern = (s + tIdx * 7) % 16;
        if (blockPattern === 0 || blockPattern === 1) continue;
        if (tIdx === 0 && s % 9 === 0) continue;
        if (tIdx === 4 && s % 11 === 0) continue;

        const u0 = s / segs;
        const u1 = (s + 0.92) / segs;
        const a0 = cStartRad + u0 * totalCArc;
        const a1 = cStartRad + u1 * totalCArc;

        const target = tIdx === 1 || tIdx === 2 ? cRingBrightVerts : cRingAmberVerts;
        target.push(
          Math.cos(a0) * rTrack,
          Math.sin(a0) * rTrack,
          zOff,
          Math.cos(a1) * rTrack,
          Math.sin(a1) * rTrack,
          zOff
        );

        // Radial ladder ticks connecting the concentric tracks into segmented blocks
        if (tIdx < cRingRadii.length - 1 && s % 6 === 0) {
          const rNext = cRingRadii[tIdx + 1];
          cRingAmberVerts.push(
            Math.cos(a0) * rTrack,
            Math.sin(a0) * rTrack,
            zOff,
            Math.cos(a0) * rNext,
            Math.sin(a0) * rNext,
            zOff + 0.009
          );
        }
      }
    });

    // Inward-hooked terminal jaws at +131° (upper-left) and -170° (lower-left)
    [cStartRad, cEndRad].forEach((jawAngle, jIdx) => {
      const hookDir = jIdx === 0 ? 1 : -1;
      for (let b = 0; b < 10; b++) {
        const aOff = jawAngle + hookDir * (b * 0.0055);
        const rInner = 0.745 + (b % 3) * 0.014;
        const rOuter = 0.946;
        const zJaw = ((b % 3) - 1) * 0.012;
        cRingBrightVerts.push(
          Math.cos(aOff) * rInner,
          Math.sin(aOff) * rInner,
          zJaw,
          Math.cos(aOff) * rOuter,
          Math.sin(aOff) * rOuter,
          zJaw
        );
      }
      // Thick inward horizontal/diagonal shelf bars on each jaw
      for (let rBar = 0.755; rBar <= 0.94; rBar += 0.018) {
        const aIn = jawAngle + hookDir * 0.065;
        cRingBrightVerts.push(
          Math.cos(jawAngle) * rBar,
          Math.sin(jawAngle) * rBar,
          0.01,
          Math.cos(aIn) * rBar,
          Math.sin(aIn) * rBar,
          0.01
        );
      }
    });

    const cRingBrightGeo = new THREE.BufferGeometry();
    cRingBrightGeo.setAttribute('position', new THREE.Float32BufferAttribute(cRingBrightVerts, 3));
    const cRingBrightMat = new THREE.LineBasicMaterial({
      color: goldBrightColor,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    disposableGeometries.push(cRingBrightGeo);
    disposableMaterials.push(cRingBrightMat);
    cRingGroup.add(new THREE.LineSegments(cRingBrightGeo, cRingBrightMat));

    const cRingAmberGeo = new THREE.BufferGeometry();
    cRingAmberGeo.setAttribute('position', new THREE.Float32BufferAttribute(cRingAmberVerts, 3));
    const cRingAmberMat = new THREE.LineBasicMaterial({
      color: goldMidColor,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
    });
    disposableGeometries.push(cRingAmberGeo);
    disposableMaterials.push(cRingAmberMat);
    cRingGroup.add(new THREE.LineSegments(cRingAmberGeo, cRingAmberMat));

    // Add 3 concentric segmented 3D golden arc ribbon bands so the C-ring has the
    // exact luminous golden-amber architectural weight seen in preview.webp
    const ribbonTracks = [
      { rIn: 0.864, rOut: 0.874, z: -0.004, opacity: 0.55, color: goldMidColor },
      { rIn: 0.886, rOut: 0.898, z: 0.0, opacity: 0.75, color: goldBrightColor },
      { rIn: 0.910, rOut: 0.920, z: 0.004, opacity: 0.58, color: goldMidColor },
    ];
    const ribbonTrackGroups: THREE.Group[] = [];
    ribbonTracks.forEach((rt, rtIdx) => {
      const trackGroup = new THREE.Group();
      const blockCount = 34;
      const stepArc = totalCArc / blockCount;
      const rMat = new THREE.MeshBasicMaterial({
        color: rt.color,
        transparent: true,
        opacity: rt.opacity,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      disposableMaterials.push(rMat);

      for (let b = 0; b < blockCount; b++) {
        // Staggered gaps along the golden C-ring tracks
        if ((b + rtIdx * 3) % 7 === 0) continue;
        const startA = cStartRad + b * stepArc + stepArc * 0.08;
        const lenA = stepArc * 0.78;
        const rGeo = new THREE.RingGeometry(rt.rIn, rt.rOut, 8, 1, startA, lenA);
        disposableGeometries.push(rGeo);
        const rMesh = new THREE.Mesh(rGeo, rMat);
        rMesh.position.z = rt.z;
        trackGroup.add(rMesh);
      }
      cRingGroup.add(trackGroup);
      ribbonTrackGroups.push(trackGroup);
    });

    // =========================================================================
    // LAYER 8: 5 CONTINUOUSLY ROTATING 3D ELLIPTICAL BACK-CURVE ORBITS
    // Sweeps 360° behind and outside the C-ring (top-right, across the open left
    // gap, and below the bottom-right rim), continuously rotating in 3D space.
    // =========================================================================
    const backOrbitsGroup = new THREE.Group();
    rootGroup.add(backOrbitsGroup);

    const orbitConfigs = [
      { rx: 1.05, ry: 0.94, rotZ: 0.42, tiltX: 0.36, tiltY: -0.26, speed: 0.36, opacity: 0.56 },
      { rx: 1.09, ry: 0.91, rotZ: -0.55, tiltX: -0.32, tiltY: 0.34, speed: -0.29, opacity: 0.46 },
      { rx: 1.03, ry: 0.97, rotZ: 1.18, tiltX: 0.24, tiltY: 0.40, speed: 0.24, opacity: 0.40 },
      { rx: 1.12, ry: 0.89, rotZ: 2.15, tiltX: -0.40, tiltY: -0.22, speed: -0.33, opacity: 0.36 },
      { rx: 0.99, ry: 1.07, rotZ: -1.35, tiltX: 0.29, tiltY: -0.35, speed: 0.20, opacity: 0.42 },
    ];

    orbitConfigs.forEach((cfg, idx) => {
      const orbitPivot = new THREE.Group();
      orbitPivot.rotation.set(cfg.tiltX, cfg.tiltY, cfg.rotZ);
      orbitPivot.userData = {
        speed: cfg.speed,
        baseTiltX: cfg.tiltX,
        baseTiltY: cfg.tiltY,
        idx,
      };

      const segs = 220;
      const orbitVerts: number[] = [];
      for (let s = 0; s < segs; s++) {
        if (s % 12 === 0) continue;
        const a0 = (s / segs) * Math.PI * 2;
        const a1 = ((s + 1) / segs) * Math.PI * 2;
        const zWave0 = Math.sin(a0 * 2 + idx) * 0.045;
        const zWave1 = Math.sin(a1 * 2 + idx) * 0.045;

        orbitVerts.push(
          Math.cos(a0) * cfg.rx,
          Math.sin(a0) * cfg.ry,
          zWave0,
          Math.cos(a1) * cfg.rx,
          Math.sin(a1) * cfg.ry,
          zWave1
        );
        // Parallel secondary copper filament
        orbitVerts.push(
          Math.cos(a0) * (cfg.rx * 0.986),
          Math.sin(a0) * (cfg.ry * 0.986),
          zWave0 - 0.008,
          Math.cos(a1) * (cfg.rx * 0.986),
          Math.sin(a1) * (cfg.ry * 0.986),
          zWave1 - 0.008
        );
      }

      const oGeo = new THREE.BufferGeometry();
      oGeo.setAttribute('position', new THREE.Float32BufferAttribute(orbitVerts, 3));
      const oMat = new THREE.LineBasicMaterial({
        color: idx % 2 === 0 ? copperTrunkColor : goldMidColor,
        transparent: true,
        opacity: cfg.opacity,
        blending: THREE.AdditiveBlending,
      });
      disposableGeometries.push(oGeo);
      disposableMaterials.push(oMat);

      orbitPivot.add(new THREE.LineSegments(oGeo, oMat));
      backOrbitsGroup.add(orbitPivot);
    });

    // =========================================================================
    // LAYER 9: PINPOINT MICRO-SYNAPTIC EMBER SPARKS
    // =========================================================================
    for (let i = 0; i < 160; i++) {
      const a = rand() * Math.PI * 2;
      const r = 0.2 + rand() * 0.76;
      const z = (rand() - 0.5) * 0.22;
      emberNodePositions.push(Math.cos(a) * r, Math.sin(a) * r, z);
    }

    const glowTex = createPinpointGlowTexture();
    disposableTextures.push(glowTex);

    const sparksGeo = new THREE.BufferGeometry();
    sparksGeo.setAttribute('position', new THREE.Float32BufferAttribute(emberNodePositions, 3));
    const sparksMat = new THREE.PointsMaterial({
      size: 0.028,
      map: glowTex,
      color: goldBrightColor,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposableGeometries.push(sparksGeo);
    disposableMaterials.push(sparksMat);
    const sparksPoints = new THREE.Points(sparksGeo, sparksMat);
    rootGroup.add(sparksPoints);

    // =========================================================================
    // ANIMATION LOOP — SILKY-SMOOTH 60/120FPS MOTION ACROSS ALL 9 3D LAYERS
    // =========================================================================
    let isDisposed = false;
    let rafId = 0;
    const startTimeMs = performance.now();
    let lastTimeMs = startTimeMs;
    let smoothExplode = explodeRef.current;
    let smoothSpeed = orbitSpeedRef.current;
    let smoothBloom = bloomRef.current;
    let phaseAccum = 0;

    const isHeadlessAutomated =
      typeof navigator !== 'undefined' && navigator.webdriver === true;

    const afterDraw = (cb: () => void) => {
      if (!isHeadlessAutomated) {
        cb();
        return;
      }
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) return;
          const status = gl.clientWaitSync(sync!, 0, 0);
          if (status === gl.TIMEOUT_EXPIRED) {
            setTimeout(poll, 4);
            return;
          }
          gl.deleteSync(sync);
          cb();
        };
        setTimeout(poll, 0);
      } else {
        cb();
      }
    };

    const tick = () => {
      if (isDisposed) return;

      if (document.hidden) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const nowMs = performance.now();
      const elapsed = (nowMs - startTimeMs) * 0.001;
      const dt = Math.min((nowMs - lastTimeMs) * 0.001, 0.05);
      lastTimeMs = nowMs;

      // Smoothly damp slider values so dragging sliders never jumps or stutters
      const dampFactor = Math.min(1, dt * 8.5);
      smoothExplode += (explodeRef.current - smoothExplode) * dampFactor;
      smoothSpeed += (orbitSpeedRef.current - smoothSpeed) * dampFactor;
      smoothBloom += (bloomRef.current - smoothBloom) * dampFactor;

      // Dynamically update UnrealBloomPass strength (scaled to prevent overexposure)
      bloomPass.strength = smoothBloom * 0.42;
      bloomPass.enabled = smoothBloom > 0.01;

      // Ensure all layers keep a graceful living motion even at low orbit speed
      const activeSpeed = Math.max(0.25, smoothSpeed);
      phaseAccum += dt * activeSpeed;
      const t = phaseAccum;

      // Smoothly glide camera when a preset button (REF, 3D TILT, MACRO, ZENITH) is clicked
      if (targetCamPosRef.current && targetLookAtRef.current) {
        const camLerp = Math.min(1, dt * 7.0);
        camera.position.lerp(targetCamPosRef.current, camLerp);
        controls.target.lerp(targetLookAtRef.current, camLerp);
        if (camera.position.distanceTo(targetCamPosRef.current) < 0.005) {
          camera.position.copy(targetCamPosRef.current);
          controls.target.copy(targetLookAtRef.current);
          targetCamPosRef.current = null;
          targetLookAtRef.current = null;
        }
      }

      const explode = smoothExplode;

      // 1. Smoothly separate & undulate the 9 anatomical layers along Z
      const zBreath = Math.sin(t * 1.15) * 0.014;
      coreVoidGroup.position.z = explode * 0.42 + zBreath * 1.2;
      parabolicGroup.position.z = explode * 0.28 + Math.cos(t * 1.05) * 0.012;
      chordsGroup.position.z = explode * 0.16 + Math.sin(t * 0.95 + 1.0) * 0.01;
      dendritesGroup.position.z = Math.cos(t * 0.85) * 0.008;
      techRingsGroup.position.z = -explode * 0.14 + Math.sin(t * 0.9 + 2.0) * 0.01;
      cRingGroup.position.z = -explode * 0.22 - zBreath * 0.8;
      backOrbitsGroup.position.z = -0.05 - explode * 0.42;

      if (shellMeshes.length === 3) {
        shellMeshes[0].position.z = explode * 0.22 + Math.sin(t * 1.1) * 0.008;
        shellMeshes[1].position.z = -0.01 + Math.cos(t * 0.95) * 0.006;
        shellMeshes[2].position.z = -0.02 - explode * 0.22 - Math.sin(t * 1.05) * 0.008;
        shellMeshes.forEach((shell, idx) => {
          shell.rotation.z = Math.sin(t * 0.45 + idx * 1.1) * 0.035;
        });
      }

      // 2. LAYER 2: Central Woven Copper-Gold Torus Pupil — continuous counter-rotating strands & 3D nutation
      const corePulse = 1 + Math.sin(t * 1.8) * 0.028;
      coreVoidGroup.scale.setScalar(corePulse);
      coreVoidGroup.rotation.x = Math.sin(t * 0.85) * 0.14;
      coreVoidGroup.rotation.y = Math.cos(t * 0.72) * 0.14;
      if (coreVoidGroup.children[1]) {
        coreVoidGroup.children[1].rotation.z += 0.42 * dt * activeSpeed;
      }
      if (coreVoidGroup.children[2]) {
        coreVoidGroup.children[2].rotation.z -= 0.34 * dt * activeSpeed;
      }

      // 3. LAYER 4: Tilted 3-Strand Parabolic Golden Caustic Loop — smooth 3D wave & strand ripple
      parabolicGroup.rotation.z = Math.sin(t * 0.52) * 0.12;
      parabolicGroup.rotation.x = Math.sin(t * 0.64) * 0.095;
      parabolicGroup.rotation.y = Math.cos(t * 0.56) * 0.095;
      parabolicGroup.scale.setScalar(1 + Math.cos(t * 1.4) * 0.018);
      parabolicGroup.children.forEach((strandMesh, sIdx) => {
        strandMesh.rotation.z = Math.sin(t * (0.85 + sIdx * 0.2) + sIdx * 1.3) * 0.045;
        strandMesh.position.z = Math.sin(t * 1.3 + sIdx * 1.1) * 0.014;
      });

      // 4. LAYER 5: Straight Precision Secant Laser Chords — smooth axial gimbal & orbital sweep
      chordsGroup.rotation.z = Math.sin(t * 0.44) * 0.095;
      chordsGroup.rotation.x = Math.cos(t * 0.58) * 0.075;
      chordsGroup.rotation.y = Math.sin(t * 0.50) * 0.075;

      // 5. LAYER 6: Organic Curved Copper-Orange Fractal Dendrites & Silvery-Sage Rootlets — living synaptic ripple
      const dendritePulse = 1 + Math.sin(t * 1.25 + 0.6) * 0.02;
      dendritesGroup.scale.setScalar(dendritePulse);
      dendritesGroup.rotation.z = Math.sin(t * 0.36) * 0.065;
      dendritesGroup.rotation.x = Math.sin(t * 0.52 + 0.4) * 0.07;
      dendritesGroup.rotation.y = Math.cos(t * 0.46 + 0.4) * 0.07;
      dendritesGroup.children.forEach((branchLayer, bIdx) => {
        const dir = bIdx % 2 === 0 ? 1 : -1;
        branchLayer.rotation.z = Math.sin(t * (0.62 + bIdx * 0.18) + bIdx) * 0.048 * dir;
        branchLayer.position.z = Math.sin(t * 1.15 + bIdx * 1.2) * 0.016;
      });

      // 6. LAYER 3: 7 Concentric Segmented Technical Rings — continuous counter-rotation & 3D gimbal wave
      techRingsGroup.children.forEach((child, rIdx) => {
        child.rotation.z += (child.userData.speed || 0.06) * 1.45 * dt * activeSpeed;
        child.rotation.x = Math.sin(t * 0.68 + rIdx * 0.75) * 0.065;
        child.rotation.y = Math.cos(t * 0.60 + rIdx * 0.75) * 0.065;
      });

      // 7. LAYER 7: Open-Left Multi-Track Golden C-Ring & Segmented Arc Ribbons — smooth 3D nutation & track glide
      cRingGroup.rotation.x = Math.sin(t * 0.48) * 0.06;
      cRingGroup.rotation.y = Math.cos(t * 0.42) * 0.06;
      cRingGroup.rotation.z = Math.sin(t * 0.34) * 0.045;
      ribbonTrackGroups.forEach((tg, rtIdx) => {
        const slideDir = rtIdx === 1 ? -1 : 1;
        tg.rotation.z = Math.sin(t * (0.75 + rtIdx * 0.22) + rtIdx * 1.5) * 0.032 * slideDir;
        tg.position.z = Math.cos(t * 1.1 + rtIdx) * 0.008;
      });

      // 8. LAYER 8: 5 Continuously Rotating 3D Elliptical Back-Curve Orbits
      backOrbitsGroup.children.forEach((pivot) => {
        const u = pivot.userData;
        pivot.rotation.z += u.speed * 0.62 * dt * activeSpeed;
        pivot.rotation.x = u.baseTiltX + Math.sin(t * 0.58 + u.idx) * 0.13;
        pivot.rotation.y = u.baseTiltY + Math.cos(t * 0.50 + u.idx) * 0.13;
      });

      // 9. LAYER 9: Pinpoint Micro-Synaptic Ember Sparks — continuous 3D orbital drift
      sparksPoints.rotation.z += 0.15 * dt * activeSpeed;
      sparksPoints.rotation.x = Math.sin(t * 0.48) * 0.09;
      sparksPoints.rotation.y = Math.cos(t * 0.42) * 0.09;
      sparksPoints.position.z = Math.sin(t * 0.9) * 0.015;

      // 10. Smooth 3D harmonic sway on the entire root group
      rootGroup.rotation.y = Math.sin(elapsed * 0.38) * 0.055;
      rootGroup.rotation.x = Math.cos(elapsed * 0.31) * 0.042;

      controls.update();
      if (smoothBloom > 0.01) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      afterDraw(() => {
        if (!isDisposed) {
          rafId = requestAnimationFrame(tick);
        }
      });
    };

    rafId = requestAnimationFrame(tick);

    const handleResize = () => {
      if (!container || isDisposed) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', cancelCamPresetOnInteract);
      controls.dispose();
      disposableGeometries.forEach((g) => g.dispose());
      disposableMaterials.forEach((m) => m.dispose());
      disposableTextures.forEach((t) => t.dispose());
      composer.dispose();
      renderer.dispose();
    };
  }, [selectedModel, theme, activeTheme]);

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] bg-[#020101] overflow-hidden select-none">
      {/* Full-Viewport 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        data-testid="ultron-3d-canvas-container"
      />

      {/* Top-Left Minimal Architectural Overlay */}
      <div className="pointer-events-none absolute top-5 left-6 z-10 max-w-sm">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-amber-400/90">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>{activeModel.code} · 9-LAYER DEEP 3D HOLOGRAM</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-100">
          {activeModel.name}
        </h1>
        <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
          Open-left multi-track C-ring (<span className="text-amber-300/90 font-mono">-170° to +131°</span>),
          segmented 3-strand parabolic golden loop, curved copper-orange fractal dendrites, and 360°
          rotating 3D elliptical back-curves.
        </p>
      </div>

      {/* Top-Right Quick Actions */}
      <div className="
        absolute top-5 right-6 z-10 flex items-center gap-2
      ">
        <button
          type="button"
          onClick={() => ultronVoiceEngine.triggerBlobTapSpeech()}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium text-xs transition shadow-lg shadow-amber-500/20 cursor-pointer"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Project & Vocalize</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setExplodeDepth(0.14);
            setBackOrbitSpeed(1.0);
            applyCameraPreset('front');
          }}
          title="Reset 3D View"
          className="p-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-white/10 transition cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Floating Dock (Collapsible via H key or toggle button) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 w-[94%] max-w-3xl">
        <div className="flex justify-center mb-2">
          <button
            type="button"
            onClick={() => setHudMinimized((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/85 border border-white/10 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition cursor-pointer backdrop-blur-md"
          >
            {hudMinimized ? (
              <>
                <ChevronUp className="w-3 h-3" />
                <span>Show 3D Controls (H)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                <span>Hide Controls (H)</span>
              </>
            )}
          </button>
        </div>

        {!hudMinimized && (
          <div className="rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-xl p-4 shadow-2xl">
            {/* Row 1: 3D Architecture Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>3D Hologram Mode:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {ORB_MODELS.map((m) => {
                  const active = m.id === selectedModel;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedModel(m.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                        active
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-zinc-900/70 text-zinc-400 hover:text-zinc-200 border border-white/5'
                      }`}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 2: Sliders (Depth, Orbit, Optical Bloom) & Camera Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 items-center">
              {/* 3D Depth Explosion Slider */}
              <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-white/5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3 h-3 text-amber-400" />
                    <span>3D Depth Separation</span>
                  </span>
                  <span className="font-mono text-amber-300">{Math.round(explodeDepth * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={explodeDepth}
                  onChange={(e) => setExplodeDepth(parseFloat(e.target.value))}
                  aria-label="3D Depth Separation"
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
              </div>

              {/* Back-Curve Rotation Speed Slider */}
              <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-white/5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-3 h-3 text-amber-400" />
                    <span>Back-Curve 360° Orbit</span>
                  </span>
                  <span className="font-mono text-amber-300">{backOrbitSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2.5}
                  step={0.1}
                  value={backOrbitSpeed}
                  onChange={(e) => setBackOrbitSpeed(parseFloat(e.target.value))}
                  aria-label="Back-Curve 360° Orbit Speed"
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
              </div>

              {/* EffectComposer UnrealBloomPass Intensity Slider */}
              <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-white/5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Sun className="w-3 h-3 text-amber-400" />
                    <span>Bloom Intensity</span>
                  </span>
                  <span
                    data-testid="dock-bloom-readout"
                    className="font-mono text-amber-300"
                  >
                    {activeBloom.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2.5}
                  step={0.05}
                  value={activeBloom}
                  onChange={(e) => handleBloomChange(parseFloat(e.target.value))}
                  aria-label="Bloom Intensity"
                  data-testid="dock-bloom-slider"
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
              </div>

              {/* Camera Angle & Theme Controls */}
              <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-white/5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3 h-3 text-amber-400" />
                    <span>Camera & Palette</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {ORB_THEMES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onChangeTheme?.(t.id)}
                        title={t.name}
                        style={{ backgroundColor: t.primaryColor }}
                        className={`w-3.5 h-3.5 rounded-full transition cursor-pointer ${
                          theme === t.id ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      ['front', 'REF'],
                      ['angled', '3D TILT'],
                      ['macro', 'MACRO'],
                      ['top', 'ZENITH'],
                    ] as const
                  ).map(([presetId, label]) => (
                    <button
                      key={presetId}
                      type="button"
                      onClick={() => applyCameraPreset(presetId)}
                      className={`py-1 rounded text-[10px] font-mono transition cursor-pointer ${
                        cameraPreset === presetId
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                          : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
