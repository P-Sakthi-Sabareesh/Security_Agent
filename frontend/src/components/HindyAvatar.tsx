import React, { useState, useEffect, useRef } from 'react';
import hindyRobotBase from '../assets/hindy_robot_base.png';

interface HindyAvatarProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

/**
 * Compact Top-Left 3D Hindy Avatar
 * Reuses the authentic 3D robot asset from Login with live eye tracking & blinking.
 */
export const HindyAvatar: React.FC<HindyAvatarProps> = ({
  size = 36,
  className = '',
  glow = true,
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Natural Blinking Cycle
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
        const nextBlink = Math.random() * 3500 + 2500;
        timeoutId = setTimeout(triggerBlink, nextBlink);
      }, 130);
    };

    timeoutId = setTimeout(triggerBlink, 2400);
    return () => clearTimeout(timeoutId);
  }, []);

  // Global window cursor tracking with distance normalization
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!avatarRef.current) return;
      const rect = avatarRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const maxDist = 500;

      const nx = Math.max(-1, Math.min(1, deltaX / maxDist));
      const ny = Math.max(-1, Math.min(1, deltaY / maxDist));

      setMousePos({ x: nx, y: ny });
    };

    window.addEventListener('mousemove', handleWindowMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleWindowMouseMove);
  }, []);

  const eyeOffsetX = mousePos.x * 2.2;
  const eyeOffsetY = mousePos.y * 1.6;

  return (
    <div
      ref={avatarRef}
      className={`relative inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-[#090B16] to-[#121424] border border-[#C8FF35]/30 overflow-hidden shrink-0 ${
        glow ? 'shadow-[0_0_12px_rgba(200,255,53,0.2)]' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="relative w-full h-full flex items-center justify-center p-0.5">
        <img
          src={hindyRobotBase}
          alt="Hindy 3D Avatar"
          className="w-[115%] h-auto object-contain max-w-none -translate-x-[2%] translate-y-[2%]"
        />

        {/* Left Eye */}
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: '50.5%',
            top: '32%',
            transform: `translate(calc(-50% + ${eyeOffsetX}px), calc(-50% + ${eyeOffsetY}px)) scale(1, ${
              isBlinking ? 0.08 : 1
            })`,
            transformOrigin: 'center center',
            transition: 'transform 0.08s ease-out',
            width: '8.8%',
            height: '12%',
          }}
        >
          <div className="w-full h-full rounded-[3px] bg-[#C8FF35] relative shadow-[0_0_6px_#C8FF35]">
            <span className="absolute top-[1px] left-[1px] w-[2px] h-[2px] bg-white rounded-full opacity-90" />
          </div>
        </div>

        {/* Right Eye */}
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: '74.5%',
            top: '32.2%',
            transform: `translate(calc(-50% + ${eyeOffsetX}px), calc(-50% + ${eyeOffsetY}px)) scale(1, ${
              isBlinking ? 0.08 : 1
            })`,
            transformOrigin: 'center center',
            transition: 'transform 0.08s ease-out',
            width: '8.4%',
            height: '11.8%',
          }}
        >
          <div className="w-full h-full rounded-[3px] bg-[#C8FF35] relative shadow-[0_0_6px_#C8FF35]">
            <span className="absolute top-[1px] left-[1px] w-[2px] h-[2px] bg-white rounded-full opacity-90" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 3D Interactive Hindy Character for Sidebar Bottom
 * Exactly matches the Login page character with interactive gaze tracking, blinking & float.
 */
export const HindySidebarBot: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isNearby, setIsNearby] = useState(false);
  const botRef = useRef<HTMLDivElement>(null);

  // Natural Blinking Cycle
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
        const nextBlink = Math.random() * 3500 + 2500;
        timeoutId = setTimeout(triggerBlink, nextBlink);
      }, 140);
    };

    timeoutId = setTimeout(triggerBlink, 2600);
    return () => clearTimeout(timeoutId);
  }, []);

  // Smooth Window-Wide Cursor Tracking
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!botRef.current) return;
      const rect = botRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      const maxTrackDistance = 500;
      const nx = Math.max(-1, Math.min(1, deltaX / maxTrackDistance));
      const ny = Math.max(-1, Math.min(1, deltaY / maxTrackDistance));

      setMousePos({ x: nx, y: ny });
      setIsNearby(distance < 300);
    };

    window.addEventListener('mousemove', handleWindowMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleWindowMouseMove);
  }, []);

  const eyeOffsetX = mousePos.x * 5.5;
  const eyeOffsetY = mousePos.y * 4.2;
  const headRotateY = mousePos.x * 5;
  const headRotateX = -mousePos.y * 4;

  return (
    <div ref={botRef} className="relative flex flex-col items-center justify-center pt-2 pb-1">
      {/* Floor Glow Reflection */}
      <div
        className={`absolute bottom-3 w-28 h-6 rounded-full blur-xl pointer-events-none transition-all duration-500 ${
          isNearby ? 'bg-[#C8FF35]/25 w-32' : 'bg-[#C8FF35]/15'
        }`}
      />

      {/* 3D Perspective Container with Tilt */}
      <div
        className="relative z-10 w-28 transition-transform duration-300 ease-out"
        style={{
          transform: `perspective(600px) rotateY(${headRotateY}deg) rotateX(${headRotateX}deg)`,
        }}
      >
        {/* Floating Idle Animation */}
        <div className="relative animate-[float_5s_ease-in-out_infinite]">
          {/* Authentic 3D Robot Image */}
          <img
            src={hindyRobotBase}
            alt="Hindy 3D Character"
            className="w-full h-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.85)] filter brightness-105"
          />

          {/* Interactive Dynamic Eyes Layer */}
          {/* Left Eye */}
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: '52.27%',
              top: '29.16%',
              transform: `translate(calc(-50% + ${eyeOffsetX}px), calc(-50% + ${eyeOffsetY}px)) scale(1, ${
                isBlinking ? 0.08 : isNearby ? 1.06 : 1
              })`,
              transformOrigin: 'center center',
              transition: 'transform 0.09s ease-out',
              width: '8.8%',
              height: '12.4%',
            }}
          >
            <div
              className={`w-full h-full rounded-[6px] bg-[#C8FF35] relative shadow-[0_0_10px_#C8FF35,0_0_18px_rgba(200,255,53,0.5)] ${
                isNearby ? 'shadow-[0_0_14px_#C8FF35,0_0_24px_rgba(200,255,53,0.7)]' : ''
              }`}
            >
              <span className="absolute top-[2px] left-[2px] w-1 h-1.5 bg-white rounded-full opacity-90 blur-[0.2px]" />
            </div>
          </div>

          {/* Right Eye */}
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: '78.30%',
              top: '29.35%',
              transform: `translate(calc(-50% + ${eyeOffsetX}px), calc(-50% + ${eyeOffsetY}px)) scale(1, ${
                isBlinking ? 0.08 : isNearby ? 1.06 : 1
              })`,
              transformOrigin: 'center center',
              transition: 'transform 0.09s ease-out',
              width: '8.4%',
              height: '12.2%',
            }}
          >
            <div
              className={`w-full h-full rounded-[6px] bg-[#C8FF35] relative shadow-[0_0_10px_#C8FF35,0_0_18px_rgba(200,255,53,0.5)] ${
                isNearby ? 'shadow-[0_0_14px_#C8FF35,0_0_24px_rgba(200,255,53,0.7)]' : ''
              }`}
            >
              <span className="absolute top-[2px] left-[2px] w-1 h-1.5 bg-white rounded-full opacity-90 blur-[0.2px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
