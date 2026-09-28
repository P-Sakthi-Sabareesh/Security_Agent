import React, { useState } from 'react';
import { HindyAvatar } from './HindyAvatar';
import type { AnalysisResult, SuggestedChecksResponse } from '../types';
import { Sparkles, Brain, GitCompare, Database, ListChecks, AlertTriangle, Info } from 'lucide-react';

interface HindyPanelProps {
  alertId: string | null;
  hasAnalysis: boolean;
  analysis: AnalysisResult | null;
  onAction: (action: 'reasoning' | 'differences' | 'previous') => void;
  cachedOnly: boolean;
}

export const HindyPanel: React.FC<HindyPanelProps> = ({
  alertId,
  hasAnalysis,
  analysis,
  onAction,
  cachedOnly,
}) => {
  const [checksData, setChecksData] = useState<SuggestedChecksResponse | null>(null);
  const [loadingChecks, setLoadingChecks] = useState(false);
  const [checksError, setChecksError] = useState<string | null>(null);

  const [showRiskExplanation, setShowRiskExplanation] = useState(false);

  // Handler: What should I investigate first? (1 Groq call, grounded on alert + best match, cached)
  const handleFetchChecks = async () => {
    if (!alertId) return;
    setLoadingChecks(true);
    setChecksError(null);

    try {
      const res = await fetch(`/api/checks/${alertId}${cachedOnly ? '?cached_only=true' : ''}`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error('Suggested checks unavailable.');
      }
      const data: SuggestedChecksResponse = await res.json();
      setChecksData(data);
    } catch (err: any) {
      setChecksError(err.message || 'Suggested checks unavailable.');
    } finally {
      setLoadingChecks(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f18]/90 border-l border-slate-800/80 p-4 select-none overflow-y-auto">
      {/* Agent Identity Card */}
      <div className="flex flex-col items-center text-center p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-3 mb-4 shadow-sm flex-shrink-0">
        <div className="relative">
          <HindyAvatar size={52} glow={true} />
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

      {/* Investigation Guidance Buttons */}
      <div className="space-y-2.5 flex-1">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
          Hindy Investigation Actions
        </div>

        {/* 3A: What should I investigate first? */}
        <button
          onClick={handleFetchChecks}
          disabled={!hasAnalysis || loadingChecks}
          className="w-full p-2.5 text-left bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/50 rounded-lg text-xs font-semibold text-cyan-200 transition-all flex items-start space-x-2 group disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-cyan-950/30"
        >
          <div className="p-1 rounded bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 flex-shrink-0 mt-0.5">
            <ListChecks className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-bold text-cyan-200">
              What should I investigate first?
            </div>
            <div className="text-[10px] text-cyan-400/80 font-normal mt-0.5">
              Generate grounded 4–6 ordered triage checks
            </div>
          </div>
        </button>

        {/* Suggested Checks Card Display */}
        {loadingChecks && (
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2">
            <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span>{cachedOnly ? 'Loading recorded suggested checks...' : 'Analyzing alert signals for suggested checks...'}</span>
          </div>
        )}

        {checksError && (
          <div className="p-2.5 rounded bg-rose-950/50 border border-rose-800 text-rose-300 text-[11px]">
            {checksError}
          </div>
        )}

        {checksData && (
          <div className="p-3 bg-slate-950/90 rounded-lg border border-cyan-700/60 space-y-2 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-cyan-300 uppercase tracking-wider text-[10px]">
                Suggested checks
              </span>
              {checksData.cached && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-cyan-400 border border-cyan-800/60">
                  CACHED
                </span>
              )}
            </div>

            <ol className="space-y-1.5 text-[11px] text-slate-300 font-sans">
              {checksData.suggested_checks.map((check, i) => (
                <li key={i} className="flex items-start space-x-1.5">
                  <span className="text-cyan-400 font-mono font-bold flex-shrink-0">{i + 1}.</span>
                  <span className="leading-snug">{check}</span>
                </li>
              ))}
            </ol>

            <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 italic">
              {checksData.note}
            </div>
          </div>
        )}

        {/* 3B: Explain the risk */}
        <button
          onClick={() => setShowRiskExplanation(!showRiskExplanation)}
          disabled={!hasAnalysis}
          className="w-full p-2.5 text-left bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-all flex items-start space-x-2 group disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="p-1 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60 flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-semibold text-slate-200">
              Explain the risk
            </div>
            <div className="text-[10px] text-slate-400 font-normal mt-0.5">
              Break down risk factors from existing signals
            </div>
          </div>
        </button>

        {showRiskExplanation && analysis && (
          <div className="p-3 bg-slate-950/90 rounded-lg border border-amber-700/50 space-y-2 text-xs animate-in fade-in duration-150">
            <div className="font-bold text-amber-300 uppercase tracking-wider text-[10px] flex items-center space-x-1">
              <Info className="w-3 h-3" />
              <span>Risk Evaluation Breakdown</span>
            </div>
            <div className="text-[11px] text-slate-300 leading-relaxed font-sans">
              {analysis.explanation || 'No additional risk narrative available.'}
            </div>
            {analysis.best_match?.differences && analysis.best_match.differences.length > 0 && (
              <div className="pt-1.5 border-t border-slate-800 space-y-1">
                <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider block">
                  Identified Context Divergence:
                </span>
                <ul className="space-y-1 text-[10px] text-slate-300 font-mono">
                  {analysis.best_match.differences.map((d, idx) => (
                    <li key={idx} className="flex items-center space-x-1 text-rose-300/90">
                      <span>•</span>
                      <span>{d.signal}: past {String(d.past)} → current {String(d.current)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Existing 3 Navigation Buttons */}
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">
            Focus Views
          </div>

          <button
            onClick={() => onAction('reasoning')}
            disabled={!hasAnalysis}
            className="w-full p-2 text-left bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-xs font-medium text-slate-300 transition-all flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Brain className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="truncate">Why did you decide this?</span>
          </button>

          <button
            onClick={() => onAction('differences')}
            disabled={!hasAnalysis}
            className="w-full p-2 text-left bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-xs font-medium text-slate-300 transition-all flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <GitCompare className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="truncate">Show context differences</span>
          </button>

          <button
            onClick={() => onAction('previous')}
            disabled={!hasAnalysis}
            className="w-full p-2 text-left bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-xs font-medium text-slate-300 transition-all flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="truncate">Show previous investigation</span>
          </button>
        </div>
      </div>

      {/* Memory Core Live Status Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex-shrink-0">
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
