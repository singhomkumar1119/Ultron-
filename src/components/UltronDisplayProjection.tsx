import React, { useEffect, useRef, useState } from 'react';
import { Volume2, X, Sparkles, Radio } from 'lucide-react';
import { ultronVoiceEngine } from '../utils/ultronVoiceEngine';

interface UltronDisplayProjectionProps {
  theme?: 'amber' | 'cyan' | 'violet';
  soundEnabled?: boolean;
}

export const UltronDisplayProjection: React.FC<UltronDisplayProjectionProps> = ({
  theme = 'amber',
}) => {
  const [voiceState, setVoiceState] = useState({
    isSpeaking: false,
    text: '',
    energy: 0,
    progress: 0,
    showProjectionModal: false,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const voiceStateRef = useRef(voiceState);
  voiceStateRef.current = voiceState;

  useEffect(() => {
    return ultronVoiceEngine.subscribe((st) => {
      setVoiceState(st);
    });
  }, []);

  useEffect(() => {
    if (!voiceState.isSpeaking || !voiceState.showProjectionModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        ultronVoiceEngine.stop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [voiceState.isSpeaking, voiceState.showProjectionModal]);

  useEffect(() => {
    if (!voiceState.isSpeaking || !voiceState.showProjectionModal) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number | null = null;
    let isCancelled = false;

    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const S = Math.min(W, H) * 0.9;
    const R = S * 0.44;

    let whiteGold = '255, 250, 212';
    let brightGold = '255, 206, 64';
    let goldenAmber = '236, 154, 26';
    let fieryOrange = '214, 82, 16';
    let deepCopper = '164, 58, 14';
    let silverTwig = '162, 182, 176';

    if (theme === 'cyan') {
      whiteGold = '235, 252, 255';
      brightGold = '125, 240, 255';
      goldenAmber = '34, 211, 238';
      fieryOrange = '14, 155, 195';
      deepCopper = '12, 95, 135';
      silverTwig = '165, 220, 235';
    } else if (theme === 'violet') {
      whiteGold = '250, 240, 255';
      brightGold = '232, 185, 255';
      goldenAmber = '192, 132, 252';
      fieryOrange = '147, 51, 234';
      deepCopper = '105, 38, 160';
      silverTwig = '205, 185, 230';
    }

    // Multi-layer depth extraction from WhatsApp_Image_2026-11-04_at_4.41.51_PM_795f87bc.jpeg
    let mainHologramSprite: HTMLCanvasElement | null = null;
    let backCurveSprite: HTMLCanvasElement | null = null;
    let deepCoreSprite: HTMLCanvasElement | null = null;

    const refImg = new Image();
    refImg.crossOrigin = 'anonymous';
    refImg.src = '/assets/aistudio/WhatsApp_Image_2026-11-04_at_4.41.51_PM_795f87bc.jpeg';
    refImg.onload = () => {
      if (isCancelled) return;
      const sSize = 440;

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

    // 1. Rotating Back-Curve Orbital Lines behind & around the circle
    const rotatingBackCurves = [
      {
        rxRatio: 0.995,
        ryRatio: 0.905,
        offsetXRatio: -0.025,
        offsetYRatio: 0.032,
        baseTilt: 0.42,
        rotSpeed: 0.52,
        arcStart: 0,
        arcEnd: Math.PI * 2,
        width: 1.8,
        alpha: 0.65,
        hasParallelStrand: true,
      },
      {
        rxRatio: 0.975,
        ryRatio: 0.885,
        offsetXRatio: -0.03,
        offsetYRatio: -0.02,
        baseTilt: -0.55,
        rotSpeed: -0.38,
        arcStart: 0,
        arcEnd: Math.PI * 2,
        width: 1.5,
        alpha: 0.55,
        hasParallelStrand: true,
      },
      {
        rxRatio: 1.015,
        ryRatio: 0.86,
        offsetXRatio: 0.015,
        offsetYRatio: 0.028,
        baseTilt: 1.15,
        rotSpeed: 0.66,
        arcStart: -0.4,
        arcEnd: Math.PI * 1.45,
        width: 1.4,
        alpha: 0.50,
        hasParallelStrand: false,
      },
      {
        rxRatio: 0.92,
        ryRatio: 0.84,
        offsetXRatio: -0.035,
        offsetYRatio: 0.01,
        baseTilt: 2.1,
        rotSpeed: -0.58,
        arcStart: 0.2,
        arcEnd: Math.PI * 1.65,
        width: 1.25,
        alpha: 0.46,
        hasParallelStrand: true,
      },
    ];

    // 2. Deep Inner Concentric Circles
    const deepCircleArcs: {
      radiusRatio: number;
      startAngle: number;
      arcLen: number;
      rotSpeed: number;
      width: number;
      col: string;
      alpha: number;
      dashed?: boolean;
    }[] = [];

    const deepRadiiConfig = [
      { r: 0.106, segments: 6, speed: 0.35, w: 1.2, col: deepCopper, alpha: 0.48 },
      { r: 0.122, segments: 5, speed: -0.28, w: 1.0, col: goldenAmber, alpha: 0.40, dashed: true },
      { r: 0.178, segments: 7, speed: 0.24, w: 1.05, col: goldenAmber, alpha: 0.38 },
      { r: 0.258, segments: 8, speed: -0.20, w: 1.2, col: brightGold, alpha: 0.44, dashed: true },
      { r: 0.342, segments: 9, speed: 0.16, w: 1.15, col: goldenAmber, alpha: 0.40 },
      { r: 0.455, segments: 10, speed: -0.14, w: 1.05, col: deepCopper, alpha: 0.36, dashed: true },
      { r: 0.575, segments: 12, speed: 0.12, w: 0.95, col: goldenAmber, alpha: 0.32 },
      { r: 0.705, segments: 14, speed: -0.10, w: 0.85, col: silverTwig, alpha: 0.30, dashed: true },
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
          col: cfg.col,
          alpha: cfg.alpha,
          dashed: cfg.dashed,
        });
      }
    });

    // 3. Organic Micro-Dendrite Filaments
    const microDendrites = Array.from({ length: 44 }, (_, i) => {
      const baseAngle = (i / 44) * Math.PI * 2 + (rand() - 0.5) * 0.06;
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

      const twigs: { points: { r: number; a: number }[]; isSilver: boolean }[] = [];
      for (let t = 0; t < 3; t++) {
        const branchIdx = 5 + Math.floor(rand() * (steps - 6));
        const origin = pts[branchIdx];
        const dir = t % 2 === 0 ? 1 : -1;
        const tPts: { r: number; a: number }[] = [{ r: origin.r, a: origin.a }];
        let tA = origin.a + dir * (0.035 + rand() * 0.05);
        let tR = origin.r;
        for (let k = 1; k <= 5; k++) {
          tR += (maxR + 0.055 - origin.r) / 5;
          tA += dir * (0.02 + rand() * 0.04) + (rand() - 0.5) * 0.05;
          tPts.push({ r: tR, a: tA });
        }
        twigs.push({ points: tPts, isSilver: tR > 0.64 });
      }

      return {
        points: pts,
        twigs,
        phase: rand() * Math.PI * 2,
        speed: 1.4 + rand() * 1.5,
        alpha: 0.34 + rand() * 0.25,
      };
    });

    // 4. Fine C-Ring Optical Micro-Segments
    const startC = (-131 * Math.PI) / 180;
    const endC = (164 * Math.PI) / 180;
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

    [0.838, 0.858, 0.878, 0.896].forEach((rRatio, tIdx) => {
      const count = 64 + tIdx * 6;
      const step = totalCSpan / count;
      for (let i = 0; i < count; i++) {
        if ((i + tIdx * 3) % 9 === 0 || (i * 5 + tIdx) % 13 === 0) continue;
        cRingTicks.push({
          trackIdx: tIdx,
          rRatio,
          angle: startC + i * step,
          arcLen: step * (0.62 + rand() * 0.25),
          width: tIdx === 1 || tIdx === 2 ? 1.65 : 1.15,
          phase: rand() * Math.PI * 2,
          isHighlight: i < 5 || i > count - 6 || rand() > 0.55,
        });
      }
    });

    const startTime = performance.now();
    let lastFrameTime = 0;

    const draw = (now: number) => {
      if (isCancelled) return;
      animId = requestAnimationFrame(draw);
      if (now - lastFrameTime < 32) return;
      lastFrameTime = now;

      const elapsed = (now - startTime) / 1000;
      const liveState = ultronVoiceEngine.getLiveState();
      const energy = liveState.energy;

      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      const expandScale = Math.min(1, elapsed / 0.32);
      const subtleSway = Math.sin(elapsed * 0.4) * 0.016;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(expandScale, expandScale);

      // 1. ROTATING BACK-CURVE LINES BEHIND & AROUND THE CIRCLE
      ctx.save();

      if (backCurveSprite) {
        ctx.save();
        ctx.rotate(elapsed * 0.45);
        const backDiam = R * 2.12 * (1 + Math.sin(elapsed * 1.5) * 0.012 + energy * 0.03);
        ctx.globalAlpha = 0.88 + energy * 0.12;
        ctx.drawImage(backCurveSprite, -backDiam / 2, -backDiam / 2, backDiam, backDiam);
        ctx.restore();
      }

      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < rotatingBackCurves.length; i++) {
        const bc = rotatingBackCurves[i];
        const curRot = bc.baseTilt + elapsed * bc.rotSpeed;
        const ox = R * bc.offsetXRatio * Math.cos(elapsed * 0.5 + i);
        const oy = R * bc.offsetYRatio * Math.sin(elapsed * 0.5 + i);
        const rx = R * bc.rxRatio;
        const ry = R * bc.ryRatio;

        ctx.save();
        ctx.translate(ox, oy);

        ctx.strokeStyle = `rgba(${deepCopper}, ${bc.alpha * 0.55 + energy * 0.15})`;
        ctx.lineWidth = bc.width * 2.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, curRot, bc.arcStart, bc.arcEnd);
        ctx.stroke();

        ctx.strokeStyle = `rgba(${goldenAmber}, ${bc.alpha + energy * 0.25})`;
        ctx.lineWidth = bc.width;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, curRot, bc.arcStart, bc.arcEnd);
        ctx.stroke();

        if (bc.hasParallelStrand) {
          ctx.strokeStyle = `rgba(${fieryOrange}, ${bc.alpha * 0.65 + energy * 0.15})`;
          ctx.lineWidth = bc.width * 0.65;
          ctx.setLineDash([10, 6, 3, 6]);
          ctx.beginPath();
          ctx.ellipse(0, 0, rx * 0.986, ry * 1.012, curRot + 0.04, bc.arcStart, bc.arcEnd);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
      ctx.restore();

      // 2. AUTHENTIC HIGH-DEFINITION HOLOGRAM SPRITE
      if (mainHologramSprite) {
        ctx.save();
        ctx.rotate(subtleSway);
        const dSize = R * 2.12 * (1 + Math.sin(elapsed * 1.6) * 0.01 + energy * 0.035);
        ctx.globalAlpha = 0.98;
        ctx.drawImage(mainHologramSprite, -dSize / 2, -dSize / 2, dSize, dSize);
        ctx.restore();
      }

      // 3. DEEP CONCENTRIC CIRCLES, TILTED PARABOLIC LOOP & SECANT CHORD LINES
      ctx.save();
      ctx.rotate(subtleSway);
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < deepCircleArcs.length; i++) {
        const arc = deepCircleArcs[i];
        const a0 = arc.startAngle + elapsed * arc.rotSpeed;
        const a1 = a0 + arc.arcLen;
        ctx.strokeStyle = `rgba(${arc.col}, ${arc.alpha + energy * 0.22})`;
        ctx.lineWidth = arc.width;
        if (arc.dashed) ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, R * arc.radiusRatio, a0, a1);
        ctx.stroke();
        if (arc.dashed) ctx.setLineDash([]);
      }

      // Tilted Rounded-Triangular / Parabolic Golden-Cream Loop
      const triTilt = 0.36 + Math.sin(elapsed * 0.6) * 0.025;
      for (let strand = 0; strand < 3; strand++) {
        const strandOffset = (strand - 1) * 0.011;
        ctx.beginPath();
        const steps = 120;
        for (let s = 0; s <= steps; s++) {
          const theta = (s / steps) * Math.PI * 2;
          const rel = theta - triTilt;
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
            ? `rgba(${whiteGold}, ${0.36 + energy * 0.25})`
            : `rgba(${goldenAmber}, ${0.26 + energy * 0.18})`;
        ctx.lineWidth = strand === 1 ? 1.2 : 0.85;
        ctx.setLineDash(strand === 1 ? [6, 4, 2, 4] : [4, 5]);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Deep Straight Secant Chords & Diagonal Guidelines
      const deepChords = [
        { x0: -0.05, y0: -0.36, x1: -0.27, y1: 0.34, col: whiteGold, alpha: 0.36, w: 1.05 },
        { x0: -0.22, y0: -0.28, x1: 0.06, y1: 0.44, col: silverTwig, alpha: 0.32, w: 0.9 },
        { x0: -0.02, y0: 0.38, x1: 0.44, y1: 0.14, col: goldenAmber, alpha: 0.30, w: 0.9 },
        { x0: -0.04, y0: -0.29, x1: 0.43, y1: 0.10, col: goldenAmber, alpha: 0.28, w: 0.85 },
        { x0: -0.74, y0: -0.52, x1: -0.18, y1: 0.04, col: goldenAmber, alpha: 0.30, w: 0.85 },
        { x0: -0.71, y0: -0.56, x1: -0.14, y1: -0.01, col: deepCopper, alpha: 0.26, w: 0.8 },
      ];
      for (const ch of deepChords) {
        ctx.strokeStyle = `rgba(${ch.col}, ${ch.alpha + energy * 0.18})`;
        ctx.lineWidth = ch.w;
        ctx.beginPath();
        ctx.moveTo(R * ch.x0, R * ch.y0);
        ctx.lineTo(R * ch.x1, R * ch.y1);
        ctx.stroke();
      }
      ctx.restore();

      // 4. ORGANIC FRACTAL DENDRITE FILAMENTS & SILVER OUTER ROOTLETS
      ctx.save();
      ctx.rotate(subtleSway);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < microDendrites.length; i++) {
        const md = microDendrites[i];
        const wave = 0.5 + 0.5 * Math.sin(elapsed * md.speed + md.phase);
        const alpha = md.alpha * (0.45 + 0.55 * wave) + energy * 0.25;

        ctx.beginPath();
        for (let p = 0; p < md.points.length; p++) {
          const pt = md.points[p];
          const a = pt.a + Math.sin(elapsed * 2.0 + p * 0.7 + md.phase) * 0.006;
          const r = R * (pt.r + energy * 0.022 * Math.sin(p + elapsed * 6));
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (p === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${fieryOrange}, ${alpha})`;
        ctx.lineWidth = 0.95;
        ctx.stroke();

        for (let t = 0; t < md.twigs.length; t++) {
          const tw = md.twigs[t];
          ctx.beginPath();
          for (let k = 0; k < tw.points.length; k++) {
            const pt = tw.points[k];
            const x = Math.cos(pt.a) * (R * pt.r);
            const y = Math.sin(pt.a) * (R * pt.r);
            if (k === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = tw.isSilver
            ? `rgba(${silverTwig}, ${alpha * 0.55})`
            : `rgba(${fieryOrange}, ${alpha * 0.75})`;
          ctx.lineWidth = tw.isSilver ? 0.7 : 0.85;
          ctx.stroke();
        }
      }
      ctx.restore();

      // 5. FINE C-RING OPTICAL MICRO-SEGMENTS & JAW FLARES
      ctx.save();
      ctx.rotate(subtleSway);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < cRingTicks.length; i++) {
        const tk = cRingTicks[i];
        const dir = tk.trackIdx % 2 === 0 ? 1 : -1;
        const a0 = tk.angle + Math.sin(elapsed * 2.0 + tk.phase) * 0.005 * dir;
        const a1 = a0 + tk.arcLen;
        const shimmer = 0.6 + 0.4 * Math.sin(elapsed * 3.2 + tk.phase);
        const alpha = (tk.isHighlight ? 0.5 : 0.32) * shimmer + energy * 0.25;

        ctx.strokeStyle = tk.isHighlight
          ? `rgba(${brightGold}, ${alpha})`
          : `rgba(${goldenAmber}, ${alpha})`;
        ctx.lineWidth = tk.width;
        ctx.beginPath();
        ctx.arc(0, 0, R * tk.rRatio, a0, a1);
        ctx.stroke();
      }
      ctx.restore();

      ctx.restore();
    };

    animId = requestAnimationFrame(draw);

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isCancelled = true;
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [voiceState.isSpeaking, voiceState.showProjectionModal, theme]);

  if (!voiceState.isSpeaking || !voiceState.showProjectionModal) return null;

  return (
    <div
      onClick={() => ultronVoiceEngine.stop()}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between p-6 sm:p-10 bg-[#030304]/96 cursor-pointer select-none overflow-hidden"
    >
      {/* Full-Display Holographic Projection Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Top HUD Telemetry Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-4xl flex items-center justify-between px-5 py-3 rounded-2xl bg-zinc-950/92 border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.2)]"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40">
            <Radio className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-amber-300 font-semibold">
                NEURAL MATRIX // FULL-DISPLAY PROJECTION
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest rounded bg-amber-500/20 text-amber-200 border border-amber-400/30">
                LIVE AUDIO SYNC
              </span>
            </div>
            <p className="text-[11px] font-mono text-amber-200/60">
              Rotating Orbital Back-Curves • Deep Concentric Circles &amp; Secants • Tap anywhere or press ESC to dismiss
            </p>
          </div>
        </div>

        <button
          onClick={() => ultronVoiceEngine.stop()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 text-xs font-mono transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>CLOSE</span>
        </button>
      </div>

      {/* Center spacer so the giant projected holographic sphere shines unobstructed */}
      <div className="relative z-10 flex-1 flex items-center justify-center pointer-events-none" />

      {/* Bottom Cinematic Subtitle & Live Voice Waveform Readout */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-3xl px-6 py-5 rounded-2xl bg-zinc-950/92 border border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.25)]"
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase tracking-widest">
            <Volume2 className="w-4 h-4 text-amber-300" />
            <span>HOLOGRAPHIC CONSCIOUSNESS STREAM</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300/70">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>RESONANCE: {Math.round(voiceState.energy * 100)}%</span>
          </div>
        </div>

        <p className="text-base sm:text-lg font-medium text-amber-50 tracking-wide leading-relaxed">
          &ldquo;{voiceState.text}&rdquo;
        </p>

        {/* Progress Bar */}
        <div className="mt-4 w-full h-1 bg-amber-950/80 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-200 transition-all duration-150"
            style={{ width: `${Math.max(8, Math.min(100, voiceState.progress * 100))}%` }}
          />
        </div>
      </div>
    </div>
  );
};
