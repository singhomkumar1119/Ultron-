import React, { useEffect, useRef } from 'react';
import { type VoiceState, calculateNeuralActivity } from '../utils/ultronLogic';
import { ultronVoiceEngine } from '../utils/ultronVoiceEngine';

interface UltronOrbCanvasProps {
  state?: VoiceState | 'coding' | 'analyzing';
  size?: number;
  interactive?: boolean;
  theme?: 'amber' | 'cyan' | 'violet';
  showBackdropImage?: boolean;
  className?: string;
  onClick?: () => void;
}

interface MicroDendrite {
  points: { r: number; a: number }[];
  twigs: { points: { r: number; a: number }[]; isSilver: boolean }[];
  phase: number;
  speed: number;
  alpha: number;
}

interface DeepCircleArc {
  radiusRatio: number;
  startAngle: number;
  arcLen: number;
  rotSpeed: number;
  width: number;
  colorType: 'gold' | 'amber' | 'copper' | 'silver';
  alpha: number;
  dashed?: boolean;
}

interface RotatingBackCurve {
  rxRatio: number;
  ryRatio: number;
  offsetXRatio: number;
  offsetYRatio: number;
  baseTilt: number;
  rotSpeed: number;
  arcStart: number;
  arcEnd: number;
  width: number;
  alpha: number;
  hasParallelStrand: boolean;
}

