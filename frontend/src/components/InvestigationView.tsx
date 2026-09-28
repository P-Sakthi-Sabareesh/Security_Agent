import React, { useState } from 'react';
import type { AlertDetail, AnalysisResult, ComparedCase } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  Brain,
  Server,
  User,
  Clock,
  AlertTriangle,
  ArrowRight,
  GitCompare,
  Database,
  Cpu,
  Layers,
  ChevronRight,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  Terminal,
} from 'lucide-react';
import { WhyThisMemoryModal } from './WhyThisMemoryModal';

interface InvestigationViewProps {
  alert: AlertDetail | null;
  loadingAlert: boolean;
  memoryAnalysis: AnalysisResult | null;
  noMemoryAnalysis: AnalysisResult | null;
  loadingAnalysis: boolean;
  loadingNoMemory: boolean;
  onAnalyze: () => void;
  onToggleNoMemory: (enabled: boolean) => void;
  showNoMemory: boolean;
  highlightedSection: string | null;
}

export const InvestigationView: React.FC<InvestigationViewProps> = ({
  alert,
  loadingAlert,
  memoryAnalysis,
  noMemoryAnalysis,
  loadingAnalysis,
  loadingNoMemory,
  onAnalyze,
  onToggleNoMemory,
  showNoMemory,
  highlightedSection,
}) => {
  const [whyMemoryOpen, setWhyMemoryOpen] = useState(false);
  const [_selectedCaseDetail, setSelectedCaseDetail] = useState<ComparedCase | null>(null);

  if (loadingAlert) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 p-8">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Loading alert details...</span>
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-400">No Alert Selected</h3>
          <p className="text-xs text-slate-600 mt-1">Select an alert from the queue to investigate.</p>
        </div>
      </div>
    );
  }

  const bestMatch = memoryAnalysis?.best_match || null;
  const memoryFound = bestMatch !== null;
  const memoryApplies = bestMatch !== null && bestMatch.key_difference_count === 0;

  // Signal counts for Context Match Meter
  const matchedSignalsCount = bestMatch?.matches?.length || 0;
  const differingSignalsCount = bestMatch?.differences?.length || 0;
  const totalSignalsCount = matchedSignalsCount + differingSignalsCount;

  // Build unified signal list for Git-style diff
  const allDiffRows: Array<{
    signal: string;
    past: any;
    current: any;
    isChanged: boolean;
    isKeySignal: boolean;
  }> = [];

  if (bestMatch) {
    // Add differences
    (bestMatch.differences || []).forEach((diff) => {
      allDiffRows.push({
        signal: diff.signal,
        past: diff.past,
        current: diff.current,
        isChanged: true,
        isKeySignal: !!diff.is_key_signal,
      });
    });

    // Add matches
    (bestMatch.matches || []).forEach((sig) => {
      // Find current value from alert
      const val: any = (alert.context && alert.context[sig] !== undefined)
        ? alert.context[sig]
        : (alert as any)[sig];
      allDiffRows.push({
        signal: sig,
        past: val,
        current: val,
        isChanged: false,
        isKeySignal: false,
      });
    });
  }

  const getStateBadge = (state: 'green' | 'yellow' | 'red') => {
    if (state === 'green') {
      return (
        <div className="flex items-center space-x-2 px-3.5 py-2 bg-emerald-950/60 border border-emerald-500/80 rounded-lg text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">STATE: GREEN</div>
            <div className="text-xs font-semibold">LOW RISK. Analyst quick-confirm recommended.</div>
          </div>
        </div>
      );
    }
    if (state === 'yellow') {
      return (
        <div className="flex items-center space-x-2 px-3.5 py-2 bg-amber-950/60 border border-amber-500/80 rounded-lg text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">STATE: YELLOW</div>
            <div className="text-xs font-semibold">REVIEW REQUIRED</div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center space-x-2 px-3.5 py-2 bg-rose-950/70 border border-rose-500/90 rounded-lg text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.25)]">
        <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">STATE: RED</div>
          <div className="text-xs font-semibold">HIGH RISK. Human investigation required.</div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5 bg-[#070b12] text-slate-200">
      {/* 1. Alert Header Card */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3 backdrop-blur shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-800/80">
                {alert.alert_id}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                {alert.severity}
              </span>
              {alert.category && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-950 text-slate-400 border border-slate-800">
                  {alert.category}
                </span>
              )}
            </div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight">
              {alert.title}
            </h1>
          </div>

          {/* Action button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onAnalyze}
              disabled={loadingAnalysis}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-semibold text-xs tracking-wide shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingAnalysis ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Hindy is recalling similar investigations...</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 text-cyan-200" />
                  <span>Analyze with Hindy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Metadata Details Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex items-center space-x-2 bg-slate-950/50 px-2.5 py-1.5 rounded border border-slate-800/60">
            <Server className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 text-[10px] block uppercase">Host</span>
              <span className="font-mono text-slate-300">{alert.host}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950/50 px-2.5 py-1.5 rounded border border-slate-800/60">
            <User className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 text-[10px] block uppercase">User</span>
              <span className="font-mono text-slate-300">{alert.user}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950/50 px-2.5 py-1.5 rounded border border-slate-800/60">
            <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 text-[10px] block uppercase">Timestamp</span>
              <span className="font-mono text-slate-300">{alert.timestamp}</span>
            </div>
          </div>

          {alert.dst ? (
            <div className="flex items-center space-x-2 bg-slate-950/50 px-2.5 py-1.5 rounded border border-slate-800/60">
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <div className="truncate">
                <span className="text-slate-500 text-[10px] block uppercase">Destination</span>
                <span className="font-mono text-slate-300 truncate">{alert.dst}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-slate-950/50 px-2.5 py-1.5 rounded border border-slate-800/60">
              <Layers className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <div className="truncate">
                <span className="text-slate-500 text-[10px] block uppercase">Src IP</span>
                <span className="font-mono text-slate-300">{alert.src_ip || 'Internal'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Analysis Results Container */}
      {memoryAnalysis && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* 8A. State Badge & 8B. Memory Badges Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-7">
              {getStateBadge(memoryAnalysis.state)}
            </div>

            <div className="md:col-span-5 flex items-center space-x-2">
              {/* Badge 1: Memory Found */}
              <div
                className={`flex-1 p-2 rounded-lg border flex flex-col items-center justify-center ${
                  memoryFound
                    ? 'bg-cyan-950/50 border-cyan-600/70 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                <span className="text-[9px] uppercase font-bold tracking-wider">Hindsight Core</span>
                <span className="text-xs font-mono font-bold">
                  {memoryFound ? 'MEMORY FOUND ✓' : 'NO MEMORY ✗'}
                </span>
              </div>

              {/* Badge 2: Memory Applies */}
              <div
                className={`flex-1 p-2 rounded-lg border flex flex-col items-center justify-center ${
                  memoryApplies
                    ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300'
                    : memoryFound
                    ? 'bg-rose-950/60 border-rose-500/80 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                <span className="text-[9px] uppercase font-bold tracking-wider">Verification</span>
                <span className="text-xs font-mono font-bold">
                  {memoryApplies
                    ? 'MEMORY APPLIES ✓'
                    : memoryFound
                    ? 'MEMORY APPLIES ✗'
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* 8C. Context Match Meter */}
          {bestMatch && totalSignalsCount > 0 && (
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <GitCompare className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Context Match Meter
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-200">
                  <span className="text-emerald-400">{matchedSignalsCount}</span> /{' '}
                  <span className="text-slate-400">{totalSignalsCount}</span> signals match
                </div>
              </div>

              {/* Segmented Horizontal Meter */}
              <div className="flex items-center space-x-1 h-3.5 bg-slate-950 p-1 rounded-md border border-slate-800">
                {/* Render matched segments (green) */}
                {Array.from({ length: matchedSignalsCount }).map((_, i) => (
                  <div
                    key={`match-${i}`}
                    className="flex-1 h-full bg-emerald-400 rounded-sm shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                    title="Matched Context Signal"
                  />
                ))}
                {/* Render differing segments (red) */}
                {Array.from({ length: differingSignalsCount }).map((_, i) => (
                  <div
                    key={`diff-${i}`}
                    className="flex-1 h-full bg-rose-500 rounded-sm shadow-[0_0_8px_rgba(244,63,94,0.7)] animate-pulse"
                    title="Differing Context Signal"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span>{matchedSignalsCount} Exact Context Matches</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  <span>{differingSignalsCount} Signal Divergence(s)</span>
                </span>
              </div>
            </div>
          )}

          {/* 8D. Git-Style Context Diff */}
          {bestMatch && (
            <div
              id="context-diff"
              className={`p-4 bg-slate-900/80 border rounded-xl space-y-3 transition-all duration-300 ${
                highlightedSection === 'context-diff'
                  ? 'border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.25)] bg-slate-900'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center space-x-2">
                  <GitCompare className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                    Git-Style Context Diff
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center space-x-2">
                  <span>
                    Past Experience:{' '}
                    <span className="font-mono font-bold text-cyan-300">{bestMatch.alert_id}</span>
                  </span>
                  <span>•</span>
                  <span>
                    Analyst:{' '}
                    <span className="font-medium text-slate-200">{bestMatch.analyst || 'Senior Analyst'}</span>
                  </span>
                </div>
              </div>

              {/* Two-column diff table */}
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-xs font-mono text-left">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                      <th className="py-2 px-3">Signal Name</th>
                      <th className="py-2 px-3">PAST EXPERIENCE ({bestMatch.alert_id})</th>
                      <th className="py-2 px-3">CURRENT ALERT</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {allDiffRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          row.isChanged
                            ? 'bg-rose-950/30 text-rose-200 hover:bg-rose-950/50'
                            : 'text-slate-400 hover:bg-slate-900/40 opacity-75'
                        }`}
                      >
                        <td className="py-2 px-3 font-semibold text-slate-300">
                          {row.signal}
                        </td>
                        <td className="py-2 px-3">
                          <span className={row.isChanged ? 'text-rose-300/80 line-through' : 'text-slate-300'}>
                            {String(row.past ?? 'null')}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={row.isChanged ? 'text-rose-200 font-bold bg-rose-900/60 px-1.5 py-0.5 rounded border border-rose-700/80' : 'text-slate-300'}>
                            {String(row.current ?? 'null')}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          {row.isChanged ? (
                            <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold rounded bg-rose-900 text-rose-200 border border-rose-700">
                              {row.isKeySignal ? 'KEY DIFF' : 'DIFF'}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[9px] uppercase font-semibold rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                              MATCH
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 8E. Memory Trail Cards */}
          <div
            id="memory-trail"
            className={`p-4 bg-slate-900/80 border rounded-xl space-y-3 transition-all duration-300 ${
              highlightedSection === 'memory-trail'
                ? 'border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.25)] bg-slate-900'
                : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Recalled Memory Trail ({memoryAnalysis.recalled_cases?.length || 0} Cases)
                </span>
              </div>

              {/* 8F. Why This Memory Button */}
              <button
                onClick={() => setWhyMemoryOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-300 rounded text-xs font-semibold transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>WHY THIS MEMORY?</span>
              </button>
            </div>

            {/* Recalled Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(memoryAnalysis.recalled_cases || []).map((cCase) => {
                const isBest = cCase.alert_id === memoryAnalysis.best_match_id;
                return (
                  <div
                    key={cCase.alert_id}
                    onClick={() => setSelectedCaseDetail(cCase)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      isBest
                        ? 'bg-cyan-950/30 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          {cCase.alert_id}
                        </span>
                        {isBest && (
                          <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 rounded">
                            BEST MATCH
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {cCase.timestamp || cCase.day || 'Historical'}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-slate-200 mb-2 line-clamp-1">
                      {cCase.title}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                      <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-500 text-[9px] block uppercase">Verdict</span>
                        <span className="text-slate-200 font-mono font-medium">{cCase.verdict}</span>
                      </div>
                      <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-500 text-[9px] block uppercase">Outcome</span>
                        <span className="text-slate-200 font-mono font-medium">{cCase.outcome}</span>
                      </div>
                    </div>

                    {cCase.investigation_note && (
                      <div className="text-[11px] text-slate-400 line-clamp-2 italic bg-slate-900/60 p-2 rounded border border-slate-800/50 mb-2">
                        "{cCase.investigation_note}"
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>Analyst: <strong className="text-slate-300">{cCase.analyst || 'SOC Team'}</strong></span>
                      <span className="text-cyan-400">
                        {cCase.matches?.length || 0} matches • {cCase.key_difference_count || 0} key diffs
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 8G. Hindy's Reasoning */}
          <div
            id="hindy-reasoning"
            className={`p-4 bg-slate-900/80 border rounded-xl space-y-3.5 transition-all duration-300 ${
              highlightedSection === 'hindy-reasoning'
                ? 'border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.25)] bg-slate-900'
                : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Hindy Reasoning & Decision Logic
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {memoryAnalysis.cached && (
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-cyan-300 border border-cyan-800/60">
                    CACHED
                  </span>
                )}
                {memoryAnalysis.llm_result?.model_used && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800 flex items-center space-x-1">
                    <Cpu className="w-3 h-3 text-cyan-500" />
                    <span>reasoned by {memoryAnalysis.llm_result.model_used}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Reasons List */}
            {memoryAnalysis.reasons && memoryAnalysis.reasons.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Key Findings:
                </span>
                <ul className="space-y-1">
                  {memoryAnalysis.reasons.map((r, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-slate-200 flex items-start space-x-2 bg-slate-950/40 p-2 rounded border border-slate-800/50"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Explanation */}
            {memoryAnalysis.explanation && (
              <div className="space-y-1 text-xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Synthesis & Rationale:
                </span>
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-slate-300 leading-relaxed font-sans">
                  {memoryAnalysis.explanation}
                </div>
              </div>
            )}

            {/* Recommended Action */}
            {memoryAnalysis.recommended_action && (
              <div className="p-3 bg-cyan-950/30 rounded-lg border border-cyan-700/40 flex items-start space-x-2 text-xs">
                <Terminal className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-cyan-300 uppercase text-[10px] tracking-wider block">
                    Recommended Action
                  </span>
                  <span className="text-slate-200 font-medium">
                    {memoryAnalysis.recommended_action}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 8H. Compare Without Memory Toggle */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Ablation Comparison
                </h3>
                <p className="text-[11px] text-slate-400">
                  Evaluate how Groq reasons when memory recall is completely disabled.
                </p>
              </div>
              <button
                onClick={() => onToggleNoMemory(!showNoMemory)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors"
              >
                {showNoMemory ? (
                  <ToggleRight className="w-5 h-5 text-cyan-400" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-slate-500" />
                )}
                <span>Compare without memory</span>
              </button>
            </div>

            {showNoMemory && (
              <div className="pt-3 border-t border-slate-800">
                {loadingNoMemory ? (
                  <div className="p-6 text-center text-slate-400 text-xs flex flex-col items-center space-y-2">
                    <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span>Running isolated reasoning without memory...</span>
                  </div>
                ) : noMemoryAnalysis ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* With Memory summary */}
                    <div className="p-3 bg-slate-950 rounded-lg border border-cyan-800/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase text-cyan-400">
                          With Hindy Memory
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300">
                          STATE: {memoryAnalysis.state.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 space-y-1">
                        {memoryAnalysis.reasons.slice(0, 3).map((r, i) => (
                          <div key={i} className="flex items-start space-x-1.5">
                            <span className="text-cyan-400">•</span>
                            <span className="line-clamp-2">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Without Memory summary */}
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase text-slate-400">
                          Without Memory (Baseline)
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300">
                          STATE: {noMemoryAnalysis.state.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 space-y-1">
                        {noMemoryAnalysis.reasons && noMemoryAnalysis.reasons.length > 0 ? (
                          noMemoryAnalysis.reasons.slice(0, 3).map((r, i) => (
                            <div key={i} className="flex items-start space-x-1.5">
                              <span className="text-slate-500">•</span>
                              <span className="line-clamp-2">{r}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-500 italic">No specific reasons generated.</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950 rounded border border-slate-800 text-slate-500 text-xs text-center">
                    unavailable
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8F. Why This Memory Modal */}
      <WhyThisMemoryModal
        isOpen={whyMemoryOpen}
        onClose={() => setWhyMemoryOpen(false)}
        bestMatch={bestMatch}
        recalledCount={memoryAnalysis?.recalled_cases?.length || 0}
      />
    </div>
  );
};
