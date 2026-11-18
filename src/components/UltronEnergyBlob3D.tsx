import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  computeUEmblemPoint,
  compute3DBackCurvePoint,
} from '../utils/ultronLogic';

export interface UltronEnergyBlob3DProps {
  /** Size in CSS pixels when not full-screen */
  size?: number;
  /** Whether to fill parent container 100% (used in full-screen intro) */
  fullScreen?: boolean;
  /** Intro choreography weights (when driven by CinematicOpening) */
  introWeights?: {
    glowWeight: number;
    particleGatherWeight: number;
    blobDeformWeight: number;
    filamentRevealWeight: number;
    uEmblemMorphWeight: number;
  };
  /** Activity level in main app ('idle' | 'typing' | 'streaming') */
  activity?: 'idle' | 'typing' | 'streaming';
  /** Color accent mode */
  theme?: 'amber' | 'cyan' | 'violet';
  /** Dynamic bloom intensity from EffectComposer settings */
  bloomIntensity?: number;
  /** Playback speed multiplier (1.0 = calibrated 1x calm cinematic speed) */
  playbackSpeed?: number;
  /** Interactive pointer response & click handler */
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uDeform;
  uniform float uMorphU;
  uniform vec2 uPointer;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  varying float vDisplacement;
  varying vec2 vUv;

  // 3D smooth harmonic organic noise
  float organicWave(vec3 p, float t) {
    float n1 = sin(p.x * 3.1 + t * 1.15) * cos(p.y * 2.9 - t * 0.95) * sin(p.z * 3.3 + t * 0.85);
    float n2 = sin(p.y * 5.4 - t * 1.4) * cos(p.z * 4.8 + t * 1.1) * 0.45;
    float n3 = cos((p.x + p.y) * 4.2 + t * 1.3) * sin(p.z * 6.1 - t * 0.7) * 0.25;
    return n1 + n2 + n3;
  }

  // Sculptural 3D "U" emblem target surface for vertex morphing
  vec3 computeUTarget(vec3 origPos, vec2 uvCoord) {
    float angle = atan(origPos.y, origPos.x);
    // Map sphere parameterization onto a U-shaped tubular arc open at the top
    float uParam = clamp((angle + 3.14159265) / 6.2831853, 0.0, 1.0);
    float width = 0.62;
    float topY = 0.60;
    float arcCenterY = -0.05;

    vec3 spine = vec3(0.0);
    vec3 tangent = vec3(0.0, 1.0, 0.0);

    if (uParam < 0.28) {
      float segT = uParam / 0.28;
      spine = vec3(-width, topY - segT * (topY - arcCenterY), 0.0);
      tangent = vec3(0.0, -1.0, 0.0);
    } else if (uParam <= 0.72) {
      float segT = (uParam - 0.28) / 0.44;
      float a = 3.14159265 + segT * 3.14159265;
      spine = vec3(cos(a) * width, arcCenterY + sin(a) * width, 0.0);
      tangent = vec3(-sin(a), cos(a), 0.0);
    } else {
      float segT = (uParam - 0.72) / 0.28;
      spine = vec3(width, arcCenterY + segT * (topY - arcCenterY), 0.0);
      tangent = vec3(0.0, 1.0, 0.0);
    }

    vec3 binormal = vec3(0.0, 0.0, 1.0);
    vec3 normal2D = normalize(cross(tangent, binormal));
    float tubeAngle = origPos.z * 3.14159265;
    float tubeRadius = 0.135;
    return spine + normal2D * cos(tubeAngle) * tubeRadius + binormal * sin(tubeAngle) * tubeRadius;
  }

