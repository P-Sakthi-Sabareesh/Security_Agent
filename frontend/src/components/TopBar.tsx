import React, { useState, useRef, useEffect } from 'react';
import { 
  Shield, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  LogOut, 
  Settings as SettingsIcon, 
  ChevronDown,
  User,
  Mail
} from 'lucide-react';
import type { HealthStatus, UserProfile } from '../types';

interface TopBarProps {
  user: UserProfile | null;
  analystName: string;
  health: HealthStatus | null;
  onResetDemo: () => Promise<void>;
  isResetting: boolean;
  resetNotification: string | null;
  demoMode: boolean;
  onDemoModeChange: (enabled: boolean) => void;
  onNavigateSettings: () => void;
  onLogout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  analystName,
  health,
  onResetDemo,
  isResetting,
  resetNotification,
  demoMode,
  onDemoModeChange,
  onNavigateSettings,
  onLogout,
}) => {
  const isOnline = health?.memory_core_online === true;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.name || analystName || 'Priya Nair';
  const displayRole = user?.role || 'SOC Lead Tier-3';
  const displayLevel = user?.level || 'Tier-3 Analyst';

  return (
    <header className="min-h-16 bg-[#090B16] border-b border-[#B8A7FF]/15 px-4 md:px-6 py-2 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md flex-shrink-0 z-10 select-none">
      {/* Title / Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#F5F3FF]">
          <Shield className="w-4 h-4 text-[#C8FF35]" />
          <span>SOC Operations Workspace</span>
        </div>
        <span className="text-slate-600">/</span>
        <span className="text-xs text-[#9D9BB6] font-mono">Live Triage Queue</span>
      </div>

      {/* Right Side: Status & Analyst profile & Reset Action */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-[#9D9BB6] whitespace-nowrap cursor-pointer">
          <input type="checkbox" checked={demoMode} onChange={(event) => onDemoModeChange(event.target.checked)} className="accent-[#C8FF35] cursor-pointer" />
          <span className="font-mono text-[11px]">Demo mode: cached only</span>
        </label>
        {demoMode && <span className="px-2 py-0.5 rounded border border-[#C8FF35]/30 bg-[#C8FF35]/15 text-[10px] font-mono text-[#C8FF35] font-bold">CACHED</span>}
        
        {/* Reset Notification Toast */}
        {resetNotification && (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs animate-in fade-in duration-150">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{resetNotification}</span>
          </div>
        )}

        {/* Reset Demo Memory Button */}
        <button
          onClick={onResetDemo}
          disabled={isResetting}
          title="Reset only live demo memory overrides and live documents"
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#111321] hover:bg-[#181B2E] border border-[#B8A7FF]/20 text-[#9D9BB6] hover:text-[#F5F3FF] text-xs font-mono font-semibold transition-all disabled:opacity-50 cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 text-[#C8FF35] ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'Resetting...' : 'Reset Demo'}</span>
        </button>

        {/* Memory Core Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111321] border border-[#B8A7FF]/20 text-xs font-mono">
          {isOnline ? (
            <span className="flex items-center gap-1.5 text-[#C8FF35] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#C8FF35] shadow-[0_0_8px_#C8FF35] animate-pulse" />
              ● Memory Core Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[#9D9BB6]">
              <span className="w-2 h-2 rounded-full bg-[#9D9BB6]/60" />
              Connecting...
            </span>
          )}
          <span className="text-slate-700">|</span>
          <span className="text-[11px] text-[#9D9BB6] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#B8A7FF]" />
            Bank: <span className="text-slate-300 font-semibold">{health?.bank_id || 'soc-memory'}</span>
          </span>
        </div>

        {/* Interactive Analyst Profile Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 pl-3 border-l border-[#B8A7FF]/20 hover:opacity-90 transition-all cursor-pointer text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1F2338] to-[#111321] border border-[#B8A7FF]/30 flex items-center justify-center text-[#B8A7FF] group-hover:border-[#C8FF35]/50 group-hover:text-[#C8FF35] transition-all">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-[#F5F3FF] leading-tight flex items-center gap-1">
                {displayName}
                <ChevronDown className="w-3 h-3 text-[#9D9BB6]" />
              </div>
              <div className="text-[10px] text-[#C8FF35] font-mono">{displayRole}</div>
            </div>
          </button>

          {/* Profile Dropdown Popup */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#090B16] border border-[#B8A7FF]/25 shadow-2xl p-2.5 space-y-2 z-50 animate-fadeIn">
              {/* Profile Summary */}
              <div className="p-3 rounded-xl bg-[#0F1122] border border-[#B8A7FF]/15 space-y-1">
                <div className="text-xs font-bold text-[#F5F3FF] truncate">{displayName}</div>
                {user?.email && (
                  <div className="text-[11px] text-[#9D9BB6] truncate flex items-center gap-1">
                    <Mail className="w-3 h-3 text-[#B8A7FF]" />
                    {user.email}
                  </div>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-semibold bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30">
                    {displayRole}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono text-[#9D9BB6] bg-[#151828]">
                    {displayLevel}
                  </span>
                </div>
              </div>

              {/* Navigation Options */}
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigateSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#9D9BB6] hover:text-[#F5F3FF] hover:bg-[#151828] transition-all text-left cursor-pointer"
                >
                  <SettingsIcon className="w-4 h-4 text-[#C8FF35]" />
                  <span>Profile / Settings</span>
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition-all text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

