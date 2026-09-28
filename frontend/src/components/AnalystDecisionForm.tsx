import React, { useState, useEffect } from 'react';
import type { AlertDetail, AnalysisResult, DecisionResponse } from '../types';
import { ShieldCheck, ShieldAlert, Sparkles, CheckCircle2, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';

interface AnalystDecisionFormProps {
  alert: AlertDetail;
  analysis: AnalysisResult | null;
  isDecided: boolean;
  isFirstLearningPair: boolean;
  onDecisionSuccess: (resp: DecisionResponse) => void;
  onNavigateNextSimilar?: () => void;
}

export const AnalystDecisionForm: React.FC<AnalystDecisionFormProps> = ({
  alert,
  analysis,
  isDecided,
  isFirstLearningPair,
  onDecisionSuccess,
  onNavigateNextSimilar,
}) => {
  const [decision, setDecision] = useState<'Confirmed malicious' | 'Confirmed benign'>('Confirmed benign');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<DecisionResponse | null>(null);

  const isGreen = analysis?.state === 'green';

  // Pre-fill reason with editable demo-appropriate text if Green or if first learning pair
  useEffect(() => {
    if (isGreen) {
      setDecision('Confirmed benign');
      setReason('Confirmed routine benign activity matching established baseline; verified with standard operational patterns.');
    } else if (alert.alert_id === 'ALRT-00602') {
      setDecision('Confirmed benign');
      setReason('Verified user deepa.joshi had a temporary password typo; subsequent sign-in succeeded from the same recognized internal device.');
    } else {
      setReason('');
    }
    setSuccessData(null);
    setErrorMsg(null);
  }, [alert.alert_id, isGreen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 10) {
      setErrorMsg('Investigation reason is required and must be at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_id: alert.alert_id,
          decision: decision,
          reason: trimmedReason,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Memory retention failed.');
      }

      const data: DecisionResponse = await res.json();
      setSuccessData(data);
      onDecisionSuccess(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to confirm decision.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-100">
              {isGreen ? 'Analyst Quick-Confirm' : 'Analyst Human Decision & Learning'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {isGreen
                ? 'Review and explicitly verify this low-risk baseline to update organizational memory.'
                : 'Confirm verdict to retain new episodic security experience into Hindsight memory.'}
            </p>
          </div>
        </div>

        {isDecided && !successData && (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800/60">
            Decided (Live Memory Active)
          </span>
        )}
      </div>

      {/* Success Banner / Memory Evolved State */}
      {successData ? (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/60 rounded-lg space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 text-emerald-300 font-semibold text-xs">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="uppercase tracking-wider">Memory Evolved</span>
          </div>

          <div className="text-xs text-slate-200 leading-relaxed font-sans">
            New organizational experience stored:{' '}
            <strong className="text-emerald-300">{successData.summary}</strong>
          </div>

          {/* Timeline */}
          <div className="pt-2 border-t border-emerald-800/40 flex items-center justify-between text-[10px] text-slate-300 font-mono">
            <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              <span>Analyst confirmed</span>
            </span>
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              <span>Memory stored</span>
            </span>
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <span className="flex items-center space-x-1 text-cyan-300 font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              <span>Available for future recall</span>
            </span>
          </div>

          {/* Learning Pair Button */}
          {isFirstLearningPair && onNavigateNextSimilar && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onNavigateNextSimilar}
                className="w-full py-2 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold tracking-wide shadow-md flex items-center justify-center space-x-2 transition-all"
              >
                <span>Analyze next similar alert (ALRT-00687)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Decision Radio Selector */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Analyst Verdict (Strict Option)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label
                className={`flex items-center space-x-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  decision === 'Confirmed benign'
                    ? 'bg-emerald-950/50 border-emerald-500/80 text-emerald-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="verdict_option"
                  value="Confirmed benign"
                  checked={decision === 'Confirmed benign'}
                  onChange={() => setDecision('Confirmed benign')}
                  className="text-emerald-500 focus:ring-0 bg-slate-900 border-slate-700"
                />
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-xs font-semibold">Confirmed benign</span>
              </label>

              <label
                className={`flex items-center space-x-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  decision === 'Confirmed malicious'
                    ? 'bg-rose-950/50 border-rose-500/80 text-rose-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="verdict_option"
                  value="Confirmed malicious"
                  checked={decision === 'Confirmed malicious'}
                  onChange={() => setDecision('Confirmed malicious')}
                  className="text-rose-500 focus:ring-0 bg-slate-900 border-slate-700"
                />
                <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span className="text-xs font-semibold">Confirmed malicious</span>
              </label>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Investigation Note & Rationale <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] text-slate-500">
                Min 10 chars ({reason.trim().length} chars)
              </span>
            </div>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide specific investigation rationale (e.g. verified with user, checked authentication logs)..."
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-sans transition-colors"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || reason.trim().length < 10}
            className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-cyan-950/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Hindy is learning...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>CONFIRM & TEACH HINDY</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