  void main() {
    vUv = uv;
    vec3 dir = normalize(position);
    float wave = organicWave(dir, uTime);
    vDisplacement = wave;

    // Pointer-responsive gentle pull
    float pointerInfluence = dot(dir.xy, uPointer) * 0.11;

    // Organic displaced sphere position
    vec3 blobPos = position + normal * (wave * 0.145 * uDeform + pointerInfluence);

    // Sculptural U-emblem position
    vec3 uPos = computeUTarget(dir, uv) + normal * (wave * 0.025);

    vec3 finalPos = mix(blobPos, uPos, smoothstep(0.0, 1.0, uMorphU));

    // Perturb normal slightly for liquid-metal ripple reflections
    vec3 perturbedNormal = normalize(normal + vec3(
      cos(position.x * 4.0 + uTime) * 0.18 * uDeform,
      sin(position.y * 4.0 - uTime) * 0.18 * uDeform,
      sin(position.z * 4.0 + uTime) * 0.18 * uDeform
    ));

    vNormal = normalize(normalMatrix * perturbedNormal);
    vec4 worldPosition = modelMatrix * vec4(finalPos, 1.0);
    vWorldPos = worldPosition.xyz;
    vViewDir = normalize(cameraPosition - worldPosition.xyz);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uGlow;
  uniform float uMorphU;
  uniform float uThemeBias;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  varying float vDisplacement;
  varying vec2 vUv;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);

    float ndotv = max(0.0, dot(N, V));
    float fresnel = pow(1.0 - ndotv, 2.65);

    // Dark central core inspired by the visual reference
    float darkCoreMask = smoothstep(0.92, 0.28, ndotv);

    // Art-directed iridescent palette:
    // Electric violet, cobalt blue, cyan, magenta + selective warm amber highlights
    vec3 electricViolet = vec3(0.486, 0.227, 0.929); // #7c3aed
    vec3 cobaltBlue     = vec3(0.145, 0.388, 0.922); // #2563eb
    vec3 luminousCyan   = vec3(0.035, 0.745, 0.855); // #09beda
    vec3 softMagenta    = vec3(0.859, 0.153, 0.467); // #db2777
    vec3 warmAmber      = vec3(0.984, 0.722, 0.188); // #fbb830
    vec3 deepObsidian   = vec3(0.018, 0.020, 0.038);

    // Traveling light bands across the liquid-metal surface
    float iridPhase = dot(N, vec3(cos(uTime * 0.55), sin(uTime * 0.45), cos(uTime * 0.35)))
                    + vDisplacement * 1.4;

    vec3 iridColor = mix(cobaltBlue, electricViolet, smoothstep(-0.7, 0.3, iridPhase));
    iridColor = mix(iridColor, luminousCyan, smoothstep(0.05, 0.75, sin(iridPhase * 2.2 + uTime * 0.4)));
    iridColor = mix(iridColor, softMagenta, smoothstep(0.35, 0.95, cos(iridPhase * 1.8 - uTime * 0.35)) * 0.58);

    // Selective warm amber filament highlights inspired by the Ultron reference image
    float amberVeins = pow(max(0.0, sin(vWorldPos.x * 6.5 + vWorldPos.y * 5.0 - uTime * 1.1)), 5.0);
    float amberRim = pow(1.0 - ndotv, 3.8) * (0.55 + 0.45 * sin(uTime * 0.8 + vWorldPos.y * 3.0));
    float amberStrength = clamp(amberVeins * 0.65 + amberRim * 0.85 + uThemeBias * 0.25, 0.0, 1.0);

    vec3 surfaceColor = mix(iridColor, warmAmber, amberStrength);

    // Dual studio specular highlights (warm key light + cool rim light)
    vec3 keyLightDir = normalize(vec3(0.65, 0.75, 0.85));
    vec3 rimLightDir = normalize(vec3(-0.75, 0.45, -0.35));
    vec3 halfKey = normalize(keyLightDir + V);
    vec3 halfRim = normalize(rimLightDir + V);

    float specKey = pow(max(0.0, dot(N, halfKey)), 42.0);
    float specRim = pow(max(0.0, dot(N, halfRim)), 24.0);

    // Combine dark central core with iridescent liquid-metal shell and rim bloom
    vec3 col = mix(deepObsidian, surfaceColor * 0.78, darkCoreMask);
    col += surfaceColor * fresnel * 1.35;
    col += warmAmber * specKey * 0.92;
    col += luminousCyan * specRim * 0.65;

    // Brighten subtly as it settles into the U emblem
    col = mix(col, col * 1.25 + warmAmber * 0.15, uMorphU);

    float alpha = clamp((0.28 + darkCoreMask * 0.68 + fresnel * 0.45) * uGlow, 0.0, 0.98);
    gl_FragColor = vec4(col * uGlow, alpha);
  }
