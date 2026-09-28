import React from 'react';
import { UserCircle, Shield, Sparkles } from 'lucide-react';
import type { HealthStatus } from '../types';

interface TopBarProps {
  analystName: string;
  health: HealthStatus | null;
}

export const TopBar: React.FC<TopBarProps> = ({ analystName, health }) => {
  const isOnline = health?.memory_core_online === true;

  return (
    <header className="h-16 bg-[#0B0F17]/90 border-b border-slate-800/80 px-6 flex items-center justify-between backdrop-blur-md flex-shrink-0 z-10 select-none">
      {/* Title / Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span>SOC Operations Workspace</span>
        </div>
        <span className="text-slate-600">/</span>
        <span className="text-xs text-slate-400 font-mono">Live Triage Queue</span>
      </div>

      {/* Right Side: Status & Analyst profile */}
      <div className="flex items-center gap-6">
        {/* Memory Core Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
          {isOnline ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
              ● Memory Core Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              Connecting...
            </span>
          )}
          <span className="text-slate-700">|</span>
          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Hindsight Bank: <span className="text-slate-300 font-semibold">{health?.bank_id || 'soc-memory'}</span>
          </span>
        </div>

        {/* Analyst Info */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
          <UserCircle className="w-6 h-6 text-slate-400" />
          <div className="text-left">
            <div className="text-xs font-semibold text-slate-200 leading-tight">
              {analystName}
            </div>
            <div className="text-[10px] text-cyan-400 font-mono">SOC Lead Tier-3</div>
          </div>
        </div>
      </div>
    </header>
  );
};
