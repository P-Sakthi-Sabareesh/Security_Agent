import React from 'react';
import { HindyAvatar } from './HindyAvatar';
import { Sparkles, Brain, GitCompare, Database } from 'lucide-react';

interface HindyPanelProps {
  onAction: (action: 'reasoning' | 'differences' | 'previous') => void;
  hasAnalysis: boolean;
}

export const HindyPanel: React.FC<HindyPanelProps> = ({ onAction, hasAnalysis }) => {
  return (
    <div className="flex flex-col h-full bg-[#0a0f18]/90 border-l border-slate-800/80 p-4 select-none">
      {/* Agent Identity Card */}
      <div className="flex flex-col items-center text-center p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-3 mb-4 shadow-sm">
        <div className="relative">
          <HindyAvatar size={56} glow={true} />
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center justify-center space-x-1.5">
            <span>Hindy</span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            SOC Memory & Reasoning Agent
          </p>
        </div>
        <div className="w-full pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 leading-relaxed italic">
          "Remembers everything. Verifies before trusting."
        </div>
      </div>

      {/* Quick Action Navigation Buttons (Strictly 3 Buttons) */}
      <div className="flex-1 space-y-2.5">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
          Agent Explanations
        </div>

        {/* Button 1: Why did you decide this? */}
        <button
          onClick={() => onAction('reasoning')}
          disabled={!hasAnalysis}
          className="w-full p-3 text-left bg-slate-900/80 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-xs font-medium text-slate-200 transition-all flex items-start space-x-2.5 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-900/80 disabled:hover:border-slate-800"
        >
          <div className="p-1.5 rounded-md bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 group-hover:bg-cyan-900 transition-colors flex-shrink-0 mt-0.5">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
              Why did you decide this?
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Focus synthesized reasoning & recommendation
            </div>
          </div>
        </button>

        {/* Button 2: Show context differences */}
        <button
          onClick={() => onAction('differences')}
          disabled={!hasAnalysis}
          className="w-full p-3 text-left bg-slate-900/80 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-xs font-medium text-slate-200 transition-all flex items-start space-x-2.5 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-900/80 disabled:hover:border-slate-800"
        >
          <div className="p-1.5 rounded-md bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 group-hover:bg-cyan-900 transition-colors flex-shrink-0 mt-0.5">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
              Show context differences
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Highlight past vs current signal differences
            </div>
          </div>
        </button>

        {/* Button 3: Show previous investigation */}
        <button
          onClick={() => onAction('previous')}
          disabled={!hasAnalysis}
          className="w-full p-3 text-left bg-slate-900/80 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-xs font-medium text-slate-200 transition-all flex items-start space-x-2.5 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-900/80 disabled:hover:border-slate-800"
        >
          <div className="p-1.5 rounded-md bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 group-hover:bg-cyan-900 transition-colors flex-shrink-0 mt-0.5">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
              Show previous investigation
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Jump to recalled historical case trail
            </div>
          </div>
        </button>

        {!hasAnalysis && (
          <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 text-center">
            Click <strong className="text-cyan-400">"Analyze with Hindy"</strong> on an alert to enable interactive agent explanations.
          </div>
        )}
      </div>

      {/* Memory Core Live Status Footer */}
      <div className="pt-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Hindsight Core</span>
          <span className="flex items-center space-x-1 text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Ready</span>
          </span>
        </div>
      </div>
    </div>
  );
};