`;

export const UltronEnergyBlob3D: React.FC<UltronEnergyBlob3DProps> = ({
  size = 240,
  fullScreen = false,
  introWeights,
  activity = 'idle',
  theme = 'amber',
  bloomIntensity = 0.85,
  playbackSpeed = 1.0,
  interactive = true,
  onClick,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [webglFallback, setWebglFallback] = useState(false);

  const livePropsRef = useRef({
    introWeights,
    activity,
    theme,
    bloomIntensity,
    playbackSpeed,
    pointerX: 0,
    pointerY: 0,
    targetPointerX: 0,
    targetPointerY: 0,
  });

  livePropsRef.current.introWeights = introWeights;
  livePropsRef.current.activity = activity;
  livePropsRef.current.theme = theme;
  livePropsRef.current.bloomIntensity = bloomIntensity;
  livePropsRef.current.playbackSpeed = playbackSpeed;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Initialize WebGLRenderer with graceful fallback if WebGL is unavailable
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFallback(true);
      return;
    }

    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software/i.test(rendererStr);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Cap pixel density per device tier
    const maxDpr = isSoftwareGl ? 1 : isMobile ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));

    const initW = container.clientWidth || size;
    const initH = container.clientHeight || size;
    renderer.setSize(initW, initH);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Handle WebGL context loss gracefully
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFallback(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    // 2. Scene, Camera & Post-Processing EffectComposer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, initW / Math.max(1, initH), 0.1, 50);
    camera.position.set(0, 0, fullScreen ? 3.55 : 3.25);

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(initW, initH),
      livePropsRef.current.bloomIntensity * 0.75,
      0.42,
      0.32
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 3. Central Iridescent Glass-and-Liquid-Metal 3D Energy Blob (Custom GLSL Shader)
    const detailLevel = isSoftwareGl ? 24 : isMobile ? 32 : 48;
    const blobGeo = new THREE.IcosahedronGeometry(0.68, detailLevel);
    const blobShaderMat = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uDeform: { value: 1.0 },
        uMorphU: { value: 0.0 },
        uGlow: { value: 1.0 },
        uThemeBias: { value: theme === 'amber' ? 0.35 : theme === 'cyan' ? -0.2 : 0.0 },
        uPointer: { value: new THREE.Vector2(0, 0) },
      },
    });
    const blobMesh = new THREE.Mesh(blobGeo, blobShaderMat);
    rootGroup.add(blobMesh);

    // Dark Central Core Sphere inside the translucent liquid-metal shell (recalling the reference)
    const coreDarkGeo = new THREE.SphereGeometry(0.36, 24, 24);
    const coreDarkMat = new THREE.MeshBasicMaterial({
      color: 0x030307,
      transparent: true,
      opacity: 0.86,
    });
    const coreDarkMesh = new THREE.Mesh(coreDarkGeo, coreDarkMat);
    rootGroup.add(coreDarkMesh);

    // 4. Delicate Orbital Filaments & Reference Open-Left C-Ring Threads
    const filamentsGroup = new THREE.Group();
    rootGroup.add(filamentsGroup);

    const amberFilamentMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
    });

    const cyanFilamentMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
    });

    const violetFilamentMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });

    // Reference Open-Left C-Ring (-131° to +164°) with fine double tracks
    const cStart = (-131 * Math.PI) / 180;
    const cSweep = ((164 - -131) * Math.PI) / 180;
    const cRingOuter = new THREE.Mesh(
      new THREE.TorusGeometry(0.96, 0.006, 10, 80, cSweep),
      amberFilamentMat
    );
    cRingOuter.rotation.z = cStart;
    filamentsGroup.add(cRingOuter);

    const cRingInner = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.004, 8, 72, cSweep),
      cyanFilamentMat
    );
    cRingInner.rotation.z = cStart;
    filamentsGroup.add(cRingInner);

    // Parabolic 3-strand internal filament loop inspired by the reference image
    const paraPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 72; i++) {
      const th = (i / 72) * Math.PI * 2;
      const rel = th - 0.12;
      const r = 0.50 + 0.14 * Math.cos(rel) + 0.08 * Math.cos(3 * rel);
      const z = Math.sin(rel * 2) * 0.12;
      paraPts.push(new THREE.Vector3(Math.cos(th) * r, Math.sin(th) * r, z));
    }
    const paraCurve = new THREE.CatmullRomCurve3(paraPts, true);
    const paraMesh = new THREE.Mesh(
      new THREE.TubeGeometry(paraCurve, 72, 0.0045, 6, true),
      amberFilamentMat
    );
    filamentsGroup.add(paraMesh);

    // 3 Rotating 3D Elliptical Back-Curve Orbital Threads
    const orbitSpecs = [
      { rx: 1.12, ry: 0.90, tx: 0.42, ty: -0.28, tz: -0.42, speed: 0.45, mat: amberFilamentMat },
      { rx: 1.06, ry: 0.96, tx: -0.35, ty: 0.36, tz: 0.34, speed: -0.35, mat: cyanFilamentMat },
      { rx: 1.15, ry: 0.86, tx: 0.22, ty: 0.52, tz: -0.78, speed: 0.52, mat: violetFilamentMat },
    ];
    const orbitMeshes: Array<{ mesh: THREE.Mesh; speed: number }> = [];
    orbitSpecs.forEach((sp) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const [px, py, pz] = compute3DBackCurvePoint(a, sp.rx, sp.ry, sp.tx, sp.ty, sp.tz);
        pts.push(new THREE.Vector3(px, py, pz));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.004, 6, true), sp.mat);
      filamentsGroup.add(mesh);
      orbitMeshes.push({ mesh, speed: sp.speed });
    });

    // Fine Radial Dendrite Filaments inside the sphere
    const dendriteCoords: number[] = [];
    const dendriteCount = isMobile ? 20 : 32;
    for (let i = 0; i < dendriteCount; i++) {
      const ang = (i / dendriteCount) * Math.PI * 2;
      const deg = ((ang * 180) / Math.PI) % 360;
      const inGap = deg > 165 && deg < 227;
      const r0 = 0.34;
      const r1 = inGap ? 0.56 : 0.88;
      const zBias = Math.sin(i * 1.9) * 0.18;
      const x0 = Math.cos(ang) * r0;
      const y0 = Math.sin(ang) * r0;
      const x1 = Math.cos(ang + 0.07 * Math.sin(i)) * r1;
      const y1 = Math.sin(ang + 0.07 * Math.sin(i)) * r1;
      dendriteCoords.push(x0, y0, zBias * 0.3, x1, y1, zBias);
    }
    const dendriteGeo = new THREE.BufferGeometry();
    dendriteGeo.setAttribute('position', new THREE.Float32BufferAttribute(dendriteCoords, 3));
    const dendriteLineMat = new THREE.LineBasicMaterial({
      color: 0xe85d12,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
    });
    const dendriteLines = new THREE.LineSegments(dendriteGeo, dendriteLineMat);
    filamentsGroup.add(dendriteLines);

    // 5. Sculptural 3D "U" Emblem Tube (Revealed when settling into the ULTRON mark)
    const uEmblemPts: THREE.Vector3[] = [];
    const uSteps = 72;
    for (let i = 0; i <= uSteps; i++) {
      const [ux, uy, uz] = computeUEmblemPoint(i / uSteps, 1.0, 0.04);
      uEmblemPts.push(new THREE.Vector3(ux, uy, uz));
    }
    const uEmblemCurve = new THREE.CatmullRomCurve3(uEmblemPts, false);
    const uEmblemMat = new THREE.MeshBasicMaterial({
      color: 0xffe49e,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    const uEmblemMesh = new THREE.Mesh(
      new THREE.TubeGeometry(uEmblemCurve, 72, 0.032, 12, false),
      uEmblemMat
    );
    rootGroup.add(uEmblemMesh);

    // 6. Luminous Particle Cloud (Gathers from wide space -> Orbits Blob -> Settles on U Emblem)
    const particleCount = isSoftwareGl ? 110 : isMobile ? 140 : 220;
    const scatterCoords = new Float32Array(particleCount * 3);
    const orbitCoords = new Float32Array(particleCount * 3);
    const uTargetCoords = new Float32Array(particleCount * 3);
    const liveParticleCoords = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const paletteColors = [
      new THREE.Color(0x7c3aed), // electric violet
      new THREE.Color(0x2563eb), // cobalt blue
      new THREE.Color(0x06b6d4), // cyan
      new THREE.Color(0xdb2777), // magenta
      new THREE.Color(0xfbbf24), // warm amber
    ];

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      const theta = i * goldenAngle;
      const yNorm = 1 - t * 2;
      const radAtY = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));

      // Wide scattered initial state
      const scatterR = 2.1 + (i % 7) * 0.28;
      scatterCoords[i * 3] = Math.cos(theta) * radAtY * scatterR;
      scatterCoords[i * 3 + 1] = yNorm * scatterR;
      scatterCoords[i * 3 + 2] = Math.sin(theta) * radAtY * scatterR;

      // Cohesive orbital state around blob
      const orbR = 0.78 + (i % 5) * 0.065;
      orbitCoords[i * 3] = Math.cos(theta) * radAtY * orbR;
      orbitCoords[i * 3 + 1] = yNorm * orbR;
      orbitCoords[i * 3 + 2] = Math.sin(theta) * radAtY * orbR;

      // U-emblem settled state
      const [ux, uy, uz] = computeUEmblemPoint(t, 1.0, 0.03);
      uTargetCoords[i * 3] = ux;
      uTargetCoords[i * 3 + 1] = uy;
      uTargetCoords[i * 3 + 2] = uz;

      liveParticleCoords[i * 3] = orbitCoords[i * 3];
      liveParticleCoords[i * 3 + 1] = orbitCoords[i * 3 + 1];
      liveParticleCoords[i * 3 + 2] = orbitCoords[i * 3 + 2];

      const col = paletteColors[i % paletteColors.length];
      particleColors[i * 3] = col.r;
      particleColors[i * 3 + 1] = col.g;
      particleColors[i * 3 + 2] = col.b;
    }

    const particlesGeo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(liveParticleCoords, 3);
    particlesGeo.setAttribute('position', posAttr);
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particlesMat = new THREE.PointsMaterial({
      size: fullScreen ? 0.028 : 0.024,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particlesPoints = new THREE.Points(particlesGeo, particlesMat);
    rootGroup.add(particlesPoints);

    // 7. Resize Observer & Page Visibility Listener
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || size;
      const h = container.clientHeight || size;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
    };
    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);

    // 8. Animation Loop (Pauses when hidden; uses fenceSync on Software WebGL)
    let disposed = false;
    let rafId = 0;
    const startMs = performance.now();
    let prevMs = startMs;
    let phaseTime = 0;

    const initIw = livePropsRef.current.introWeights;
    let smoothGlowW = initIw ? initIw.glowWeight : 1.0;
    let smoothGatherW = initIw ? initIw.particleGatherWeight : 1.0;
    let smoothDeformW = initIw ? initIw.blobDeformWeight : 0.85;
    let smoothFilamentW = initIw ? initIw.filamentRevealWeight : 0.88;
    let smoothMorphUW = initIw ? initIw.uEmblemMorphWeight : 0.0;

    function afterDraw(cb: () => void) {
      if (!isSoftwareGl || !('fenceSync' in gl)) {
        rafId = requestAnimationFrame(cb);
        return;
      }
      const gl2 = gl as WebGL2RenderingContext;
      const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl2.flush();
      function poll() {
        if (disposed) return;
        if (!sync) {
          setTimeout(cb, 80);
          return;
        }
        const status = gl2.getSyncParameter(sync, gl2.SYNC_STATUS);
        if (status === gl2.SIGNALED || gl2.isContextLost()) {
          gl2.deleteSync(sync);
          setTimeout(cb, 80);
        } else {
          setTimeout(poll, 16);
        }
      }
      setTimeout(poll, 16);
    }

    function tick() {
      if (disposed) return;

      // Pause rendering when browser tab is hidden
      if (typeof document !== 'undefined' && document.hidden) {
        prevMs = performance.now();
        setTimeout(tick, 200);
        return;
      }

      const nowMs = performance.now();
      const dt = Math.min(Math.max(0, (nowMs - prevMs) * 0.001), 0.035);
      prevMs = nowMs;

      const state = livePropsRef.current;
      state.pointerX = THREE.MathUtils.damp(state.pointerX, state.targetPointerX, 5, dt);
      state.pointerY = THREE.MathUtils.damp(state.pointerY, state.targetPointerY, 5, dt);

      const userSpeed = Math.min(Math.max(0.25, state.playbackSpeed ?? 1.0), 2.0);
      // Calibrated 1x base pace (0.52) so idle & intro motion feels poised, fluid, and unhurried
      const activityFactor =
        state.activity === 'streaming' ? 1.35 : state.activity === 'typing' ? 1.12 : 1.0;
      const speedMult = 0.52 * userSpeed * activityFactor;
      phaseTime += dt * speedMult;
      const elapsed = phaseTime;

      const iw = state.introWeights;
      const targetGlowW = iw ? iw.glowWeight : 1.0;
      const targetGatherW = iw ? iw.particleGatherWeight : 1.0;
      const targetDeformW = iw ? iw.blobDeformWeight : 0.85;
      const targetFilamentW = iw ? iw.filamentRevealWeight : 0.88;
      const targetMorphUW = iw ? iw.uEmblemMorphWeight : 0.0;

      const dampRate = 6.5 * userSpeed;
      smoothGlowW = THREE.MathUtils.damp(smoothGlowW, targetGlowW, dampRate, dt);
      smoothGatherW = THREE.MathUtils.damp(smoothGatherW, targetGatherW, dampRate, dt);
      smoothDeformW = THREE.MathUtils.damp(smoothDeformW, targetDeformW, dampRate, dt);
      smoothFilamentW = THREE.MathUtils.damp(smoothFilamentW, targetFilamentW, dampRate, dt);
      smoothMorphUW = THREE.MathUtils.damp(smoothMorphUW, targetMorphUW, dampRate, dt);

      const glowW = smoothGlowW;
      const gatherW = smoothGatherW;
      const deformW = smoothDeformW;
      const filamentW = smoothFilamentW;
      const morphUW = smoothMorphUW;

      // Update shader uniforms
      blobShaderMat.uniforms.uTime.value = elapsed;
      blobShaderMat.uniforms.uDeform.value =
        deformW * (state.activity === 'streaming' ? 1.2 : 1.0);
      blobShaderMat.uniforms.uMorphU.value = morphUW;
      const bloomScale = 0.72 + (state.bloomIntensity ?? 0.85) * 0.34;
      blobShaderMat.uniforms.uGlow.value = glowW * Math.max(0.25, gatherW) * bloomScale;
      blobShaderMat.uniforms.uPointer.value.set(state.pointerX, state.pointerY);
      blobShaderMat.uniforms.uThemeBias.value =
        state.theme === 'amber' ? 0.35 : state.theme === 'cyan' ? -0.25 : 0.0;

      // Subtle pointer-responsive 3D rotation
      rootGroup.rotation.y =
        Math.sin(elapsed * 0.45) * 0.16 * (1 - morphUW * 0.7) + state.pointerX * 0.38;
      rootGroup.rotation.x =
        Math.cos(elapsed * 0.36) * 0.11 * (1 - morphUW * 0.7) - state.pointerY * 0.32;

      coreDarkMat.opacity = 0.84 * glowW * (1 - morphUW * 0.65);

      // Update orbital filaments & C-ring
      const filAlpha = filamentW * (1 - morphUW * 0.55);
      amberFilamentMat.opacity = 0.72 * filAlpha;
      cyanFilamentMat.opacity = 0.48 * filAlpha;
      violetFilamentMat.opacity = 0.45 * filAlpha;
      dendriteLineMat.opacity = 0.52 * filAlpha;

      cRingOuter.rotation.z = cStart + Math.sin(elapsed * 0.42) * 0.08;
      cRingInner.rotation.z = cStart - Math.cos(elapsed * 0.48) * 0.1;
      paraMesh.rotation.z = elapsed * 0.35;
      orbitMeshes.forEach((o, idx) => {
        o.mesh.rotation.z += dt * o.speed * speedMult;
        o.mesh.rotation.x += dt * o.speed * 0.4 * speedMult;
        o.mesh.rotation.y += dt * (idx % 2 === 0 ? 0.18 : -0.18) * speedMult;
      });

      // Highlight the sculptural 3D "U" emblem tube as uEmblemMorphWeight approaches 1
      uEmblemMat.opacity = morphUW * 0.88;

      // Update particle positions (Scatter -> Orbit -> U Emblem)
      for (let i = 0; i < particleCount; i++) {
        const ix = i * 3;
        const ox = orbitCoords[ix];
        const oy = orbitCoords[ix + 1];
        const oz = orbitCoords[ix + 2];

        // Gentle 1x orbital rotation
        const rotAng = elapsed * 0.38 + (i % 5) * 0.12;
        const cosA = Math.cos(rotAng);
        const sinA = Math.sin(rotAng);
        const rotOx = ox * cosA - oz * sinA;
        const rotOz = ox * sinA + oz * cosA;

        // Interpolate scatter -> orbit
        const gatheredX = THREE.MathUtils.lerp(scatterCoords[ix], rotOx, gatherW);
        const gatheredY = THREE.MathUtils.lerp(scatterCoords[ix + 1], oy, gatherW);
        const gatheredZ = THREE.MathUtils.lerp(scatterCoords[ix + 2], rotOz, gatherW);

        // Interpolate orbit -> U emblem
        liveParticleCoords[ix] = THREE.MathUtils.lerp(
          gatheredX,
          uTargetCoords[ix],
          morphUW
        );
        liveParticleCoords[ix + 1] = THREE.MathUtils.lerp(
          gatheredY,
          uTargetCoords[ix + 1],
          morphUW
        );
        liveParticleCoords[ix + 2] = THREE.MathUtils.lerp(
          gatheredZ,
          uTargetCoords[ix + 2],
          morphUW
        );
      }
      posAttr.needsUpdate = true;
      particlesMat.opacity = glowW * 0.85;

      const targetBloom = (state.bloomIntensity ?? 0.85) * 0.72 * glowW;
      bloomPass.strength = targetBloom;
      bloomPass.enabled = targetBloom > 0.01;

      if (!isSoftwareGl && targetBloom > 0.01 && fullScreen) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
      afterDraw(tick);
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      resizeObs.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose());
          else m.material.dispose();
        }
      });
      composer.dispose();
      renderer.dispose();
    };
  }, [fullScreen, size]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
    livePropsRef.current.targetPointerX = Math.max(-1, Math.min(1, nx));
    livePropsRef.current.targetPointerY = Math.max(-1, Math.min(1, ny));
  };

  const handlePointerLeave = () => {
    livePropsRef.current.targetPointerX = 0;
    livePropsRef.current.targetPointerY = 0;
  };

  // Attractive CSS/SVG Fallback if WebGL is unavailable
  if (webglFallback) {
    return (
      <div
        onClick={onClick}
        style={fullScreen ? undefined : { width: size, height: size }}
        className={`relative flex items-center justify-center select-none ${
          fullScreen ? 'w-full h-full' : ''
        } ${interactive ? 'cursor-pointer' : ''} ${className}`}
      >
        <svg
          viewBox="0 0 200 200"
          className="w-4/5 h-4/5 drop-shadow-[0_0_24px_rgba(124,58,237,0.45)]"
          aria-label="ULTRON Energy Core Emblem"
        >
          <defs>
            <radialGradient id="ultronFallbackGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#05050a" />
              <stop offset="55%" stopColor="#3b82f6" stopOpacity="0.45" />
              <stop offset="85%" stopColor="#f59e0b" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#05050a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="82" fill="url(#ultronFallbackGlow)" />
          <circle
            cx="100"
            cy="100"
            r="74"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.5"
            strokeDasharray="340 90"
            strokeLinecap="round"
          />
          <path
            d="M 68 58 L 68 106 A 32 32 0 0 0 132 106 L 132 58"
            fill="none"
            stroke="#e0f2fe"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      role={interactive && onClick ? 'button' : undefined}
      tabIndex={interactive && onClick ? 0 : undefined}
      aria-label="ULTRON 3D Iridescent Energy Core"
      onKeyDown={(e) => {
        if (interactive && onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      style={fullScreen ? undefined : { width: size, height: size }}
      className={`relative flex items-center justify-center select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 rounded-full ${
        fullScreen ? 'w-full h-full' : ''
      } ${interactive && onClick ? 'cursor-pointer' : ''} ${className}`}
    />
  );
};
