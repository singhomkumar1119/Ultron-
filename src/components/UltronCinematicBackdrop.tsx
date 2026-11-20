import React, { useEffect, useMemo, useRef, useState } from 'react';
import roboticFaceImg from '../assets/images/ultron_robotic_backdrop_1795163506384.jpg';
import {
  computeBackdropParallax,
  generateBackdropParticles,
  type BackdropParallaxState,
} from '../utils/ultronLogic';

interface UltronCinematicBackdropProps {
  isDarkMode: boolean;
  reducedMotion?: boolean;
  isSidebarOpen?: boolean;
}

const IDENTITY_PARALLAX = computeBackdropParallax(0, 0, true);

/**
 * Multi-layered 3D sci-fi atmospheric command center backdrop.
 * Combines a dark metallic robotic AI presence emerging from obsidian darkness,
 * glowing crimson optical reflections, slow-moving volumetric smoke,
 * crimson/electric-blue/violet lighting accents, floating embers, and responsive 3D parallax.
 */
export const UltronCinematicBackdrop: React.FC<UltronCinematicBackdropProps> = ({
  isDarkMode,
  reducedMotion = false,
  isSidebarOpen = true,
}) => {
  const [imageError, setImageError] = useState(false);
  const [osReducedMotion, setOsReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const effectiveReducedMotion = reducedMotion || osReducedMotion;

  const [parallax, setParallax] = useState<BackdropParallaxState>(IDENTITY_PARALLAX);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  const particles = useMemo(() => generateBackdropParticles(30, 2026), []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setOsReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (effectiveReducedMotion || typeof window === 'undefined') {
      targetRef.current = { x: 0, y: 0 };
      currentRef.current = { x: 0, y: 0 };
      setParallax(IDENTITY_PARALLAX);
      return;
    }

    let isRunning = false;

    const scheduleStep = () => {
      if (isRunning) return;
      isRunning = true;
      rafRef.current = window.requestAnimationFrame(step);
    };

    const step = () => {
      const dx = targetRef.current.x - currentRef.current.x;
      const dy = targetRef.current.y - currentRef.current.y;
      currentRef.current.x += dx * 0.085;
      currentRef.current.y += dy * 0.085;

      setParallax(
        computeBackdropParallax(currentRef.current.x, currentRef.current.y, false)
      );

      if (Math.abs(dx) > 0.004 || Math.abs(dy) > 0.004) {
        rafRef.current = window.requestAnimationFrame(step);
      } else {
        isRunning = false;
        rafRef.current = null;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      const ny = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
      targetRef.current = {
        x: Math.max(-1, Math.min(1, nx)),
        y: Math.max(-1, Math.min(1, ny)),
      };
      scheduleStep();
    };

    const handlePointerLeave = () => {
      targetRef.current = { x: 0, y: 0 };
      scheduleStep();
    };

    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (typeof e.gamma !== 'number' || typeof e.beta !== 'number') return;
      const nx = Math.max(-1, Math.min(1, e.gamma / 30));
      const ny = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
      targetRef.current = { x: nx, y: ny };
      scheduleStep();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);
    window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [effectiveReducedMotion]);

  if (!isDarkMode) {
    // Clean, refined architectural light backdrop preserving high contrast in Light Mode
    return (
      <div
        data-testid="ultron-cinematic-backdrop"
        data-mode="light"
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#F8F9FB]"
      >
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse 68% 54% at 55% 18%, rgba(36, 107, 255, 0.08), transparent 65%), radial-gradient(ellipse 56% 48% at 78% 72%, rgba(121, 43, 255, 0.06), transparent 62%), radial-gradient(ellipse 48% 40% at 24% 82%, rgba(255, 23, 61, 0.04), transparent 60%)',
          }}
        />
      </div>
    );
  }

  return (
    <div
      data-testid="ultron-cinematic-backdrop"
      data-mode="dark"
      data-parallax-x={parallax.faceX}
      data-parallax-y={parallax.faceY}
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#050509] select-none"
    >
      {/* Layer 1: Deep Obsidian Atmosphere + Crimson, Electric Blue & Violet Volumetric Rim Lights */}
      <div
        className="absolute -inset-12 will-change-transform"
        style={{
          transform: `translate3d(${parallax.farX}px, ${parallax.farY}px, 0)`,
        }}
      >
        {/* Left Electric Blue Metallic Rim Ambience */}
        <div
          className="absolute top-[8%] left-[4%] w-[52vw] h-[58vh] rounded-full opacity-35 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(36, 107, 255, 0.34) 0%, rgba(36, 107, 255, 0.08) 45%, transparent 72%)',
          }}
        />
        {/* Right Deep Violet Rim Ambience */}
        <div
          className="absolute top-[12%] right-[2%] w-[50vw] h-[56vh] rounded-full opacity-35 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(121, 43, 255, 0.34) 0%, rgba(121, 43, 255, 0.08) 45%, transparent 72%)',
          }}
        />
        {/* Center-Back Crimson Core Glow Behind Robotic Face */}
        <div
          className="absolute top-[14%] left-1/2 -translate-x-1/2 w-[56vw] max-w-[780px] h-[52vh] rounded-full opacity-40 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(255, 23, 61, 0.28) 0%, rgba(121, 43, 255, 0.14) 44%, transparent 72%)',
          }}
        />
        {/* Subtle Architectural Command Grid Depth Plane */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(148, 163, 184, 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.25) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage:
              'radial-gradient(ellipse 75% 65% at 54% 42%, black 18%, transparent 78%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 75% 65% at 54% 42%, black 18%, transparent 78%)',
          }}
        />
      </div>

      {/* Layer 2: Massive 3D Robotic AI Face Emerging from Obsidian Darkness */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-[padding] duration-300 ${
          isSidebarOpen ? 'lg:pl-72' : 'lg:pl-16'
        }`}
        style={{ perspective: '1300px' }}
      >
        <div
          data-testid="ultron-robotic-face-plane"
          className={`relative min-w-[820px] sm:min-w-[980px] lg:min-w-0 lg:w-[86vw] max-w-[1440px] aspect-[1376/768] will-change-transform ${
            effectiveReducedMotion ? '' : 'ultron-face-breathe'
          }`}
          style={{
            transform: `translate3d(${parallax.faceX}px, ${parallax.faceY}px, 0) rotateX(${parallax.rotateX}deg) rotateY(${parallax.rotateY}deg) scale(1.04)`,
            transformStyle: 'preserve-3d',
            maskImage:
              'radial-gradient(ellipse 72% 78% at 50% 44%, rgba(0,0,0,0.96) 24%, rgba(0,0,0,0.58) 56%, transparent 88%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 72% 78% at 50% 44%, rgba(0,0,0,0.96) 24%, rgba(0,0,0,0.58) 56%, transparent 88%)',
          }}
        >
          {!imageError ? (
            <img
              src={roboticFaceImg}
              alt=""
              referrerPolicy="no-referrer"
              decoding="async"
              fetchPriority="high"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover object-center opacity-[0.62] brightness-[0.9] contrast-[1.12] saturate-[1.08]"
            />
          ) : (
            /* Zero-Broken-Image Metallic Robotic Silhouette Fallback */
            <div
              className="w-full h-full opacity-55"
              style={{
                background:
                  'radial-gradient(ellipse 36% 52% at 50% 42%, rgba(34, 36, 48, 0.95) 0%, rgba(15, 16, 24, 0.72) 52%, transparent 78%)',
              }}
            />
          )}

          {/* Layer 3: Glowing Crimson Robotic Eyes Optical Reflection & Pulse (Locked to Eye Coordinates) */}
          <div
            className={`absolute top-[41.8%] left-[42.8%] -translate-x-1/2 -translate-y-1/2 w-[7.5%] h-[5.5%] rounded-full blur-xl mix-blend-screen ${
              effectiveReducedMotion ? 'opacity-50' : 'ultron-eye-pulse'
            }`}
            style={{
              background:
                'radial-gradient(circle, rgba(255, 23, 61, 0.95) 0%, rgba(255, 23, 61, 0.42) 45%, transparent 75%)',
            }}
          />
          <div
            className={`absolute top-[41.8%] left-[57.2%] -translate-x-1/2 -translate-y-1/2 w-[7.5%] h-[5.5%] rounded-full blur-xl mix-blend-screen ${
              effectiveReducedMotion ? 'opacity-50' : 'ultron-eye-pulse'
            }`}
            style={{
              background:
                'radial-gradient(circle, rgba(255, 23, 61, 0.95) 0%, rgba(255, 23, 61, 0.42) 45%, transparent 75%)',
            }}
          />
          {/* Subtle Horizontal Anamorphic Crimson Optical Flare */}
          <div
            className={`absolute top-[41.9%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[44%] h-[2px] blur-[2px] mix-blend-screen ${
              effectiveReducedMotion ? 'opacity-25' : 'ultron-eye-flare'
            }`}
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255, 23, 61, 0.35) 26%, rgba(255, 86, 114, 0.72) 50%, rgba(255, 23, 61, 0.35) 74%, transparent 100%)',
            }}
          />
        </div>
      </div>

      {/* Layer 4: Slow-Moving Volumetric Atmospheric Smoke & Fog */}
      <div
        className="absolute -inset-16 will-change-transform"
        style={{
          transform: `translate3d(${parallax.fogX}px, ${parallax.fogY}px, 0)`,
        }}
      >
        <div
          className={`absolute -bottom-[14%] -left-[10%] w-[75vw] h-[54vh] rounded-full blur-3xl opacity-45 ${
            effectiveReducedMotion ? '' : 'ultron-fog-drift-a'
          }`}
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(36, 107, 255, 0.16) 0%, rgba(21, 21, 29, 0.65) 45%, transparent 75%)',
          }}
        />
        <div
          className={`absolute -bottom-[12%] -right-[8%] w-[72vw] h-[52vh] rounded-full blur-3xl opacity-45 ${
            effectiveReducedMotion ? '' : 'ultron-fog-drift-b'
          }`}
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(121, 43, 255, 0.16) 0%, rgba(21, 21, 29, 0.6) 45%, transparent 75%)',
          }}
        />
        <div
          className={`absolute top-[38%] left-[22%] w-[60vw] h-[34vh] rounded-full blur-3xl opacity-30 ${
            effectiveReducedMotion ? '' : 'ultron-fog-drift-a'
          }`}
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(255, 23, 61, 0.12) 0%, rgba(21, 21, 29, 0.45) 50%, transparent 75%)',
          }}
        />
      </div>

      {/* Layer 5: Floating Atmospheric Particles, Crimson Sparks & Micro Embers */}
      <div
        data-testid="ultron-backdrop-particles"
        className="absolute -inset-8 will-change-transform"
        style={{
          transform: `translate3d(${parallax.particlesX}px, ${parallax.particlesY}px, 0)`,
        }}
      >
        {particles.map((p) => (
          <span
            key={p.id}
            className={`absolute rounded-full ${
              effectiveReducedMotion ? '' : 'ultron-ember-rise'
            }`}
            style={{
              left: `${p.leftPct}%`,
              top: `${p.topPct}%`,
              width: `${p.sizePx}px`,
              height: `${p.sizePx}px`,
              opacity: p.opacity,
              backgroundColor: p.color,
              boxShadow:
                p.color === '#FF173D'
                  ? '0 0 8px 1px rgba(255, 23, 61, 0.72)'
                  : p.color === '#246BFF'
                  ? '0 0 8px 1px rgba(36, 107, 255, 0.65)'
                  : p.color === '#792BFF'
                  ? '0 0 8px 1px rgba(121, 43, 255, 0.65)'
                  : '0 0 6px rgba(203, 213, 225, 0.45)',
              animationDuration: `${p.durationSec}s`,
              animationDelay: `${p.delaySec}s`,
              ['--ember-drift-x' as string]: `${p.driftX}px`,
            }}
          />
        ))}
      </div>

      {/* Layer 6: Measured Contrast Vignette & Scrim (Guarantees WCAG AA UI Readability) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 84% 76% at 54% 40%, rgba(5, 5, 9, 0.12) 0%, rgba(5, 5, 9, 0.56) 66%, rgba(5, 5, 9, 0.92) 100%), linear-gradient(to bottom, rgba(5, 5, 9, 0.52) 0%, rgba(5, 5, 9, 0.18) 28%, rgba(5, 5, 9, 0.34) 68%, rgba(5, 5, 9, 0.86) 100%)',
        }}
      />
    </div>
  );
};
