import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  ArrowLeft, 
  Clock, 
  Server, 
  User as UserIcon, 
  Tag, 
  Activity, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  FileText, 
  UserCheck, 
  RefreshCw, 
  GitCompare,
  Database,
  ShieldCheck,
  X,
  ExternalLink,
  Save,
  Shield
} from 'lucide-react';
import type { AlertDetail, AlertSummary, AnalysisResult, ComparedCase, DecisionResponse } from '../types';
import hindyRobot from '../assets/hindy_robot_base.png';
import { FloatingHindyChat } from './FloatingHindyChat';

interface InvestigationPageProps {
  alert: AlertDetail | null;
  summary?: AlertSummary;
  loadingAlert: boolean;
  loadingAnalysis: boolean;
  analysis: AnalysisResult | null;
  onAnalyze: () => void;
  onBackToDashboard: () => void;
  onNavigateToMemory?: () => void;
  cachedOnly?: boolean;
  onDecisionSuccess?: (resp: DecisionResponse) => void;
}

export const InvestigationPage: React.FC<InvestigationPageProps> = ({
  alert,
  summary,
  loadingAlert,
  loadingAnalysis,
  analysis,
  onAnalyze,
  onBackToDashboard,
  onNavigateToMemory,
  cachedOnly = false,
  onDecisionSuccess,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [inspectModalCase, setInspectModalCase] = useState<ComparedCase | null>(null);

  // Human decision state
  const [analystConclusion, setAnalystConclusion] = useState<'Confirmed benign' | 'Confirmed malicious'>('Confirmed benign');
  const [analystReason, setAnalystReason] = useState<string>('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionSuccess, setDecisionSuccess] = useState<DecisionResponse | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  // Aggregate alert data from detail or summary fallback
  const alertId = alert?.alert_id || summary?.id || 'Unknown';
  const title = alert?.title || summary?.title || 'Security Incident Under Review';
  const originalSeverity = (alert?.severity || summary?.severity || 'medium').toLowerCase();
  const host = alert?.host || summary?.host || 'Unknown Host';
  const user = alert?.user || summary?.user || 'Unknown User';
  const timestamp = alert?.timestamp || summary?.timestamp || '';
  const category = alert?.category || 'Security Alert';
  const mitre = alert?.mitre_technique;
  const detector = alert?.detector_id;

  const isOrigCritical = originalSeverity === 'critical';
  const isOrigHigh = originalSeverity === 'high';
  const isOrigMedium = originalSeverity === 'medium';

  // Ensure analysis actually belongs to the current alert (fixes stale or mismatched analysis)
  const isAnalysisForCurrentAlert = Boolean(analysis && analysis.alert_id === alertId);
  const currentAnalysis = isAnalysisForCurrentAlert ? analysis : null;

  // Dynamic Hindy Assessment resolution from actual agent output
  const hindyState = currentAnalysis?.state; // 'red' | 'yellow' | 'green'
  const isHindyRed = hindyState === 'red';
  const isHindyYellow = hindyState === 'yellow';
  const isHindyGreen = hindyState === 'green';

  // Deduplicate and filter genuinely distinct historical recalled cases
  const distinctRecalledCases = useMemo(() => {
    const rawCases = currentAnalysis?.recalled_cases || [];
    const seenIds = new Set<string>();
    const distinct: ComparedCase[] = [];
    
    for (const c of rawCases) {
      if (c && c.alert_id && !seenIds.has(c.alert_id)) {
        seenIds.add(c.alert_id);
        distinct.push(c);
      }
    }
    return distinct;
  }, [currentAnalysis?.recalled_cases]);

  const activeCase = distinctRecalledCases.find(c => c.alert_id === selectedCaseId) || 
                     currentAnalysis?.best_match || 
                     distinctRecalledCases[0] || 
                     null;

  // Handle Analyst Decision Submission ("Teach Hindy / Save This Learning")
  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertId || alertId === 'Unknown') return;

    setDecisionError(null);
    const trimmedReason = analystReason.trim();

    if (trimmedReason.length < 10) {
      setDecisionError('Analyst justification must be at least 10 characters to retain as security experience.');
      return;
    }

    setSubmittingDecision(true);

    try {
      const response = await fetch(`/api/decision${cachedOnly ? '?cached_only=true' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_id: alertId,
          decision: analystConclusion,
          reason: trimmedReason,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to record analyst conclusion.');
      }

      setDecisionSuccess(data);
      if (onDecisionSuccess) {
        onDecisionSuccess(data);
      }
    } catch (err: any) {
      setDecisionError(err.message || 'Error communicating with backend decision engine.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  return (
    <div className="relative h-full w-full bg-[#070A10] text-[#F5F3FF] overflow-y-auto select-none p-4 md:p-6 lg:p-8">
      {/* Centered Holographic 3D Hindy Presence in Background */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] md:w-[580px] lg:w-[640px] pointer-events-none opacity-[0.12] select-none mix-blend-screen z-0 animate-[float_7s_ease-in-out_infinite]">
        <img
          src={hindyRobot}
          alt="Hindy Holographic Presence"
          className="w-full h-auto object-contain filter drop-shadow-[0_0_80px_rgba(200,255,53,0.3)]"
        />
      </div>

      {/* Ambient background glow orbs */}
      <div className="fixed top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#B8A7FF]/5 blur-[150px] pointer-events-none z-0" />
      <div className="fixed bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#C8FF35]/4 blur-[150px] pointer-events-none z-0" />

      {/* Main Investigation Workspace */}
      <div className="relative z-10 max-w-5xl mx-auto space-y-5 pb-20">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#B8A7FF]/15">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#111321] hover:bg-[#181B2E] border border-[#B8A7FF]/20 text-xs font-mono text-[#B8A7FF] hover:text-[#C8FF35] transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>

            {onNavigateToMemory && (
              <button
                onClick={onNavigateToMemory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111321] hover:bg-[#181B2E] border border-[#B8A7FF]/20 text-xs font-mono text-[#B8A7FF] hover:text-[#C8FF35] transition-all cursor-pointer shadow-sm"
              >
                <Database className="w-3.5 h-3.5 text-[#B8A7FF]" />
                <span>Memory Bank</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-xs font-mono text-[#9D9BB6]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C8FF35] animate-pulse" />
              <span className="tracking-wide">INVESTIGATION WORKSPACE</span>
            </span>
            {alertId !== '—' && (
              <>
                <span className="text-[#B8A7FF]/40">•</span>
                <span className="text-[#C8FF35] font-bold">{alertId}</span>
              </>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 1. CURRENT ALERT CARD OR EMPTY STATE */}
        {/* ========================================================= */}
        {!loadingAlert && (!alert && !summary) ? (
          <div className="p-10 md:p-14 rounded-2xl bg-[#111321]/95 border border-[#B8A7FF]/20 shadow-xl backdrop-blur-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#090B16] border border-[#B8A7FF]/30 flex items-center justify-center mx-auto shadow-md">
              <ShieldAlert className="w-7 h-7 text-[#C8FF35]" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#F5F3FF]">No investigation selected</h2>
              <p className="text-xs text-[#9D9BB6] font-mono max-w-md mx-auto">
                Select an alert from Dashboard to begin an investigation.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={onBackToDashboard}
                className="px-5 py-2.5 rounded-xl bg-[#C8FF35] hover:bg-[#d6ff52] text-[#090B16] font-bold text-xs tracking-wide shadow-[0_0_15px_rgba(200,255,53,0.3)] transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 lg:p-6 rounded-2xl bg-[#111321]/95 border border-[#B8A7FF]/20 shadow-xl backdrop-blur-xl relative overflow-hidden">
            {loadingAlert ? (
              <div className="py-10 text-center space-y-2">
                <Activity className="w-5 h-5 text-[#C8FF35] animate-spin mx-auto" />
                <div className="text-xs font-mono text-[#9D9BB6]">Loading alert telemetry...</div>
              </div>
            ) : (
            <div className="space-y-4">
              {/* Top metadata tags */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Original Alert Severity Badge */}
                  <span
                    className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                      isOrigCritical
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                        : isOrigHigh
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : isOrigMedium
                        ? 'bg-[#B8A7FF]/15 text-[#B8A7FF] border border-[#B8A7FF]/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    ORIGINAL SEVERITY: {originalSeverity.toUpperCase()}
                  </span>

                  {/* Alert ID */}
                  <span className="text-xs font-mono font-bold text-[#C8FF35] px-2.5 py-0.5 rounded bg-[#090B16] border border-[#C8FF35]/30">
                    {alertId}
                  </span>

                  {/* Category Pill */}
                  <span className="text-xs font-mono text-[#9D9BB6] px-2.5 py-0.5 rounded-md bg-[#090B16] border border-[#B8A7FF]/15 flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-[#B8A7FF]" />
                    {category}
                  </span>

                  {mitre && (
                    <span className="text-xs font-mono text-purple-300 px-2 py-0.5 rounded-md bg-purple-950/40 border border-purple-800/40">
                      MITRE: {mitre}
                    </span>
                  )}
                </div>

                {timestamp && (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-[#9D9BB6]">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(timestamp).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Title & Detector */}
              <div>
                <h1 className="text-lg lg:text-xl font-bold tracking-tight text-[#F5F3FF]">
                  {title}
                </h1>
                {detector && (
                  <p className="text-xs font-mono text-[#9D9BB6] mt-0.5">
                    Detector ID: <span className="text-slate-300">{detector}</span>
                  </p>
                )}
              </div>

              {/* Telemetry context chips */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-2.5 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 flex items-center gap-2.5">
                  <Server className="w-4 h-4 text-[#C8FF35] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-[#9D9BB6] uppercase">HOST</div>
                    <div className="text-xs font-mono font-bold text-[#F5F3FF] truncate">{host}</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 flex items-center gap-2.5">
                  <UserIcon className="w-4 h-4 text-[#B8A7FF] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-[#9D9BB6] uppercase">USER</div>
                    <div className="text-xs font-mono font-bold text-[#F5F3FF] truncate">{user}</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-[#9D9BB6] uppercase">STATUS</div>
                    <div className="text-xs font-mono font-bold text-amber-300 truncate">
                      {summary?.is_decided || decisionSuccess ? 'Decided' : 'Pending Investigation'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

        {/* ========================================================= */}
        {/* 2. ANALYZE WITH HINDY TRIGGER OR SHORT LOADING STATE */}
        {/* ========================================================= */}
        {!currentAnalysis && !loadingAnalysis && (alert || summary) && (
          <div className="p-6 lg:p-8 rounded-2xl bg-gradient-to-b from-[#111321] to-[#0A0C16] border border-[#C8FF35]/30 shadow-[0_0_35px_rgba(200,255,53,0.08)] text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#090B16] border border-[#C8FF35]/40 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(200,255,53,0.18)]">
              <Sparkles className="w-6 h-6 text-[#C8FF35]" />
            </div>

            <div className="max-w-lg mx-auto space-y-1.5">
              <h2 className="text-lg font-bold text-[#F5F3FF]">
                Analyze with Hindy
              </h2>
              <p className="text-xs text-[#9D9BB6] leading-relaxed">
                Hindy will retrieve relevant historical investigations from Hindsight memory, perform deterministic signal verification, and evaluate context safety rules.
              </p>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={onAnalyze}
                className="px-6 py-3 rounded-xl bg-[#C8FF35] hover:bg-[#d6ff52] text-[#090B16] font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(200,255,53,0.35)] active:scale-[0.98] transition-all flex items-center gap-2.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>ANALYZE WITH HINDY</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 text-[11px] font-mono text-[#9D9BB6] pt-3 border-t border-[#B8A7FF]/10">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#B8A7FF]" />
                Hindsight Memory Precedents
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C8FF35]" />
                Differential Context Verification
              </span>
            </div>
          </div>
        )}

        {/* Short Progressive Analysis Loading State */}
        {loadingAnalysis && (
          <div className="p-8 lg:p-10 rounded-2xl bg-[#111321]/95 border border-[#C8FF35]/30 shadow-[0_0_35px_rgba(200,255,53,0.15)] text-center space-y-4">
            <Activity className="w-8 h-8 text-[#C8FF35] animate-spin mx-auto" />
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[#F5F3FF]">
                Hindy is analyzing this alert...
              </h3>
              <p className="text-xs text-[#9D9BB6] font-mono">
                Recalling relevant security experience from Hindsight memory...
              </p>
              <p className="text-[11px] text-[#B8A7FF] font-mono">
                Comparing current context & evaluating differential signals...
              </p>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. POST-ANALYSIS INVESTIGATION RESULTS (DYNAMIC ASSESSMENT) */}
        {/* ========================================================= */}
        {currentAnalysis && !loadingAnalysis && (
          <div className="space-y-5 animate-in fade-in duration-300">
            
            {/* 3A. HINDY'S DYNAMIC ASSESSMENT */}
            <section className="p-5 lg:p-6 rounded-2xl bg-[#111321]/95 border border-[#B8A7FF]/20 shadow-xl backdrop-blur-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#B8A7FF]/15">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#090B16] border border-[#C8FF35]/30 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[#C8FF35]" />
                  </div>
                  <div>
                    <h2 className="text-base lg:text-lg font-bold text-[#F5F3FF]">Hindy's Assessment</h2>
                    <p className="text-[11px] text-[#9D9BB6] font-mono">
                      Dynamic AI Advisory • Original alert severity was <span className="uppercase text-slate-300 font-bold">{originalSeverity}</span> • SOC Analyst holds final authority
                    </p>
                  </div>
                </div>

                {/* Dynamic Priority / Risk Badge according to actual agent evaluation */}
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 ${
                      isHindyRed
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                        : isHindyYellow
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                        : isHindyGreen
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {isHindyRed ? (
                      <>
                        <Flame className="w-4 h-4 text-rose-400" />
                        HIGH RISK / ESCALATE
                      </>
                    ) : isHindyYellow ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        MEDIUM CONCERN / NEEDS REVIEW
                      </>
                    ) : isHindyGreen ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        LOW CONCERN / EXPECTED
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 text-slate-400" />
                        {currentAnalysis.state ? `${currentAnalysis.state.toUpperCase()} ASSESSMENT` : 'EVALUATED ASSESSMENT'}
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Assessment Explanation & Recommendation */}
              <div className="p-4 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-2">
                <div className="text-xs font-mono font-bold text-[#C8FF35] uppercase flex items-center gap-1.5">
                  <span>RECOMMENDED ACTION:</span>
                  <span className="text-white font-normal">{currentAnalysis.recommended_action || 'Proceed with structured investigation'}</span>
                </div>
                
                <p className="text-xs text-[#F5F3FF] leading-relaxed">
                  {currentAnalysis.explanation}
                </p>

                {currentAnalysis.safety_overrides && currentAnalysis.safety_overrides.length > 0 && (
                  <div className="text-[11px] font-mono text-amber-300/90 pt-1 flex items-center gap-1.5 border-t border-[#B8A7FF]/10 mt-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Safety Guardrail: {currentAnalysis.safety_overrides.join(', ')}</span>
                  </div>
                )}
              </div>
            </section>

            {/* 3B. RELEVANT PAST INVESTIGATIONS */}
            <section className="p-5 lg:p-6 rounded-2xl bg-[#111321]/95 border border-[#B8A7FF]/20 shadow-xl backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#B8A7FF]/15">
                <div>
                  <h3 className="text-sm lg:text-base font-bold text-[#F5F3FF]">Relevant Past Investigations</h3>
                  <p className="text-xs text-[#9D9BB6]">
                    Genuinely distinct historical cases recalled from Hindsight memory bank ({distinctRecalledCases.length} available). Click any case to inspect full historical details.
                  </p>
                </div>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30">
                  {distinctRecalledCases.length} Precedents
                </span>
              </div>

              {distinctRecalledCases.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-[#9D9BB6] bg-[#090B16] rounded-xl border border-slate-800">
                  No direct precedents returned from Hindsight memory bank for this pattern.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {distinctRecalledCases.slice(0, 6).map((c) => {
                    const isSelected = activeCase?.alert_id === c.alert_id;
                    const isBenign = c.verdict?.toLowerCase().includes('benign');
                    return (
                      <div
                        key={c.alert_id}
                        onClick={() => {
                          setSelectedCaseId(c.alert_id);
                          setInspectModalCase(c);
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 group ${
                          isSelected
                            ? 'bg-[#181B2E] border-[#C8FF35] shadow-[0_0_15px_rgba(200,255,53,0.18)]'
                            : 'bg-[#090B16] hover:bg-[#111321] border-[#B8A7FF]/15 hover:border-[#B8A7FF]/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono font-bold text-[#C8FF35] group-hover:underline flex items-center gap-1">
                              {c.alert_id}
                              <ExternalLink className="w-3 h-3 text-[#9D9BB6] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                isBenign
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {c.verdict || 'Previous Case'}
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-[#F5F3FF] truncate mt-1">
                            {c.title}
                          </h4>
                          <p className="text-[11px] text-[#9D9BB6] line-clamp-2 mt-1 leading-snug">
                            {c.investigation_note || c.outcome || 'No investigation summary recorded.'}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[#B8A7FF]/10 flex items-center justify-between text-[10px] font-mono text-[#9D9BB6]">
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-[#B8A7FF]" />
                            {c.analyst || 'SOC Analyst'}
                          </span>
                          <span className="text-[#C8FF35]">
                            {c.matches?.length || 0} Matches • {c.differences?.length || 0} Diffs
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 3C. CONTEXT COMPARISON: MATCHES & DIFFERENCES */}
            {activeCase && (
              <section className="p-5 lg:p-6 rounded-2xl bg-[#111321]/95 border border-[#B8A7FF]/20 shadow-xl backdrop-blur-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#B8A7FF]/15">
                  <div className="flex items-center gap-2">
                    <GitCompare className="w-4 h-4 text-[#C8FF35]" />
                    <h3 className="text-sm lg:text-base font-bold text-[#F5F3FF]">Context Comparison</h3>
                    <span className="text-xs font-mono text-[#9D9BB6]">
                      (vs Precedent <strong className="text-[#C8FF35]">{activeCase.alert_id}</strong>)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setInspectModalCase(activeCase)}
                      className="text-[11px] font-mono text-[#C8FF35] hover:text-[#d6ff52] bg-[#090B16] px-2.5 py-1 rounded-lg border border-[#C8FF35]/30 hover:border-[#C8FF35]/60 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Precedent History
                    </button>
                    <div className="text-[11px] font-mono text-[#B8A7FF] bg-[#090B16] px-2.5 py-1 rounded-lg border border-[#B8A7FF]/15">
                      "Memory found is not memory applies"
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Left Column: MATCHES */}
                  <div className="p-4 rounded-xl bg-[#090B16] border border-emerald-500/20 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>MATCHES ({activeCase.matches?.length || 0})</span>
                    </div>
                    {activeCase.matches && activeCase.matches.length > 0 ? (
                      <div className="space-y-1.5">
                        {activeCase.matches.map((m, i) => (
                          <div key={i} className="text-xs text-slate-200 bg-[#111321] px-2.5 py-1.5 rounded-lg border border-emerald-500/15 font-mono">
                            • {m}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic font-mono">No direct parameter matches recorded.</div>
                    )}
                  </div>

                  {/* Right Column: DIFFERENCES */}
                  <div className="p-4 rounded-xl bg-[#090B16] border border-rose-500/20 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>DIFFERENCES ({activeCase.differences?.length || 0})</span>
                    </div>
                    {activeCase.differences && activeCase.differences.length > 0 ? (
                      <div className="space-y-1.5">
                        {activeCase.differences.map((d, i) => (
                          <div key={i} className="text-xs text-slate-200 bg-[#111321] px-2.5 py-1.5 rounded-lg border border-rose-500/15 font-mono">
                            <span className="text-rose-300 font-semibold">{d.signal}:</span> Past was <code className="text-[#B8A7FF]">{String(d.past)}</code> vs Current <code className="text-[#C8FF35]">{String(d.current)}</code>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic font-mono">No significant signal differences detected.</div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* 3D. HINDY REASONING PATHWAY */}
            <section className="p-5 lg:p-6 rounded-2xl bg-[#111321]/95 border border-[#B8A7FF]/20 shadow-xl backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#B8A7FF]/15">
                <FileText className="w-4 h-4 text-[#C8FF35]" />
                <h3 className="text-sm lg:text-base font-bold text-[#F5F3FF]">Hindy Reasoning Pathway</h3>
              </div>

              {/* 4-Stage Reasoning Pathway */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                <div className="p-3 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-1">
                  <div className="text-[#B8A7FF] font-bold">1. Previous Experience</div>
                  <div className="text-slate-300 text-[11px]">{distinctRecalledCases.length} memories queried from Hindsight</div>
                </div>

                <div className="p-3 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-1">
                  <div className="text-[#C8FF35] font-bold">2. Current Context</div>
                  <div className="text-slate-300 text-[11px]">{detector || category} telemetry evaluated</div>
                </div>

                <div className="p-3 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-1">
                  <div className="text-amber-300 font-bold">3. Important Differences</div>
                  <div className="text-slate-300 text-[11px]">Evaluated matches vs key signal divergences</div>
                </div>

                <div className="p-3 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-1">
                  <div className="text-[#F5F3FF] font-bold">4. Hindy's Assessment</div>
                  <div className="text-slate-300 text-[11px] capitalize">{hindyState || 'evaluated'} advisory formulated</div>
                </div>
              </div>

              {/* Reasoning Bullet Points */}
              {currentAnalysis.reasons && currentAnalysis.reasons.length > 0 && (
                <div className="p-4 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-1.5">
                  <div className="text-xs font-mono text-[#9D9BB6] uppercase font-bold">Reasoning Breakdown:</div>
                  <ul className="space-y-1 text-xs text-slate-200">
                    {currentAnalysis.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 font-mono">
                        <span className="text-[#C8FF35]">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* ========================================================= */}
            {/* 3E. ANALYST CONCLUSION & LEARNING FROM HUMAN FEEDBACK */}
            {/* ========================================================= */}
            <section className="p-5 lg:p-6 rounded-2xl bg-[#111321]/95 border border-[#C8FF35]/30 shadow-[0_0_30px_rgba(200,255,53,0.06)] backdrop-blur-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#B8A7FF]/15">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#090B16] border border-[#C8FF35]/30 flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-[#C8FF35]" />
                  </div>
                  <div>
                    <h2 className="text-base lg:text-lg font-bold text-[#F5F3FF]">Analyst Conclusion & Disposition</h2>
                    <p className="text-[11px] text-[#9D9BB6] font-mono">
                      Human Authority • Your decision overrides Hindy's assumption and evolves future security experience
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[#090B16] text-[#C8FF35] border border-[#C8FF35]/30">
                  FINAL HUMAN DECISION
                </span>
              </div>

              {decisionSuccess ? (
                <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center gap-2.5 text-sm font-bold text-emerald-400 font-mono">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Memory Evolved • {decisionSuccess.message || 'Decision Recorded Successfully'}</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {decisionSuccess.summary || `Alert ${alertId} has been confirmed and retained into Hindsight memory as document "${decisionSuccess.live_alert_id}".`}
                  </p>
                  <div className="text-[11px] font-mono text-emerald-300/80 pt-1">
                    Future alerts matching this context will reference your confirmed reasoning.
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveDecision} className="space-y-4">
                  {/* Decision Choice Radio Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      onClick={() => setAnalystConclusion('Confirmed benign')}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        analystConclusion === 'Confirmed benign'
                          ? 'bg-[#181B2E] border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.18)]'
                          : 'bg-[#090B16] border-[#B8A7FF]/15 hover:border-[#B8A7FF]/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="analyst_conclusion"
                        checked={analystConclusion === 'Confirmed benign'}
                        onChange={() => setAnalystConclusion('Confirmed benign')}
                        className="mt-1 accent-emerald-400 cursor-pointer"
                      />
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-emerald-400 font-mono">
                          This activity is expected
                        </div>
                        <p className="text-[11px] text-[#9D9BB6] leading-snug">
                          Routine operational baseline, authorized testing, or expected job execution.
                        </p>
                      </div>
                    </label>

                    <label
                      onClick={() => setAnalystConclusion('Confirmed malicious')}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        analystConclusion === 'Confirmed malicious'
                          ? 'bg-[#181B2E] border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.18)]'
                          : 'bg-[#090B16] border-[#B8A7FF]/15 hover:border-[#B8A7FF]/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="analyst_conclusion"
                        checked={analystConclusion === 'Confirmed malicious'}
                        onChange={() => setAnalystConclusion('Confirmed malicious')}
                        className="mt-1 accent-rose-400 cursor-pointer"
                      />
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-rose-400 font-mono">
                          This activity requires security response
                        </div>
                        <p className="text-[11px] text-[#9D9BB6] leading-snug">
                          Suspicious behavior, unauthorized action, or policy violation requiring escalation.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Investigation Note / Rationale */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono font-bold text-[#9D9BB6]">
                      ANALYST INVESTIGATION NOTE & LEARNING RATIONALE:
                    </label>
                    <textarea
                      value={analystReason}
                      onChange={(e) => setAnalystReason(e.target.value)}
                      placeholder="Explain your finding (e.g. 'Confirmed scheduled nightly sync matching authorized change ticket CHG-3953; destination IP verified in internal topology...')"
                      rows={3}
                      className="w-full p-3 bg-[#090B16] border border-[#B8A7FF]/20 rounded-xl text-xs text-[#F5F3FF] placeholder-[#9D9BB6]/40 focus:outline-none focus:border-[#C8FF35] font-mono leading-relaxed transition-all shadow-inner"
                      required
                    />
                    <div className="flex justify-between text-[10px] font-mono text-[#9D9BB6]">
                      <span>Minimum 10 characters required for memory retention.</span>
                      <span>{analystReason.trim().length} chars</span>
                    </div>
                  </div>

                  {decisionError && (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 font-mono flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{decisionError}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] font-mono text-[#B8A7FF]">
                      Hindy will record this human resolution into the permanent experience bank.
                    </div>

                    <button
                      type="submit"
                      disabled={submittingDecision || analystReason.trim().length < 10}
                      className="px-5 py-2.5 rounded-xl bg-[#C8FF35] hover:bg-[#d6ff52] disabled:opacity-40 disabled:cursor-not-allowed text-[#090B16] font-bold text-xs tracking-wide shadow-[0_0_20px_rgba(200,255,53,0.3)] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {submittingDecision ? (
                        <>
                          <Activity className="w-3.5 h-3.5 animate-spin" />
                          <span>EVOLVING MEMORY...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>TEACH HINDY / SAVE THIS LEARNING</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Bottom Quick Return actions */}
              <div className="pt-3 border-t border-[#B8A7FF]/10 flex items-center justify-between">
                <button
                  onClick={onAnalyze}
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-[#9D9BB6] hover:text-[#C8FF35] transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-run Hindy Analysis
                </button>

                <button
                  onClick={onBackToDashboard}
                  className="px-4 py-2 rounded-xl bg-[#111321] hover:bg-[#181B2E] border border-[#B8A7FF]/20 text-xs font-mono text-[#F5F3FF] transition-all cursor-pointer active:scale-95"
                >
                  Return to Dashboard
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 4. EXPANDED HISTORICAL PRECEDENT INSPECTION MODAL */}
      {/* ========================================================= */}
      {inspectModalCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#111321] border border-[#B8A7FF]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#B8A7FF]/15 flex items-center justify-between bg-[#090B16]">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-[#C8FF35]" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#F5F3FF] font-mono">
                      Historical Precedent: {inspectModalCase.alert_id}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                        inspectModalCase.verdict?.toLowerCase().includes('benign')
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {inspectModalCase.verdict || 'Past Case'}
                    </span>
                  </div>
                  <p className="text-xs text-[#9D9BB6] mt-0.5">
                    Recalled from Hindsight memory bank
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectModalCase(null)}
                className="p-1.5 rounded-lg bg-[#181B2E] hover:bg-[#20253D] text-[#9D9BB6] hover:text-[#F5F3FF] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs font-mono">
              {/* Case Title & Category */}
              <div className="p-3.5 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-1">
                <div className="text-[10px] text-[#9D9BB6] uppercase">ORIGINAL INCIDENT TITLE</div>
                <div className="text-sm font-bold text-[#F5F3FF] font-sans">{inspectModalCase.title}</div>
                <div className="text-[11px] text-[#B8A7FF]">Category: {inspectModalCase.category}</div>
              </div>

              {/* Observed Telemetry */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15">
                  <div className="text-[10px] text-[#9D9BB6]">HOST</div>
                  <div className="text-slate-200 font-bold truncate mt-0.5">{inspectModalCase.host || 'N/A'}</div>
                </div>

                <div className="p-3 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15">
                  <div className="text-[10px] text-[#9D9BB6]">USER / INITIATOR</div>
                  <div className="text-slate-200 font-bold truncate mt-0.5">{inspectModalCase.user || 'N/A'}</div>
                </div>

                <div className="p-3 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15">
                  <div className="text-[10px] text-[#9D9BB6]">SEVERITY</div>
                  <div className="text-slate-200 font-bold capitalize mt-0.5">{inspectModalCase.severity || 'N/A'}</div>
                </div>
              </div>

              {/* Investigation Note / What Happened */}
              <div className="p-3.5 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-1.5">
                <div className="text-[10px] text-[#9D9BB6] uppercase flex items-center justify-between">
                  <span>HISTORICAL INVESTIGATION NOTE</span>
                  <span className="text-[#B8A7FF]">Analyst: {inspectModalCase.analyst || 'SOC Tier-1'}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {inspectModalCase.investigation_note || inspectModalCase.outcome || 'No investigation summary recorded.'}
                </p>
              </div>

              {/* Final Outcome */}
              <div className="p-3.5 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-1">
                <div className="text-[10px] text-[#9D9BB6] uppercase">FINAL OUTCOME / RESOLUTION</div>
                <div className="text-xs text-slate-200 font-sans">{inspectModalCase.outcome || inspectModalCase.verdict}</div>
              </div>

              {/* Connection to current alert: Matches & Differences */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-[#090B16] border border-emerald-500/20 space-y-1.5">
                  <div className="text-emerald-400 font-bold text-[11px]">
                    MATCHES WITH CURRENT ALERT ({inspectModalCase.matches?.length || 0})
                  </div>
                  {inspectModalCase.matches && inspectModalCase.matches.length > 0 ? (
                    <div className="space-y-1">
                      {inspectModalCase.matches.map((m, i) => (
                        <div key={i} className="text-[11px] text-slate-300">• {m}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic">No exact parameter matches</div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[#090B16] border border-rose-500/20 space-y-1.5">
                  <div className="text-rose-300 font-bold text-[11px]">
                    DIFFERENCES IN CURRENT ALERT ({inspectModalCase.differences?.length || 0})
                  </div>
                  {inspectModalCase.differences && inspectModalCase.differences.length > 0 ? (
                    <div className="space-y-1">
                      {inspectModalCase.differences.map((d, i) => (
                        <div key={i} className="text-[11px] text-slate-300">
                          <span className="text-rose-300">{d.signal}:</span> Past was {String(d.past)} vs Current {String(d.current)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic">No key signal differences</div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#090B16] border-t border-[#B8A7FF]/15 flex items-center justify-between">
              <span className="text-[11px] text-[#9D9BB6] font-mono">
                "Memory found is not memory applies"
              </span>
              <button
                onClick={() => setInspectModalCase(null)}
                className="px-4 py-2 rounded-xl bg-[#C8FF35] hover:bg-[#d6ff52] text-[#090B16] font-bold text-xs font-mono transition-all cursor-pointer"
              >
                Close Precedent Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. FLOATING HINDY INVESTIGATION CHAT WIDGET */}
      {/* ========================================================= */}
      <FloatingHindyChat
        alertId={alertId}
        alertTitle={title}
        analysisState={hindyState}
      />
    </div>
  );
};
