import React from 'react';
import type { AnalysisResult } from '../types';
import { GitCompare, Sparkles, Info } from 'lucide-react';

interface BeforeAfterPanelProps {
  secondAlertId: string;
  beforeAnalysis: AnalysisResult | null;
  afterAnalysis: AnalysisResult | null;
}

export const BeforeAfterPanel: React.FC<BeforeAfterPanelProps> = ({
  secondAlertId,
  beforeAnalysis,
  afterAnalysis,
}) => {
  if (!beforeAnalysis && !afterAnalysis) return null;

  const getBadge = (state: string) => {
    if (state === 'green') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/60">
          STATE: GREEN
        </span>
      );
    }
    if (state === 'yellow') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-500/60">
          STATE: YELLOW
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-950 text-rose-300 border border-rose-500/60">
        STATE: RED
      </span>
    );
  };

  const getMatchCount = (analysis: AnalysisResult | null) => {
    if (!analysis || !analysis.best_match) return '0 / 0';
    const matches = analysis.best_match.matches?.length || 0;
    const diffs = analysis.best_match.differences?.length || 0;
    return `${matches} / ${matches + diffs}`;
  };

  const getAppliesBadge = (analysis: AnalysisResult | null) => {
    if (!analysis || !analysis.best_match) {
      return <span className="text-slate-500 font-mono text-[11px]">NO MEMORY</span>;
    }
    const applies = analysis.best_match.key_difference_count === 0;
    return (
      <span
        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
          applies
            ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
            : 'bg-rose-950 text-rose-400 border border-rose-700/60'
        }`}
      >
        {applies ? 'MEMORY APPLIES ✓' : 'MEMORY APPLIES ✗'}
      </span>
    );
  };

  const afterTopCase = afterAnalysis?.best_match;
  const isLiveRecall = afterTopCase?.alert_id?.endsWith('-live');

  return (
    <div className="p-4 bg-slate-900/90 border border-cyan-500/40 rounded-xl space-y-4 shadow-lg shadow-cyan-950/20 backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-400">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center space-x-2">
              <span>Learning Pair Verification: Before vs After</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </h3>
            <p className="text-[11px] text-slate-400">
              Comparing alert assessment before and after human experience was retained.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
          {secondAlertId} Evaluation
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* BEFORE COLUMN */}
        <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/70 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
              BEFORE (Pre-Learning Baseline)
            </span>
            {beforeAnalysis && getBadge(beforeAnalysis.state)}
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex items-center justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Signal Matches:</span>
              <span className="font-mono font-semibold text-slate-200">
                {getMatchCount(beforeAnalysis)}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Context Verification:</span>
              {getAppliesBadge(beforeAnalysis)}
            </div>

            <div className="py-1">
              <span className="text-slate-400 block mb-1">Top Recalled Baseline:</span>
              {beforeAnalysis?.best_match ? (
                <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[10px]">
                  <div className="text-cyan-400 font-bold">
                    {beforeAnalysis.best_match.alert_id} ({beforeAnalysis.best_match.host} / {beforeAnalysis.best_match.user})
                  </div>
                  <div className="text-slate-400 truncate">
                    Verdict: {beforeAnalysis.best_match.verdict} • {beforeAnalysis.best_match.outcome}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 italic">No baseline match.</div>
              )}
            </div>
          </div>
        </div>

        {/* AFTER COLUMN */}
        <div className="p-3.5 rounded-lg border border-cyan-600/50 bg-cyan-950/20 space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-300 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <span>AFTER (Live Memory Recalled)</span>
              <Sparkles className="w-3 h-3 text-cyan-400" />
            </span>
            {afterAnalysis && getBadge(afterAnalysis.state)}
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex items-center justify-between py-1 border-b border-cyan-900/40">
              <span className="text-slate-400">Signal Matches:</span>
              <span className="font-mono font-semibold text-emerald-300">
                {getMatchCount(afterAnalysis)}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-cyan-900/40">
              <span className="text-slate-400">Context Verification:</span>
              {getAppliesBadge(afterAnalysis)}
            </div>

            <div className="py-1">
              <span className="text-slate-400 block mb-1">Top Recalled Baseline:</span>
              {afterAnalysis?.best_match ? (
                <div className="p-2 rounded bg-cyan-950/70 border border-cyan-600/60 font-mono text-[10px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-300 font-bold">
                      {afterAnalysis.best_match.alert_id}
                    </span>
                    {isLiveRecall && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                        Confirmed live by Priya Nair (demo)
                      </span>
                    )}
                  </div>
                  <div className="text-slate-300">
                    Host: {afterAnalysis.best_match.host} • User: {afterAnalysis.best_match.user}
                  </div>
                  <div className="text-emerald-400 text-[9px] italic truncate">
                    "{afterAnalysis.best_match.investigation_note}"
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 italic">No recalled memory yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Honest Policy State Explanation Banner */}
      {afterAnalysis?.state === 'yellow' && (
        <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs flex items-start space-x-2">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold font-mono">
              1 analyst-confirmed precedent. Low risk needs at least 2 matching precedents.
            </div>
            <div className="text-[10px] text-amber-300/80 mt-0.5">
              Hindy transparently enforces conservative safety standards: a single live precedent validates context alignment while maintaining human oversight until multiple recurring precedents accumulate.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
