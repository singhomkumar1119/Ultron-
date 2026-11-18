import React from 'react';

interface UltronLogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * Original minimal ULTRON "U" Emblem Mark:
 * Combines the open-left orbital C-aperture with a sculpted geometric "U" core.
 */
export const UltronLogoMark: React.FC<UltronLogoMarkProps> = ({
  size = 28,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ultronRingGrad" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="45%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
        <linearGradient id="ultronCoreUGrad" x1="14" y1="12" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="60%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
      </defs>

      {/* Outer open-left C-ring recalling the visual reference */}
      <path
        d="M 11.5 14.5 A 18 18 0 1 1 10.5 32.5"
        stroke="url(#ultronRingGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Subtle inner orbital filament arc */}
      <path
        d="M 15.5 17.5 A 13.5 13.5 0 1 1 15 30.5"
        stroke="#FBBF24"
        strokeOpacity="0.45"
        strokeWidth="1.1"
        strokeDasharray="16 6"
        strokeLinecap="round"
      />

      {/* Minimalist sculpted "U" emblem */}
      <path
        d="M 17.5 15.5 V 25.5 C 17.5 29.09 20.41 32 24 32 C 27.59 32 30.5 29.09 30.5 25.5 V 15.5"
        stroke="url(#ultronCoreUGrad)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
