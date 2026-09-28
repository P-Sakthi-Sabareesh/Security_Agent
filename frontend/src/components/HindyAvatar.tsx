import React from 'react';

interface HindyAvatarProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export const HindyAvatar: React.FC<HindyAvatarProps> = ({
  size = 40,
  className = '',
  glow = true,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-cyan-500/20 shadow-lg ${
        glow ? 'shadow-cyan-500/20' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[78%] h-[78%]"
      >
        <defs>
          <linearGradient id="hindyGradient" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38BDF8" />
            <stop offset="0.5" stopColor="#0EA5E9" />
            <stop offset="1" stopColor="#0284C7" />
          </linearGradient>
          <linearGradient id="earGradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1E293B" />
            <stop offset="1" stopColor="#0F172A" />
          </linearGradient>
          <filter id="coreGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Left Ear - Sleek Geometric Silhouette */}
        <path
          d="M 28 35 C 15 30, 8 45, 12 60 C 16 72, 26 74, 34 68 Z"
          fill="url(#earGradient)"
          stroke="#0284C7"
          strokeWidth="2"
          strokeOpacity="0.4"
        />

        {/* Right Ear - Sleek Geometric Silhouette */}
        <path
          d="M 72 35 C 85 30, 92 45, 88 60 C 84 72, 74 74, 66 68 Z"
          fill="url(#earGradient)"
          stroke="#0284C7"
          strokeWidth="2"
          strokeOpacity="0.4"
        />

        {/* Main Head Contour - Stylized Elephant Glyph */}
        <path
          d="M 30 32 C 30 20, 70 20, 70 32 C 73 44, 70 58, 62 66 C 58 70, 56 74, 54 86 C 53 90, 47 90, 46 86 C 44 74, 42 70, 38 66 C 30 58, 27 44, 30 32 Z"
          fill="#0B132B"
          stroke="url(#hindyGradient)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Tusks - Minimalist Angular Defense Shields */}
        <path
          d="M 36 68 C 30 74, 28 78, 30 82 C 32 82, 36 78, 40 72 Z"
          fill="#38BDF8"
          fillOpacity="0.8"
        />
        <path
          d="M 64 68 C 70 74, 72 78, 70 82 C 68 82, 64 78, 60 72 Z"
          fill="#38BDF8"
          fillOpacity="0.8"
        />

        {/* Trunk Segment Lines */}
        <line x1="46" y1="72" x2="54" y2="72" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
        <line x1="47" y1="78" x2="53" y2="78" stroke="#38BDF8" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />

        {/* Alert Observation Eyes */}
        <circle cx="39" cy="48" r="2.5" fill="#38BDF8" />
        <circle cx="61" cy="48" r="2.5" fill="#38BDF8" />

        {/* Neural Memory Core Node (Glowing in Forehead) */}
        <circle cx="50" cy="35" r="5.5" fill="#06B6D4" filter="url(#coreGlow)" />
        <circle cx="50" cy="35" r="3" fill="#E0F2FE" />
        <circle cx="50" cy="35" r="7" stroke="#38BDF8" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="2 2" />
      </svg>
    </div>
  );
};