export const UltronOrbCanvas: React.FC<UltronOrbCanvasProps> = ({
  state = 'idle',
  size = 400,
  interactive = true,
  theme = 'amber',
  className = '',
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const animFrameRef = useRef<number | null>(null);

  const voiceEnergyRef = useRef(0);
  const isSpeakingRef = useRef(false);
  const showProjectionRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    return ultronVoiceEngine.subscribe((st) => {
      voiceEnergyRef.current = st.energy;
      isSpeakingRef.current = st.isSpeaking;
      showProjectionRef.current = st.showProjectionModal;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isCancelled = false;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(size * dpr);
    canvas.width = W;
    canvas.height = W;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.445;

    const getPalette = () => {
      if (theme === 'cyan') {
        return {
          whiteGold: '235, 252, 255',
          brightGold: '125, 240, 255',
          goldenAmber: '34, 211, 238',
          fieryOrange: '14, 155, 195',
          deepCopper: '12, 95, 135',
          darkRust: '8, 48, 72',
          silverTwig: '165, 220, 235',
        };
      }
      if (theme === 'violet') {
        return {
          whiteGold: '250, 240, 255',
          brightGold: '232, 185, 255',
          goldenAmber: '192, 132, 252',
          fieryOrange: '147, 51, 234',
          deepCopper: '105, 38, 160',
          darkRust: '55, 16, 88',
          silverTwig: '205, 185, 230',
        };
      }
      // Exact palette extracted from WhatsApp_Image_2026-11-04_at_4.41.51_PM_795f87bc.jpeg
      return {
        whiteGold: '255, 250, 212',
        brightGold: '255, 206, 64',
        goldenAmber: '236, 154, 26',
        fieryOrange: '214, 82, 16',
        deepCopper: '164, 58, 14',
        darkRust: '96, 32, 8',
        silverTwig: '162, 182, 176',
      };
    };

    const pal = getPalette();

    // ============================================================================
    // MULTI-LAYER DEPTH EXTRACTION FROM UPLOADED REFERENCE IMAGE
    // (/assets/aistudio/WhatsApp_Image_2026-11-04_at_4.41.51_PM_795f87bc.jpeg)
    //
    // We separate the image into 3 distinct transparent depth sprites:
    // 1. `backCurveSprite`: The outer back-curve orbital rings (dist > 0.87 or in the
    //    open left gap) so the actual back-curve from the image rotates around the circle!
    // 2. `deepCoreSprite`: The inner circles, parabolic loop, secant lines, and fractal
    //    orange-copper dendrites (0.065 < dist < 0.79) for multi-layer breathing depth.
    // 3. `mainHologramSprite`: The full high-definition reference hologram with pure
    //    alpha-keyed black transparency.
    // ============================================================================
    let mainHologramSprite: HTMLCanvasElement | null = null;
    let backCurveSprite: HTMLCanvasElement | null = null;
    let deepCoreSprite: HTMLCanvasElement | null = null;

    const refImg = new Image();
    refImg.crossOrigin = 'anonymous';
    refImg.src = '/assets/aistudio/WhatsApp_Image_2026-11-04_at_4.41.51_PM_795f87bc.jpeg';
    refImg.onload = () => {
      if (isCancelled) return;
      const sSize = 512;

      const makeCanvas = () => {
        const c = document.createElement('canvas');
        c.width = sSize;
        c.height = sSize;
        return c;
      };

      const mainOff = makeCanvas();
      const backOff = makeCanvas();
      const coreOff = makeCanvas();

      const mCtx = mainOff.getContext('2d');
      const bCtx = backOff.getContext('2d');
      const cCtx = coreOff.getContext('2d');
      if (!mCtx || !bCtx || !cCtx) return;

      // Exact center and radius of the orb in WhatsApp_Image_2026-11-04_at_4.41.51_PM_795f87bc.jpeg
      const srcCx = refImg.width * 0.498;
      const srcCy = refImg.height * 0.544;
      const srcHalf = refImg.width * 0.468;

      mCtx.drawImage(
        refImg,
        srcCx - srcHalf,
        srcCy - srcHalf,
        srcHalf * 2,
        srcHalf * 2,
        0,
        0,
        sSize,
        sSize
      );

      const mainData = mCtx.getImageData(0, 0, sSize, sSize);
      const backData = bCtx.createImageData(sSize, sSize);
      const coreData = cCtx.createImageData(sSize, sSize);

      const mPx = mainData.data;
      const bPx = backData.data;
      const cPx = coreData.data;
      const half = sSize / 2;

      for (let y = 0; y < sSize; y++) {
        for (let x = 0; x < sSize; x++) {
          const idx = (y * sSize + x) * 4;
          const r = mPx[idx];
          const g = mPx[idx + 1];
          const b = mPx[idx + 2];

          const dx = (x - half) / half;
          const dy = (y - half) / half;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angleDeg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;

          // Keep the innermost pupil dark and smoothly feather outer edge at dist = 0.985
          let radialMask = 1;
          if (dist < 0.055) {
            radialMask = 0;
          } else if (dist < 0.082) {
            radialMask = (dist - 0.055) / 0.027;
          } else if (dist > 0.985) {
            radialMask = 0;
          } else if (dist > 0.92) {
            radialMask = Math.pow(1 - (dist - 0.92) / 0.065, 1.4);
          }

          // Luminance key so all faint deep circles, secant lines, and outer back-curves are preserved
          const lum = Math.max(r, g * 0.95, b * 0.8) / 255;
          const cleanLum = lum < 0.038 ? 0 : Math.min(1, (lum - 0.038) / 0.78);
          const alpha = Math.pow(cleanLum, 0.96) * radialMask;

          let outR = r;
          let outG = g;
          let outB = b;

          if (theme === 'cyan') {
            outR = Math.min(255, g * 0.65 + 25);
            outG = Math.min(255, r * 0.92 + 25);
            outB = Math.min(255, r * 1.15 + 50);
          } else if (theme === 'violet') {
            outR = Math.min(255, r * 0.95 + 30);
            outG = Math.min(255, g * 0.6 + 15);
            outB = Math.min(255, r * 1.12 + 55);
          } else {
            outR = Math.min(255, Math.round(r * 1.14));
            outG = Math.min(255, Math.round(g * 1.09));
            outB = Math.min(255, Math.round(b * 1.05));
          }

          mPx[idx] = outR;
          mPx[idx + 1] = outG;
          mPx[idx + 2] = outB;
          mPx[idx + 3] = Math.round(alpha * 255);

          // 1. Back-Curve Layer: outer orbital curves outside the C-ring (dist > 0.865)
          //    plus the sweeping back-curve across the left gap (166° < angleDeg < 226° and dist > 0.74)
          const inLeftGap = angleDeg > 166 && angleDeg < 226;
          let backMask = 0;
          if (dist > 0.865 && dist < 0.985) {
            backMask = Math.min(1, (dist - 0.865) / 0.035);
          } else if (inLeftGap && dist > 0.75 && dist < 0.985) {
            backMask = Math.min(1, (dist - 0.75) / 0.05);
          }
          bPx[idx] = outR;
          bPx[idx + 1] = outG;
          bPx[idx + 2] = outB;
          bPx[idx + 3] = Math.round(alpha * backMask * 255);

          // 2. Deep Core Layer: inner circles, parabolic loop, secant lines, and fractal dendrites
          let coreMask = 0;
          if (dist > 0.08 && dist < 0.76) {
            coreMask =
              dist < 0.13
                ? (dist - 0.08) / 0.05
                : dist > 0.66
                  ? (0.76 - dist) / 0.1
                  : 1;
          }
          cPx[idx] = outR;
          cPx[idx + 1] = outG;
          cPx[idx + 2] = outB;
          cPx[idx + 3] = Math.round(alpha * coreMask * 255);
        }
      }

      mCtx.putImageData(mainData, 0, 0);
      bCtx.putImageData(backData, 0, 0);
      cCtx.putImageData(coreData, 0, 0);

      mainHologramSprite = mainOff;
      backCurveSprite = backOff;
      deepCoreSprite = coreOff;
    };

    let seed = 44151795;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    // ============================================================================
    // 1. ROTATING BACK-CURVE ORBITAL LINES AROUND & BEHIND THE CIRCLE
    // ("and back curve line is rotating of the ciecle")
    // In the reference image, sweeping 3D copper-amber curved orbital lines loop
    // behind and outside the main C-ring (top, left across the open C-gap, and
    // bottom/bottom-right). We animate these back-curves so they continuously
    // rotate around the circle in 3D!
    // ============================================================================
    const rotatingBackCurves: RotatingBackCurve[] = [
      // Primary sweeping back-curve loop (matches the prominent bottom-right & left-gap curve)
      {
        rxRatio: 0.995,
        ryRatio: 0.905,
        offsetXRatio: -0.025,
        offsetYRatio: 0.032,
        baseTilt: 0.42,
        rotSpeed: 0.48,
        arcStart: 0,
        arcEnd: Math.PI * 2,
        width: 1.45,
        alpha: 0.62,
        hasParallelStrand: true,
      },
      // Secondary counter-rotating back-curve loop (matches the top & lower-left sweeping arc)
      {
        rxRatio: 0.975,
        ryRatio: 0.885,
        offsetXRatio: -0.03,
        offsetYRatio: -0.02,
        baseTilt: -0.55,
        rotSpeed: -0.36,
        arcStart: 0,
        arcEnd: Math.PI * 2,
        width: 1.25,
        alpha: 0.52,
        hasParallelStrand: true,
      },
      // Third high-eccentricity 3D gyroscopic back-curve sweeping behind the C-ring
      {
        rxRatio: 1.015,
        ryRatio: 0.86,
        offsetXRatio: 0.015,
        offsetYRatio: 0.028,
        baseTilt: 1.15,
        rotSpeed: 0.62,
        arcStart: -0.4,
        arcEnd: Math.PI * 1.45,
        width: 1.15,
        alpha: 0.48,
        hasParallelStrand: false,
      },
      // Fourth deep back-curve bridging the inner side of the left gap (r ~ 0.82R-0.93R)
      {
        rxRatio: 0.92,
        ryRatio: 0.84,
        offsetXRatio: -0.035,
        offsetYRatio: 0.01,
        baseTilt: 2.1,
        rotSpeed: -0.54,
        arcStart: 0.2,
        arcEnd: Math.PI * 1.65,
        width: 1.0,
        alpha: 0.44,
        hasParallelStrand: true,
      },
    ];

    // ============================================================================
    // 2. DEEP INNER CONCENTRIC CIRCLES & SEGMENTED RINGS ("all the lines and ciecles in deep")
    // Traces every concentric circle visible in the deep interior of the reference image:
    // - r = 0.105R (central braided copper-amber eye ring)
    // - r = 0.175R (first inner broken ring around the eye)
    // - r = 0.255R (second deep segmented ring intersecting the secant chords)
    // - r = 0.345R (third deep technical ring intersecting the parabolic loop)
    // - r = 0.465R (fourth mid-depth segmented ring inside the orange dendrite crowns)
    // - r = 0.585R (fifth outer-mid ring at the dendrite fork boundary)
    // - r = 0.715R (sixth fine silver-copper ring where outer rootlets meet)
    // ============================================================================
    const deepCircleArcs: DeepCircleArc[] = [];
    const deepRadiiConfig: {
      r: number;
      segments: number;
      speed: number;
      w: number;
      col: DeepCircleArc['colorType'];
      alpha: number;
      dashed?: boolean;
    }[] = [
      { r: 0.106, segments: 6, speed: 0.35, w: 0.95, col: 'copper', alpha: 0.46 },
      { r: 0.122, segments: 5, speed: -0.28, w: 0.8, col: 'amber', alpha: 0.38, dashed: true },
      { r: 0.178, segments: 7, speed: 0.24, w: 0.85, col: 'amber', alpha: 0.36 },
      { r: 0.258, segments: 8, speed: -0.20, w: 1.0, col: 'gold', alpha: 0.42, dashed: true },
      { r: 0.342, segments: 9, speed: 0.16, w: 0.95, col: 'amber', alpha: 0.38 },
      { r: 0.455, segments: 10, speed: -0.14, w: 0.85, col: 'copper', alpha: 0.34, dashed: true },
      { r: 0.575, segments: 12, speed: 0.12, w: 0.75, col: 'amber', alpha: 0.30 },
      { r: 0.705, segments: 14, speed: -0.10, w: 0.7, col: 'silver', alpha: 0.28, dashed: true },
    ];

    deepRadiiConfig.forEach((cfg) => {
      const step = (Math.PI * 2) / cfg.segments;
      for (let i = 0; i < cfg.segments; i++) {
        if (rand() < 0.18) continue;
        deepCircleArcs.push({
          radiusRatio: cfg.r + (rand() - 0.5) * 0.006,
          startAngle: i * step + (rand() - 0.5) * 0.08,
          arcLen: step * (0.45 + rand() * 0.35),
          rotSpeed: cfg.speed,
          width: cfg.w,
          colorType: cfg.col,
          alpha: cfg.alpha,
          dashed: cfg.dashed,
        });
      }
    });

    // ============================================================================
    // 3. ORGANIC VOLUMETRIC NEURAL DENDRITE PLUMES (44 FINE MULTI-FORKING CLUSTERS)
    // Instead of coarse straight stick-lines, we generate 44 delicate, crinkled
    // root-like filaments arranged in radial plumes that match the exact fiery-orange
    // inner branches and silvery-sage outer rootlets of the reference image.
    // ============================================================================
    const microDendrites: MicroDendrite[] = [];
    const plumeCount = 44;

    for (let i = 0; i < plumeCount; i++) {
      const baseAngle = (i / plumeCount) * Math.PI * 2 + (rand() - 0.5) * 0.06;
      const deg = ((baseAngle * 180) / Math.PI + 360) % 360;
      const inLeftGap = deg > 165 && deg < 225;
      const startR = 0.13 + rand() * 0.06;
      const maxR = inLeftGap ? 0.58 + rand() * 0.12 : 0.68 + rand() * 0.11;

      const steps = 14;
      const pts: { r: number; a: number }[] = [];
      let curA = baseAngle;
      for (let s = 0; s <= steps; s++) {
        const f = s / steps;
        const r = startR + f * (maxR - startR);
        curA += s === 0 ? 0 : (rand() - 0.5) * 0.085;
        pts.push({ r, a: curA });
      }

      const twigs: MicroDendrite['twigs'] = [];
      const numTwigs = 2 + Math.floor(rand() * 3);
      for (let t = 0; t < numTwigs; t++) {
        const branchIdx = 5 + Math.floor(rand() * (steps - 6));
        const origin = pts[branchIdx];
        const dir = t % 2 === 0 ? 1 : -1;
        const tPts: { r: number; a: number }[] = [{ r: origin.r, a: origin.a }];
        let tA = origin.a + dir * (0.035 + rand() * 0.05);
        let tR = origin.r;
        const tSteps = 5;
        for (let k = 1; k <= tSteps; k++) {
          tR += (maxR + 0.055 - origin.r) / tSteps;
          tA += dir * (0.02 + rand() * 0.04) + (rand() - 0.5) * 0.05;
          tPts.push({ r: tR, a: tA });
        }
        twigs.push({
          points: tPts,
          isSilver: tR > 0.64,
        });
      }

      microDendrites.push({
        points: pts,
        twigs,
        phase: rand() * Math.PI * 2,
        speed: 1.4 + rand() * 1.5,
        alpha: 0.32 + rand() * 0.26,
      });
    }

    // ============================================================================
    // 4. FINE OPTICAL MICRO-SEGMENTS ALONG THE C-RING & SPLIT RIGHT TRACK
    // Aligned to the reference image's C-ring (`-131°` clockwise to `+164°`)
    // ============================================================================
    const startC = (-131 * Math.PI) / 180; // 229° (10:30 o'clock upper-left jaw)
    const endC = (164 * Math.PI) / 180; // 164° (8:20 o'clock lower-left jaw)
    const totalCSpan = endC - startC;

    const cRingTicks: {
      trackIdx: number;
      rRatio: number;
      angle: number;
      arcLen: number;
      width: number;
      phase: number;
      isHighlight: boolean;
    }[] = [];

    const cTrackRadii = [0.838, 0.858, 0.878, 0.896];
    cTrackRadii.forEach((rRatio, tIdx) => {
      const count = 64 + tIdx * 6;
      const step = totalCSpan / count;
      for (let i = 0; i < count; i++) {
        // Leave organic dark notches like the reference image
        if ((i + tIdx * 3) % 9 === 0 || (i * 5 + tIdx) % 13 === 0) continue;
        cRingTicks.push({
          trackIdx: tIdx,
          rRatio,
          angle: startC + i * step,
          arcLen: step * (0.62 + rand() * 0.25),
          width: tIdx === 1 || tIdx === 2 ? 1.35 : 0.95,
          phase: rand() * Math.PI * 2,
          isHighlight: i < 5 || i > count - 6 || rand() > 0.55,
        });
      }
    });

    // Outer split golden track on the right / lower-right (2:00 to 5:30 o'clock)
    [0.916, 0.936].forEach((rRatio, idx) => {
      const subStart = (-18 + idx * 6) * (Math.PI / 180);
      const subEnd = (68 + idx * 5) * (Math.PI / 180);
      const count = 22;
      const step = (subEnd - subStart) / count;
      for (let i = 0; i < count; i++) {
        if (i % 6 === 3) continue;
        cRingTicks.push({
          trackIdx: 4 + idx,
          rRatio,
          angle: subStart + i * step,
          arcLen: step * 0.68,
          width: 1.05,
          phase: rand() * Math.PI * 2,
          isHighlight: rand() > 0.5,
        });
      }
    });

    let lastTime = performance.now();
    let elapsed = 0;

    const render = (now: number) => {
      if (isCancelled) return;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (isSpeakingRef.current && showProjectionRef.current) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const rawState = stateRef.current;
      const activeState: VoiceState =
        rawState === 'coding' || rawState === 'analyzing' ? 'thinking' : rawState;
      const liveVoice = voiceEnergyRef.current;
      const isVoiceActive = (isSpeakingRef.current || activeState === 'speaking') && liveVoice > 0.02;

      const speedMult =
        activeState === 'speaking' || isVoiceActive
          ? 1.55 + liveVoice * 0.9
          : activeState === 'thinking'
            ? 1.32
            : activeState === 'listening'
              ? 1.15
              : 0.95;

      elapsed += dt * speedMult;

      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;
      const tiltX = mouseRef.current.x * (size * 0.022);
      const tiltY = mouseRef.current.y * (size * 0.022);

      const activity = calculateNeuralActivity(activeState, elapsed);
      const pulseBoost = isVoiceActive
        ? liveVoice * 0.45
        : activity.dendriteBrightness * 0.15;

      ctx.clearRect(0, 0, size, size);

      const scaleLine = Math.max(0.55, size / 400);
      const subtleSway = Math.sin(elapsed * 0.4) * 0.016;

      // ==========================================================================
      // LAYER 1: ROTATING BACK-CURVE LINES BEHIND & AROUND THE CIRCLE
      // ("and back curve line is rotating of the ciecle")
      // Both the extracted outer back-curve sprite AND the 3D elliptical copper-gold
      // back-curve ribbons continuously rotate around the main circle!
      // ==========================================================================
      ctx.save();
      ctx.translate(cx + tiltX * 0.3, cy + tiltY * 0.3);

      // 1A. Rotate the extracted back-curve layer from the reference image continuously
      if (backCurveSprite) {
        ctx.save();
        ctx.rotate(elapsed * 0.42);
        const backScale = 1.0 + Math.sin(elapsed * 1.4) * 0.012 + (isVoiceActive ? liveVoice * 0.03 : 0);
        const backDiam = R * 2.12 * backScale;
        ctx.globalAlpha = 0.85 + pulseBoost * 0.15;
        ctx.drawImage(backCurveSprite, -backDiam / 2, -backDiam / 2, backDiam, backDiam);
        ctx.restore();

        // Counter-rotating secondary back-curve ghost for continuous 3D orbital depth
        ctx.save();
        ctx.rotate(-elapsed * 0.28 + 1.2);
        const backDiam2 = R * 2.10;
        ctx.globalAlpha = 0.52 + pulseBoost * 0.18;
        ctx.drawImage(backCurveSprite, -backDiam2 / 2, -backDiam2 / 2, backDiam2, backDiam2);
        ctx.restore();
      }

      ctx.globalCompositeOperation = 'lighter';

      // 1B. Render the 3D rotating elliptical back-curve lines sweeping around the circle
      for (let i = 0; i < rotatingBackCurves.length; i++) {
        const bc = rotatingBackCurves[i];
        const curRot = bc.baseTilt + elapsed * bc.rotSpeed;
        const ox = R * bc.offsetXRatio * Math.cos(elapsed * 0.5 + i);
        const oy = R * bc.offsetYRatio * Math.sin(elapsed * 0.5 + i);
        const rx = R * bc.rxRatio;
        const ry = R * bc.ryRatio;

        ctx.save();
        ctx.translate(ox, oy);

        // Soft warm copper-amber outer glow along the rotating back-curve
        ctx.strokeStyle = `rgba(${pal.deepCopper}, ${(bc.alpha * 0.55) + pulseBoost * 0.15})`;
        ctx.lineWidth = (bc.width * 2.4) * scaleLine;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, curRot, bc.arcStart, bc.arcEnd);
        ctx.stroke();

        // Crisp golden-amber core filament of the rotating back-curve
        ctx.strokeStyle = `rgba(${pal.goldenAmber}, ${bc.alpha + pulseBoost * 0.22})`;
        ctx.lineWidth = bc.width * scaleLine;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, curRot, bc.arcStart, bc.arcEnd);
        ctx.stroke();

        // Fine braided companion back-curve strand
        if (bc.hasParallelStrand) {
          ctx.strokeStyle = `rgba(${pal.fieryOrange}, ${(bc.alpha * 0.65) + pulseBoost * 0.15})`;
          ctx.lineWidth = (bc.width * 0.65) * scaleLine;
          ctx.setLineDash([8 * scaleLine, 5 * scaleLine, 2 * scaleLine, 5 * scaleLine]);
          ctx.beginPath();
          ctx.ellipse(0, 0, rx * 0.986, ry * 1.012, curRot + 0.04, bc.arcStart, bc.arcEnd);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Travelling bright golden node riding along the rotating back-curve
        const headAngle = (elapsed * bc.rotSpeed * 1.8 + i * 1.7) % (Math.PI * 2);
        const cosR = Math.cos(curRot);
        const sinR = Math.sin(curRot);
        const ex = rx * Math.cos(headAngle);
        const ey = ry * Math.sin(headAngle);
        const px = ex * cosR - ey * sinR;
        const py = ex * sinR + ey * cosR;

        const nodeGlow = ctx.createRadialGradient(px, py, 0, px, py, R * 0.06);
        nodeGlow.addColorStop(0, `rgba(${pal.whiteGold}, ${0.65 + pulseBoost * 0.25})`);
        nodeGlow.addColorStop(0.4, `rgba(${pal.goldenAmber}, 0.25)`);
        nodeGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nodeGlow;
        ctx.beginPath();
        ctx.arc(px, py, R * 0.06, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
      ctx.restore();

      // ==========================================================================
      // LAYER 2: AUTHENTIC HIGH-DEFINITION HOLOGRAM SPRITE & PULSING DEEP CORE
      // (/assets/aistudio/WhatsApp_Image_2026-11-04_at_4.41.51_PM_795f87bc.jpeg)
      // Preserves 100% of the intricate organic branches, deep circles, secant
      // lines, and golden C-ring without covering them with artificial shapes.
      // ==========================================================================
      if (mainHologramSprite) {
        ctx.save();
        ctx.translate(cx + tiltX * 0.48, cy + tiltY * 0.48);
        ctx.rotate(subtleSway);

        const breath =
          1.0 + Math.sin(elapsed * 1.5) * 0.008 + (isVoiceActive ? liveVoice * 0.035 : 0);
        const drawDiam = R * 2.12 * breath;

        ctx.globalAlpha = 0.98;
        ctx.drawImage(mainHologramSprite, -drawDiam / 2, -drawDiam / 2, drawDiam, drawDiam);

        // Animated deep core layer so the inner dendrites and deep circles breathe organically
        if (deepCoreSprite) {
          ctx.save();
          const corePulse =
            1.0 + Math.sin(elapsed * 2.3) * 0.022 + (isVoiceActive ? liveVoice * 0.065 : 0);
          const coreDiam = R * 2.12 * corePulse;
          ctx.rotate(Math.sin(elapsed * 0.95) * 0.028);
          ctx.globalAlpha = 0.44 + pulseBoost * 0.4;
          ctx.drawImage(deepCoreSprite, -coreDiam / 2, -coreDiam / 2, coreDiam, coreDiam);
          ctx.restore();
        }

        ctx.restore();
      }

      // ==========================================================================
      // LAYER 3: ALL DEEP CONCENTRIC CIRCLES, TILTED PARABOLIC/TRIANGULAR LOOP,
      // AND STRAIGHT SECANT CHORD LINES ("see the all the lines and ciecles in deep")
      // ==========================================================================
      ctx.save();
      ctx.translate(cx + tiltX * 0.55, cy + tiltY * 0.55);
      ctx.rotate(subtleSway);
      ctx.globalCompositeOperation = 'lighter';

      // 3A. Concentric rotating segmented circles across 7 radial depths (0.106R to 0.705R)
      for (let i = 0; i < deepCircleArcs.length; i++) {
        const arc = deepCircleArcs[i];
        const a0 = arc.startAngle + elapsed * arc.rotSpeed;
        const a1 = a0 + arc.arcLen;
        const rad = R * arc.radiusRatio;

        const colStr =
          arc.colorType === 'gold'
            ? pal.brightGold
            : arc.colorType === 'amber'
              ? pal.goldenAmber
              : arc.colorType === 'silver'
                ? pal.silverTwig
                : pal.deepCopper;

        ctx.strokeStyle = `rgba(${colStr}, ${arc.alpha + pulseBoost * 0.2})`;
        ctx.lineWidth = arc.width * scaleLine;
        if (arc.dashed) {
          ctx.setLineDash([3 * scaleLine, 3 * scaleLine]);
        }
        ctx.beginPath();
        ctx.arc(0, 0, rad, a0, a1);
        ctx.stroke();
        if (arc.dashed) {
          ctx.setLineDash([]);
        }
      }

      // 3B. The Iconic Tilted Rounded-Triangular / Parabolic Golden-Cream Loop
      // (Vertices at ~11:00, ~7:00, and sweeping apex out to ~3:45 o'clock at r ~ 0.47R)
      const triTilt = 0.36 + Math.sin(elapsed * 0.6) * 0.025; // ~21 degrees (pointing to 3:45)
      for (let strand = 0; strand < 3; strand++) {
        const strandOffset = (strand - 1) * 0.011;
        ctx.beginPath();
        const steps = 120;
        for (let s = 0; s <= steps; s++) {
          const theta = (s / steps) * Math.PI * 2;
          const rel = theta - triTilt;
          // Polar equation of the rounded-triangular parabolic loop skewed to the right
          const rNorm =
            0.305 +
            strandOffset +
            0.095 * Math.cos(rel) +
            0.052 * Math.cos(3 * rel) +
            0.012 * Math.sin(2 * rel + elapsed * 1.5);
          const x = Math.cos(theta) * (R * rNorm);
          const y = Math.sin(theta) * (R * rNorm);
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle =
          strand === 1
            ? `rgba(${pal.whiteGold}, ${0.34 + pulseBoost * 0.22})`
            : `rgba(${pal.goldenAmber}, ${0.24 + pulseBoost * 0.16})`;
        ctx.lineWidth = (strand === 1 ? 0.95 : 0.65) * scaleLine;
        ctx.setLineDash(
          strand === 1
            ? [5 * scaleLine, 3 * scaleLine, 1.5 * scaleLine, 3 * scaleLine]
            : [3 * scaleLine, 4 * scaleLine]
        );
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 3C. Crisp Straight Secant Chords & Diagonal Laser Guidelines in Deep Space
      // Matches the intersecting straight lines to the left of the central eye and from the 10:30 jaw
      const deepChords = [
        // Primary steep secant chord slicing from ~11:15 down-left to ~7:15
        { x0: -0.05, y0: -0.36, x1: -0.27, y1: 0.34, col: pal.whiteGold, alpha: 0.34, w: 0.85 },
        // Secondary intersecting chord slicing from ~10:45 down-right to ~5:30
        { x0: -0.22, y0: -0.28, x1: 0.06, y1: 0.44, col: pal.silverTwig, alpha: 0.30, w: 0.75 },
        // Lower-right secant chord connecting ~5:30 to ~3:30 apex
        { x0: -0.02, y0: 0.38, x1: 0.44, y1: 0.14, col: pal.goldenAmber, alpha: 0.28, w: 0.75 },
        // Upper-right secant chord connecting ~11:15 to ~3:30 apex
        { x0: -0.04, y0: -0.29, x1: 0.43, y1: 0.10, col: pal.goldenAmber, alpha: 0.26, w: 0.7 },
        // Two parallel diagonal laser guidelines extending from upper-left jaw (~10:30)
        { x0: -0.74, y0: -0.52, x1: -0.18, y1: 0.04, col: pal.goldenAmber, alpha: 0.28, w: 0.7 },
        { x0: -0.71, y0: -0.56, x1: -0.14, y1: -0.01, col: pal.deepCopper, alpha: 0.24, w: 0.65 },
      ];

      for (const ch of deepChords) {
        ctx.strokeStyle = `rgba(${ch.col}, ${ch.alpha + pulseBoost * 0.16})`;
        ctx.lineWidth = ch.w * scaleLine;
        ctx.beginPath();
        ctx.moveTo(R * ch.x0, R * ch.y0);
        ctx.lineTo(R * ch.x1, R * ch.y1);
        ctx.stroke();
      }
      ctx.restore();

      // ==========================================================================
      // LAYER 4: FINE ORGANIC FRACTAL DENDRITE FILAMENTS & SILVER OUTER ROOTLETS
      // ==========================================================================
      ctx.save();
      ctx.translate(cx + tiltX * 0.52, cy + tiltY * 0.52);
      ctx.rotate(subtleSway);
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < microDendrites.length; i++) {
        const md = microDendrites[i];
        const wave = 0.5 + 0.5 * Math.sin(elapsed * md.speed + md.phase);
        const alpha = md.alpha * (0.45 + 0.55 * wave) + pulseBoost * 0.22;

        ctx.beginPath();
        for (let p = 0; p < md.points.length; p++) {
          const pt = md.points[p];
          const a = pt.a + Math.sin(elapsed * 2.0 + p * 0.7 + md.phase) * 0.006;
          const r =
            R *
            (pt.r + (isVoiceActive ? liveVoice * 0.02 * Math.sin(p + elapsed * 6) : 0));
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (p === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${pal.fieryOrange}, ${alpha})`;
        ctx.lineWidth = 0.75 * scaleLine;
        ctx.stroke();

        for (let t = 0; t < md.twigs.length; t++) {
          const tw = md.twigs[t];
          ctx.beginPath();
          for (let k = 0; k < tw.points.length; k++) {
            const pt = tw.points[k];
            const a = pt.a + Math.cos(elapsed * 1.7 + k) * 0.005;
            const r = R * pt.r;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (k === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = tw.isSilver
            ? `rgba(${pal.silverTwig}, ${alpha * 0.55})`
            : `rgba(${pal.fieryOrange}, ${alpha * 0.75})`;
          ctx.lineWidth = (tw.isSilver ? 0.55 : 0.68) * scaleLine;
          ctx.stroke();
        }
      }
      ctx.restore();

      // ==========================================================================
      // LAYER 5: C-SHAPED MULTI-TRACK GOLDEN OPTICAL TICKS & INWARD JAWS
      // ==========================================================================
      ctx.save();
      ctx.translate(cx + tiltX * 0.48, cy + tiltY * 0.48);
      ctx.rotate(subtleSway);
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < cRingTicks.length; i++) {
        const tk = cRingTicks[i];
        const dir = tk.trackIdx % 2 === 0 ? 1 : -1;
        const aShift = Math.sin(elapsed * 2.0 + tk.phase) * 0.005 * dir;
        const a0 = tk.angle + aShift;
        const a1 = a0 + tk.arcLen;
        const rad = R * tk.rRatio;

        const shimmer = 0.6 + 0.4 * Math.sin(elapsed * 3.2 + tk.phase);
        const alpha = (tk.isHighlight ? 0.48 : 0.30) * shimmer + pulseBoost * 0.22;

        ctx.strokeStyle = tk.isHighlight
          ? `rgba(${pal.brightGold}, ${alpha})`
          : `rgba(${pal.goldenAmber}, ${alpha})`;
        ctx.lineWidth = tk.width * scaleLine;
        ctx.beginPath();
        ctx.arc(0, 0, rad, a0, a1);
        ctx.stroke();
      }

      // Subtle glowing energy flare on the two inward-hooked jaws (-131° and +164°)
      const jawAngles = [startC, endC];
      for (const ja of jawAngles) {
        const jx = Math.cos(ja) * (R * 0.83);
        const jy = Math.sin(ja) * (R * 0.83);
        const jGlow = ctx.createRadialGradient(jx, jy, R * 0.005, jx, jy, R * 0.085);
        jGlow.addColorStop(0, `rgba(${pal.whiteGold}, ${0.32 + pulseBoost * 0.22})`);
        jGlow.addColorStop(0.5, `rgba(${pal.brightGold}, ${0.14 + pulseBoost * 0.12})`);
        jGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = jGlow;
        ctx.beginPath();
        ctx.arc(jx, jy, R * 0.085, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isCancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [size, theme]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    mouseRef.current.targetX = nx;
    mouseRef.current.targetY = ny;
  };

  const handleMouseLeave = () => {
    mouseRef.current.targetX = 0;
    mouseRef.current.targetY = 0;
  };

  const handleBlobClick = () => {
    if (onClick) {
      onClick();
    } else {
      ultronVoiceEngine.triggerBlobTapSpeech();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={interactive ? handleBlobClick : onClick}
      title={
        interactive
          ? 'Tap Holographic Core to Project Full-Display Matrix & Hear Voice'
          : undefined
      }
      className={`relative flex items-center justify-center select-none ${
        interactive ? 'cursor-pointer group' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full pointer-events-none transition-transform duration-300 group-hover:scale-[1.03] active:scale-95"
      />
    </div>
  );
};
