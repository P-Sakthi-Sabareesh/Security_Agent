import React from 'react';
import type { ComparedCase } from '../types';
import { X, CheckCircle2, AlertTriangle, Database, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';

interface WhyThisMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bestMatch: ComparedCase | null;
  recalledCount: number;
}

export const WhyThisMemoryModal: React.FC<WhyThisMemoryModalProps> = ({
  isOpen,
  onClose,
  bestMatch,
  recalledCount,
}) => {
  if (!isOpen) return null;

  const memoryApplies = bestMatch !== null && bestMatch.key_difference_count === 0;

  const closingLine = memoryApplies
    ? 'Memory found, memory applies'
    : 'Memory found, memory does not apply → escalation/review recommended';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-[#0d1424] border border-cyan-500/40 rounded-xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 tracking-wide uppercase">
                Memory Decision Rationale
              </h2>
              <p className="text-xs text-slate-400">
                Deterministic comparison against historical SOC experience
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* Recalled Case Info */}
          {bestMatch ? (
            <div className="p-3.5 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    Recalled Case: {bestMatch.alert_id}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                    Best Match ({recalledCount} recalled)
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Analyst: <span className="text-slate-200 font-medium">{bestMatch.analyst || 'Senior SOC Analyst'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/60">
                  <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">
                    Past Verdict
                  </span>
                  <span className="text-slate-200 font-mono font-semibold">
                    {bestMatch.verdict}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/60">
                  <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">
                    Past Outcome
                  </span>
                  <span className="text-slate-200 font-mono font-semibold">
                    {bestMatch.outcome}
                  </span>
                </div>
              </div>

              {bestMatch.investigation_note && (
                <div className="text-[11px] text-slate-300 bg-slate-950/40 p-2.5 rounded border border-slate-800/50 italic">
                  "{bestMatch.investigation_note}"
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 text-slate-400 text-center">
              No historical case match found in Hindsight memory.
            </div>
          )}

          {/* Matched Signals */}
          {bestMatch && (
            <div className="space-y-2">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold uppercase tracking-wider text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Matched Signals ({bestMatch.matches?.length || 0})</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {bestMatch.matches && bestMatch.matches.length > 0 ? (
                  bestMatch.matches.map((signal, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1.5 bg-emerald-950/20 border border-emerald-800/40 rounded text-emerald-300 font-mono text-[11px] flex items-center space-x-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="truncate">{signal}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic col-span-2">No signals matched.</div>
                )}
              </div>
            </div>
          )}

          {/* Differing Signals */}
          {bestMatch && (
            <div className="space-y-2">
              <div className="flex items-center space-x-1.5 text-rose-400 font-semibold uppercase tracking-wider text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>
                  Differing Signals ({bestMatch.differences?.length || 0})
                  {bestMatch.key_difference_count > 0 && (
                    <span className="ml-1 text-rose-300 font-normal">
                      — {bestMatch.key_difference_count} critical key difference(s)
                    </span>
                  )}
                </span>
              </div>
              <div className="space-y-1.5">
                {bestMatch.differences && bestMatch.differences.length > 0 ? (
                  bestMatch.differences.map((diff, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded border text-[11px] font-mono flex items-center justify-between ${
                        diff.is_key_signal
                          ? 'bg-rose-950/30 border-rose-700/60 text-rose-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            diff.is_key_signal ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]' : 'bg-amber-400'
                          }`}
                        />
                        <span className="font-semibold text-slate-200">{diff.signal}</span>
                        {diff.is_key_signal && (
                          <span className="px-1 text-[9px] uppercase font-bold bg-rose-900/80 text-rose-300 rounded border border-rose-700">
                            KEY SIGNAL
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-slate-400">
                        <span className="text-slate-400 line-through">
                          {String(diff.past ?? 'null')}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="text-rose-300 font-bold">
                          {String(diff.current ?? 'null')}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic">No differences identified. Contexts match 100%.</div>
                )}
              </div>
            </div>
          )}

          {/* Conclusion Box */}
          <div
            className={`p-3.5 rounded-lg border flex items-center space-x-3 ${
              memoryApplies
                ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/60 text-rose-200'
            }`}
          >
            {memoryApplies ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <div className="font-mono font-semibold text-xs tracking-wide">
              {closingLine}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
