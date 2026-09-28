import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  KeyRound, 
  User, 
  Activity, 
  Sparkles, 
  Radio, 
  Cpu, 
  Mail, 
  Lock, 
  AlertCircle, 
  UserPlus, 
  LogIn,
  CheckCircle2
} from 'lucide-react';
import type { HealthStatus, UserProfile } from '../types';
import hindyRobotBase from '../assets/hindy_robot_base.png';

const API_BASE = 'http://127.0.0.1:8000';

interface LoginModalProps {
  onLogin: (user: UserProfile, token: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin }) => {
  // Mode: 'login' | 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Login Form State
  const [loginId, setLoginId] = useState('analyst.priya');
  const [loginPassword, setLoginPassword] = useState('demo');

  // Sign Up Form State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupRole, setSignupRole] = useState('SOC Analyst');
  const [signupLevel, setSignupLevel] = useState('Tier-2 Analyst');

  // Processing & Errors
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Health Status
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);

  // Interactive Mascot State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isNearby, setIsNearby] = useState(false);
  const robotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((res) => res.json())
      .then((data: HealthStatus) => {
        setHealth(data);
        setIsCheckingHealth(false);
      })
      .catch((err) => {
        console.warn('Health check error:', err);
        setHealth(null);
        setIsCheckingHealth(false);
      });
  }, []);

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

    timeoutId = setTimeout(triggerBlink, 2800);
    return () => clearTimeout(timeoutId);
  }, []);

  // Smooth Cursor Tracking & Proximity Detection
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!robotRef.current) return;
    const rect = robotRef.current.getBoundingClientRect();
    const robotCenterX = rect.left + rect.width / 2;
    const robotCenterY = rect.top + rect.height / 2;

    const deltaX = e.clientX - robotCenterX;
    const deltaY = e.clientY - robotCenterY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    const maxTrackDistance = 550;
    const nx = Math.max(-1, Math.min(1, deltaX / maxTrackDistance));
    const ny = Math.max(-1, Math.min(1, deltaY / maxTrackDistance));

    setMousePos({ x: nx, y: ny });
    setIsNearby(distance < 340);
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
    setIsNearby(false);
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username_or_email: loginId.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid username/email or password.');
      }

      if (data.success && data.user && data.token) {
        onLogin(data.user, data.token);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Signup
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signupName.trim()) {
      setErrorMessage('Full Name is required.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (signupPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }
    if (signupPassword !== signupConfirm) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName.trim(),
          email: signupEmail.trim().toLowerCase(),
          password: signupPassword,
          role: signupRole,
          level: signupLevel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed.');
      }

      if (data.success && data.user && data.token) {
        setSuccessMessage('Account created successfully! Redirecting...');
        setTimeout(() => {
          onLogin(data.user, data.token);
        }, 600);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  const isMemoryOnline = health?.memory_core_online === true;

  // Calculate eye offsets and head rotation
  const eyeOffsetX = mousePos.x * 10;
  const eyeOffsetY = mousePos.y * 7;
  const headRotateY = mousePos.x * 6;
  const headRotateX = -mousePos.y * 5;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090B16] p-4 sm:p-6 lg:p-10 overflow-y-auto select-none"
    >
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-[#B8A7FF]/8 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[520px] h-[520px] rounded-full bg-[#C8FF35]/6 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full bg-[radial-gradient(ellipse,_rgba(200,255,53,0.04)_0%,_transparent_70%)] pointer-events-none" />

      {/* Main Container Panel */}
      <div className="relative w-full max-w-5xl rounded-2xl md:rounded-3xl border border-[#B8A7FF]/20 bg-[#111321]/95 shadow-[0_0_70px_-15px_rgba(184,167,255,0.15),0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden my-auto">
        {/* Top subtle highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#B8A7FF]/40 to-transparent pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
          {/* ========================================================= */}
          {/* LEFT SIDE — AUTHENTIC 3D HINDY MASCOT (INTERACTIVE) */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 bg-[#090B16]/90 p-6 sm:p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#B8A7FF]/15 relative overflow-hidden">
            {/* Soft backdrop radial light */}
            <div
              className={`absolute inset-0 transition-opacity duration-700 pointer-events-none bg-[radial-gradient(circle_at_50%_45%,_rgba(200,255,53,0.1)_0%,_rgba(184,167,255,0.04)_45%,_transparent_75%)] ${
                isNearby ? 'opacity-100' : 'opacity-60'
              }`}
            />

            {/* Top Brand & Metadata Header */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0F1222] border border-[#C8FF35]/30 flex items-center justify-center shadow-[0_0_15px_rgba(200,255,53,0.2)]">
                  <Shield className="w-5 h-5 text-[#C8FF35]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-[#F5F3FF] flex items-center gap-2">
                    Hindy
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30">
                      LIVE AGENT
                    </span>
                  </h1>
                  <p className="text-[11px] font-mono text-[#9D9BB6] tracking-wider uppercase">
                    SOC MEMORY AGENT
                  </p>
                </div>
              </div>

              {/* Reactive Sensor Status */}
              <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-[#9D9BB6] bg-[#111321] px-3 py-1.5 rounded-full border border-[#B8A7FF]/15">
                <Radio className={`w-3.5 h-3.5 ${isNearby ? 'text-[#C8FF35] animate-pulse' : 'text-[#B8A7FF]'}`} />
                <span>{isNearby ? 'ANALYST PROXIMITY ENGAGED' : 'GAZE ACTIVE'}</span>
              </div>
            </div>

            {/* Central 3D Mascot Stage */}
            <div
              ref={robotRef}
              className="relative flex-1 flex items-center justify-center my-4 py-2 min-h-[340px] sm:min-h-[380px]"
            >
              {/* Feature telemetry badges */}
              <div className="absolute right-0 top-4 hidden sm:flex flex-col gap-2.5 text-left z-20 pointer-events-none">
                <div className="flex items-center gap-2.5 bg-[#111321]/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#B8A7FF]/15 shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF35] shadow-[0_0_6px_#C8FF35]" />
                  <div>
                    <div className="text-[10px] font-mono font-bold text-[#C8FF35]">RECALL</div>
                    <div className="text-[9px] font-sans text-[#9D9BB6]">Past investigations</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-[#111321]/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#B8A7FF]/15 shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B8A7FF] shadow-[0_0_6px_#B8A7FF]" />
                  <div>
                    <div className="text-[10px] font-mono font-bold text-[#B8A7FF]">ANALYZE</div>
                    <div className="text-[9px] font-sans text-[#9D9BB6]">Context verification</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-[#111321]/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#B8A7FF]/15 shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF35] shadow-[0_0_6px_#C8FF35]" />
                  <div>
                    <div className="text-[10px] font-mono font-bold text-[#C8FF35]">PROTECT</div>
                    <div className="text-[9px] font-sans text-[#9D9BB6]">Autonomous safety</div>
                  </div>
                </div>
              </div>

              {/* Ambient Floor Reflection & Glow */}
              <div
                className={`absolute bottom-2 w-56 h-10 rounded-full blur-2xl pointer-events-none transition-all duration-500 ${
                  isNearby ? 'bg-[#C8FF35]/25 w-64' : 'bg-[#C8FF35]/15'
                }`}
              />
              <div className="absolute bottom-6 w-72 h-8 bg-[#B8A7FF]/10 rounded-full blur-xl pointer-events-none" />

              {/* 3D Robot Container with Perspective & Floating */}
              <div
                className="relative z-10 w-60 sm:w-72 md:w-80 transition-transform duration-300 ease-out"
                style={{
                  transform: `perspective(1000px) rotateY(${headRotateY}deg) rotateX(${headRotateX}deg)`,
                }}
              >
                {/* Floating Idle Animation */}
                <div className="relative animate-[float_5s_ease-in-out_infinite]">
                  <img
                    src={hindyRobotBase}
                    alt="Hindy SOC Mascot"
                    className="w-full h-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.85)] filter brightness-105"
                  />

                  {/* Dynamic Eyes Layer */}
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
                      className={`w-full h-full rounded-[14px] bg-[#C8FF35] relative shadow-[0_0_16px_#C8FF35,0_0_30px_rgba(200,255,53,0.6)] ${
                        isNearby ? 'shadow-[0_0_22px_#C8FF35,0_0_40px_rgba(200,255,53,0.8)]' : ''
                      }`}
                    >
                      <span className="absolute top-1 left-1.5 w-2 h-3.5 bg-white rounded-full opacity-90 blur-[0.5px]" />
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
                      className={`w-full h-full rounded-[14px] bg-[#C8FF35] relative shadow-[0_0_16px_#C8FF35,0_0_30px_rgba(200,255,53,0.6)] ${
                        isNearby ? 'shadow-[0_0_22px_#C8FF35,0_0_40px_rgba(200,255,53,0.8)]' : ''
                      }`}
                    >
                      <span className="absolute top-1 left-1.5 w-2 h-3.5 bg-white rounded-full opacity-90 blur-[0.5px]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Telemetry & Status Bar */}
            <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-[#9D9BB6] pt-3 border-t border-[#B8A7FF]/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C8FF35] animate-pulse" />
                <span className="text-[#F5F3FF] font-medium">HINDY CORE</span>
                <span className="text-[#9D9BB6]/60">• v2.4.0</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#B8A7FF]">
                <Cpu className="w-3.5 h-3.5" />
                <span>DYNAMIC GAZE ACTIVE</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT SIDE — AUTH FORMS (LOGIN / SIGN UP) */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 bg-[#111321] p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative">
            {/* Top Header & Mode Toggle */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B8A7FF]/10 border border-[#B8A7FF]/20 text-[#B8A7FF] text-[11px] font-mono tracking-wider uppercase">
                  <Sparkles className="w-3 h-3 text-[#C8FF35]" />
                  SOC ACCESS PORTAL
                </div>

                {/* Auth Mode Toggle Switch */}
                <div className="flex bg-[#090B16] p-1 rounded-xl border border-[#B8A7FF]/20">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setErrorMessage(null);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                      authMode === 'login'
                        ? 'bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30 font-semibold'
                        : 'text-[#9D9BB6] hover:text-[#F5F3FF]'
                    }`}
                  >
                    SIGN IN
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setErrorMessage(null);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                      authMode === 'signup'
                        ? 'bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30 font-semibold'
                        : 'text-[#9D9BB6] hover:text-[#F5F3FF]'
                    }`}
                  >
                    SIGN UP
                  </button>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F3FF]">
                {authMode === 'login' ? 'WELCOME BACK' : 'CREATE ACCOUNT'}
              </h2>
              <p className="text-xs sm:text-sm text-[#9D9BB6] mt-1.5 font-normal leading-relaxed">
                {authMode === 'login'
                  ? "Authenticate to access Hindy's persistent security memory."
                  : 'Register a new SOC analyst identity for the investigation team.'}
              </p>

              {/* Alert Feedback */}
              {errorMessage && (
                <div className="mt-4 p-3 rounded-xl border border-rose-500/40 bg-rose-950/20 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mt-4 p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* 1. LOGIN FORM */}
              {authMode === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#9D9BB6] uppercase tracking-wider mb-1.5 font-mono">
                      ANALYST ID / EMAIL
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3.5 w-4 h-4 text-[#9D9BB6]" />
                      <input
                        type="text"
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#090B16] border border-[#B8A7FF]/20 rounded-xl text-xs text-[#F5F3FF] placeholder-[#9D9BB6]/40 focus:outline-none focus:border-[#C8FF35] focus:ring-1 focus:ring-[#C8FF35] transition-all font-mono shadow-inner"
                        placeholder="analyst.priya or priya.nair@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#9D9BB6] uppercase tracking-wider mb-1.5 font-mono">
                      PASSWORD
                    </label>
                    <div className="relative flex items-center">
                      <KeyRound className="absolute left-3.5 w-4 h-4 text-[#9D9BB6]" />
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#090B16] border border-[#B8A7FF]/20 rounded-xl text-xs text-[#F5F3FF] placeholder-[#9D9BB6]/40 focus:outline-none focus:border-[#C8FF35] focus:ring-1 focus:ring-[#C8FF35] transition-all font-mono shadow-inner"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  {/* Demo Quick Select Account Buttons */}
                  <div className="pt-2">
                    <div className="text-[10.5px] font-mono text-[#9D9BB6]/70 mb-1.5">
                      QUICK DEMO PROFILES:
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginId('analyst.priya');
                          setLoginPassword('demo');
                        }}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-[#090B16] border border-[#B8A7FF]/15 hover:border-[#C8FF35]/40 text-[10.5px] font-mono text-[#9D9BB6] hover:text-[#C8FF35] transition-all text-left"
                      >
                        Priya Nair (Lead)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginId('analyst.arjun');
                          setLoginPassword('password123');
                        }}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-[#090B16] border border-[#B8A7FF]/15 hover:border-[#C8FF35]/40 text-[10.5px] font-mono text-[#9D9BB6] hover:text-[#C8FF35] transition-all text-left"
                      >
                        Arjun Rao (Analyst)
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-4 py-3 px-4 rounded-xl bg-[#C8FF35] hover:bg-[#d4ff4d] text-[#090B16] font-bold text-xs tracking-wide shadow-[0_0_22px_rgba(200,255,53,0.25)] hover:shadow-[0_0_32px_rgba(200,255,53,0.45)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    {submitting ? 'AUTHENTICATING...' : 'ENTER SOC WORKSPACE'}
                  </button>
                </form>
              ) : (
                /* 2. SIGN UP FORM */
                <form onSubmit={handleSignupSubmit} className="mt-5 space-y-3">
                  <div>
                    <label className="block text-[10.5px] font-semibold text-[#9D9BB6] uppercase tracking-wider mb-1 font-mono">
                      FULL NAME
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3 w-3.5 h-3.5 text-[#9D9BB6]" />
                      <input
                        type="text"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#090B16] border border-[#B8A7FF]/20 rounded-xl text-xs text-[#F5F3FF] placeholder-[#9D9BB6]/40 focus:outline-none focus:border-[#C8FF35] transition-all font-sans"
                        placeholder="e.g. Divya Shetty"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-semibold text-[#9D9BB6] uppercase tracking-wider mb-1 font-mono">
                      WORK EMAIL
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3 w-3.5 h-3.5 text-[#9D9BB6]" />
                      <input
                        type="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#090B16] border border-[#B8A7FF]/20 rounded-xl text-xs text-[#F5F3FF] placeholder-[#9D9BB6]/40 focus:outline-none focus:border-[#C8FF35] transition-all font-sans"
                        placeholder="divya.shetty@kestrel.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-[#9D9BB6] uppercase tracking-wider mb-1 font-mono">
                        PASSWORD
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3 w-3.5 h-3.5 text-[#9D9BB6]" />
                        <input
                          type="password"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-[#090B16] border border-[#B8A7FF]/20 rounded-xl text-xs text-[#F5F3FF] placeholder-[#9D9BB6]/40 focus:outline-none focus:border-[#C8FF35] transition-all font-mono"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-semibold text-[#9D9BB6] uppercase tracking-wider mb-1 font-mono">
                        CONFIRM
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3 w-3.5 h-3.5 text-[#9D9BB6]" />
                        <input
                          type="password"
                          value={signupConfirm}
                          onChange={(e) => setSignupConfirm(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-[#090B16] border border-[#B8A7FF]/20 rounded-xl text-xs text-[#F5F3FF] placeholder-[#9D9BB6]/40 focus:outline-none focus:border-[#C8FF35] transition-all font-mono"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-[#9D9BB6] uppercase tracking-wider mb-1 font-mono">
                        SOC ROLE
                      </label>
                      <select
                        value={signupRole}
                        onChange={(e) => setSignupRole(e.target.value)}
                        className="w-full px-2.5 py-2 bg-[#090B16] border border-[#B8A7FF]/20 rounded-xl text-xs text-[#F5F3FF] focus:outline-none focus:border-[#C8FF35]"
                      >
                        <option value="SOC Analyst">SOC Analyst</option>
                        <option value="SOC Lead Tier-3">SOC Lead Tier-3</option>
                        <option value="Incident Responder">Incident Responder</option>
                        <option value="Threat Hunter">Threat Hunter</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-semibold text-[#9D9BB6] uppercase tracking-wider mb-1 font-mono">
                        TIER LEVEL
                      </label>
                      <select
                        value={signupLevel}
                        onChange={(e) => setSignupLevel(e.target.value)}
                        className="w-full px-2.5 py-2 bg-[#090B16] border border-[#B8A7FF]/20 rounded-xl text-xs text-[#F5F3FF] focus:outline-none focus:border-[#C8FF35]"
                      >
                        <option value="Tier-2 Analyst">Tier-2 Analyst</option>
                        <option value="Tier-3 Analyst">Tier-3 Analyst</option>
                        <option value="Tier-1 Analyst">Tier-1 Analyst</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-3 py-3 px-4 rounded-xl bg-[#C8FF35] hover:bg-[#d4ff4d] text-[#090B16] font-bold text-xs tracking-wide shadow-[0_0_22px_rgba(200,255,53,0.25)] hover:shadow-[0_0_32px_rgba(200,255,53,0.45)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    {submitting ? 'REGISTERING...' : 'CREATE ANALYST ACCOUNT'}
                  </button>
                </form>
              )}
            </div>

            {/* Bottom Status Footer */}
            <div className="mt-6 pt-4 border-t border-[#B8A7FF]/15 flex items-center justify-center text-xs">
              {isCheckingHealth ? (
                <span className="text-[#9D9BB6] flex items-center gap-2 font-mono">
                  <Activity className="w-3.5 h-3.5 animate-spin text-[#B8A7FF]" />
                  CONNECTING TO CORE...
                </span>
              ) : isMemoryOnline ? (
                <span className="text-[#C8FF35] flex items-center gap-2 font-mono font-medium tracking-wide">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#C8FF35] shadow-[0_0_10px_#C8FF35] animate-pulse" />
                  ● MEMORY CORE ONLINE
                </span>
              ) : (
                <span className="text-[#9D9BB6] flex items-center gap-2 font-mono">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#9D9BB6]/60" />
                  STANDBY MODE
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
