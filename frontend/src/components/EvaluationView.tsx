import React, { useEffect, useState, useMemo } from 'react';
import type { EvaluationSummary, EvaluationAlertItem, EvaluationMetrics } from '../types';
import {
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Search,
  ArrowRight,
  Database,
  UserCheck,
  Sparkles,
  Info,
  RefreshCw,
  X,
  History,
  CheckCircle2,
  GitCompare,
  Layers,
  Cpu
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

export const EvaluationView: React.FC = () => {
  const [selectedVersion, setSelectedVersion] = useState<'v2' | 'v1'>('v2');
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);
  const [alerts, setAlerts] = useState<EvaluationAlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [impactFilter, setImpactFilter] = useState<'all' | 'changed' | 'enriched' | 'no_change'>('all');
  const [scenarioFilter, setScenarioFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<EvaluationAlertItem | null>(null);

  // Load evaluation summary and alert list
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`${API_BASE}/api/evaluation?version=${selectedVersion}`).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).detail || 'Failed to load evaluation summary.');
        return res.json() as Promise<EvaluationSummary>;
      }),
      fetch(`${API_BASE}/api/evaluation/alerts?version=${selectedVersion}`).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).detail || 'Failed to load evaluation alerts.');
        return res.json() as Promise<EvaluationAlertItem[]>;
      }),
    ])
      .then(([summaryData, alertsData]) => {
        if (isMounted) {
          setSummary(summaryData);
          setAlerts(alertsData);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedVersion]);

  // Extract metrics based on version
  const metricsKey = selectedVersion === 'v2' ? 'v2_memory_mode' : 'v1_memory_mode';
  const noMemoryKey = selectedVersion === 'v2' ? 'v2_no_memory_mode' : 'v1_no_memory_mode';

  const memMetrics: EvaluationMetrics | undefined = summary?.metrics?.[metricsKey];
  const noMemMetrics: EvaluationMetrics | undefined = summary?.metrics?.[noMemoryKey];

  // Derived unique scenarios for filter dropdown
  const uniqueScenarios = useMemo(() => {
    const set = new Set<string>();
    alerts.forEach((a) => {
      if (a.scenario) set.add(a.scenario);
    });
    return Array.from(set).sort();
  }, [alerts]);

  // Filtered alert list
  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = item.alert_id.toLowerCase().includes(q);
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesUser = item.user?.toLowerCase().includes(q);
        const matchesHost = item.host?.toLowerCase().includes(q);
        const matchesCategory = item.category?.toLowerCase().includes(q);
        if (!matchesId && !matchesTitle && !matchesUser && !matchesHost && !matchesCategory) {
          return false;
        }
      }

      // Impact Filter
      if (impactFilter === 'changed' && item.impact_category !== 'changed_decision') return false;
      if (impactFilter === 'enriched' && item.impact_category !== 'context_enriched') return false;
      if (impactFilter === 'no_change' && item.impact_category !== 'no_change') return false;

      // Scenario Filter
      if (scenarioFilter !== 'all' && item.scenario !== scenarioFilter) return false;

      return true;
    });
  }, [alerts, searchQuery, impactFilter, scenarioFilter]);

  // Helper function to render state pill
  const renderStatePill = (state?: string) => {
    const s = (state || 'unknown').toLowerCase();
    if (s === 'green') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30 shadow-[0_0_8px_rgba(200,255,53,0.15)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF35]" />
          GREEN (Benign)
        </span>
      );
    }
    if (s === 'yellow') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          YELLOW (Review)
        </span>
      );
    }
    if (s === 'red') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.15)]">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
          RED (Threat)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono text-[#9D9BB6] bg-[#121424] border border-[#B8A7FF]/20">
        {state || 'UNKNOWN'}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#05070E] text-[#F5F3FF] overflow-y-auto select-text font-sans">
      {/* 1. Page Header */}
      <div className="p-6 md:px-8 border-b border-[#B8A7FF]/15 bg-gradient-to-b from-[#090B16] to-[#05070E]/80 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#B8A7FF]/20 text-[#B8A7FF] border border-[#B8A7FF]/30 uppercase tracking-wider">
                Benchmark Suite
              </span>
              <span className="text-xs font-mono text-[#9D9BB6]">94 Sample Alerts (Seed 42)</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#F5F3FF] flex items-center gap-2">
              EVALUATION
            </h1>
            <p className="text-sm text-[#9D9BB6] mt-0.5">
              Measure the impact of persistent security memory. Compare investigations with HINDY's retained experience against the same evaluation without memory.
            </p>
          </div>

          {/* Benchmark Version Selector */}
          <div className="flex items-center gap-2 bg-[#090B16] p-1.5 rounded-xl border border-[#B8A7FF]/20 shadow-inner">
            <span className="text-xs font-mono text-[#9D9BB6] px-2.5 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#C8FF35]" />
              Dataset:
            </span>
            <button
              onClick={() => setSelectedVersion('v2')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                selectedVersion === 'v2'
                  ? 'bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/40 shadow-[0_0_12px_rgba(200,255,53,0.2)] font-semibold'
                  : 'text-[#9D9BB6] hover:text-[#F5F3FF] border border-transparent'
              }`}
            >
              V2 Benchmark (Refined)
            </button>
            <button
              onClick={() => setSelectedVersion('v1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                selectedVersion === 'v1'
                  ? 'bg-[#B8A7FF]/20 text-[#B8A7FF] border border-[#B8A7FF]/40 font-semibold'
                  : 'text-[#9D9BB6] hover:text-[#F5F3FF] border border-transparent'
              }`}
            >
              V1 Baseline
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {error && (
          <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/20 text-rose-300 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <div>
              <div className="font-semibold">Evaluation Data Unavailable</div>
              <div className="text-xs text-rose-300/80">{error}</div>
            </div>
          </div>
        )}

        {/* 2. Top-Level Metric Comparison Grid: WITH HINDY vs WITHOUT HINDY */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#9D9BB6] font-mono flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-[#C8FF35]" />
              Measured Benchmark Comparison ({selectedVersion.toUpperCase()})
            </h2>
            <div className="text-xs text-[#9D9BB6] font-mono">
              Sample Size: <span className="text-[#F5F3FF] font-bold">{memMetrics?.sample_size ?? 94} Alerts</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Attacks Detected */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-[#0F1122] to-[#090B16] border border-[#B8A7FF]/15 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono text-[#9D9BB6] uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Attacks Detected</span>
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-xs text-[#9D9BB6]/80 mb-3">
                  Critical threats successfully identified
                </div>
              </div>

              <div className="pt-3 border-t border-[#B8A7FF]/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#C8FF35] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF35]" />
                    With HINDY:
                  </span>
                  <span className="text-sm font-mono font-bold text-[#F5F3FF]">
                    {memMetrics?.attacks_caught ?? 10} / {memMetrics?.attacks_total ?? 10} ({memMetrics?.attacks_caught_pct ?? 100}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9D9BB6] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9D9BB6]" />
                    Without Memory:
                  </span>
                  <span className="text-sm font-mono text-[#9D9BB6]">
                    {noMemMetrics?.attacks_caught ?? 10} / {noMemMetrics?.attacks_total ?? 10} ({noMemMetrics?.attacks_caught_pct ?? 100}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: False Greens (Missed Threats) */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-[#0F1122] to-[#090B16] border border-[#B8A7FF]/15 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono text-[#9D9BB6] uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>False Greens</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xs text-[#9D9BB6]/80 mb-3">
                  Threats mistakenly closed as benign
                </div>
              </div>

              <div className="pt-3 border-t border-[#B8A7FF]/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#C8FF35] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF35]" />
                    With HINDY:
                  </span>
                  <span className="text-sm font-mono font-bold text-[#C8FF35]">
                    {memMetrics?.false_greens_count ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9D9BB6] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9D9BB6]" />
                    Without Memory:
                  </span>
                  <span className="text-sm font-mono text-rose-300">
                    {noMemMetrics?.false_greens_count ?? 23}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Unnecessary Benign Escalations */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-[#0F1122] to-[#090B16] border border-[#B8A7FF]/15 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono text-[#9D9BB6] uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Benign Escalations</span>
                  <Layers className="w-3.5 h-3.5 text-[#B8A7FF]" />
                </div>
                <div className="text-xs text-[#9D9BB6]/80 mb-3">
                  Routine benign alerts sent for review
                </div>
              </div>

              <div className="pt-3 border-t border-[#B8A7FF]/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#C8FF35] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF35]" />
                    With HINDY:
                  </span>
                  <span className="text-sm font-mono font-bold text-[#F5F3FF]">
                    {memMetrics?.unnecessary_escalations ?? 17} / {memMetrics?.recurring_benign_total ?? 40} ({memMetrics?.unnecessary_escalations_pct ?? 42.5}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9D9BB6] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9D9BB6]" />
                    Without Memory:
                  </span>
                  <span className="text-sm font-mono text-[#9D9BB6]">
                    {noMemMetrics?.unnecessary_escalations ?? 1} / {noMemMetrics?.recurring_benign_total ?? 40} ({noMemMetrics?.unnecessary_escalations_pct ?? 2.5}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Human-Review Load */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-[#0F1122] to-[#090B16] border border-[#B8A7FF]/15 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono text-[#9D9BB6] uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Human-Review Load</span>
                  <UserCheck className="w-3.5 h-3.5 text-[#C8FF35]" />
                </div>
                <div className="text-xs text-[#9D9BB6]/80 mb-3">
                  Total alerts flagged for analyst triage
                </div>
              </div>

              <div className="pt-3 border-t border-[#B8A7FF]/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#C8FF35] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF35]" />
                    With HINDY:
                  </span>
                  <span className="text-sm font-mono font-bold text-[#F5F3FF]">
                    {memMetrics?.human_review_count ?? 71} ({memMetrics?.human_review_load_pct ?? 75.5}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9D9BB6] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9D9BB6]" />
                    Without Memory:
                  </span>
                  <span className="text-sm font-mono text-[#9D9BB6]">
                    {noMemMetrics?.human_review_count ?? 32} ({noMemMetrics?.human_review_load_pct ?? 34.0}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Card 5: Average Investigation Time */}
            <div className="p-4 rounded-xl bg-gradient-to-b from-[#0F1122] to-[#090B16] border border-[#B8A7FF]/15 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono text-[#9D9BB6] uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Avg Investigation Time</span>
                  <Clock className="w-3.5 h-3.5 text-[#B8A7FF]" />
                </div>
                <div className="text-xs text-[#9D9BB6]/80 mb-3">
                  Retrieval + signal comparison latency
                </div>
              </div>

              <div className="pt-3 border-t border-[#B8A7FF]/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#C8FF35] font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF35]" />
                    With HINDY:
                  </span>
                  <span className="text-sm font-mono font-bold text-[#F5F3FF]">
                    {memMetrics?.average_time_seconds ? `${memMetrics.average_time_seconds.toFixed(2)}s` : '10.11s'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9D9BB6] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#9D9BB6]" />
                    Without Memory:
                  </span>
                  <span className="text-sm font-mono text-[#9D9BB6]">
                    {noMemMetrics?.average_time_seconds ? `${noMemMetrics.average_time_seconds.toFixed(2)}s` : '3.61s'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Security Outcomes & Memory Impact Explanation */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Security Outcomes Analysis */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#F5F3FF]">
              <ShieldCheck className="w-4 h-4 text-[#C8FF35]" />
              SECURITY OUTCOMES ANALYSIS
            </div>
            <p className="text-xs text-[#9D9BB6] leading-relaxed">
              Evaluating how persistent memory alters SOC decisions across attack lookalikes and routine operations.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
              <div className="p-3.5 rounded-xl bg-[#0F1122]/90 border border-[#B8A7FF]/10 space-y-1.5">
                <div className="text-xs font-semibold text-[#F5F3FF] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Lookalike Threat Prevention
                </div>
                <p className="text-[11.5px] text-[#9D9BB6] leading-relaxed">
                  Without memory, lookalike attacks that mimic benign maintenance (e.g. port scans on unauthorized subnets or off-hours PowerShell) caused <strong className="text-rose-300 font-mono">23 False Greens</strong>. With memory, HINDY verified exact signal differences and prevented false greens (0 recorded).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0F1122]/90 border border-[#B8A7FF]/10 space-y-1.5">
                <div className="text-xs font-semibold text-[#F5F3FF] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Safety-First Human Escalation
                </div>
                <p className="text-[11.5px] text-[#9D9BB6] leading-relaxed">
                  When contextual differences arise between a new alert and a past benign precedent, HINDY escalates to <strong className="text-amber-300 font-mono">YELLOW (Human Review)</strong> rather than auto-closing. This increases review load but guards against novel attack variations.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0F1122]/90 border border-[#B8A7FF]/10 space-y-1.5">
                <div className="text-xs font-semibold text-[#F5F3FF] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#B8A7FF]" />
                  Contextual Evidence Retrieval
                </div>
                <p className="text-[11.5px] text-[#9D9BB6] leading-relaxed">
                  Every alert in memory mode is cross-referenced with past verified resolutions, analyst notes, and ticket history, presenting the analyst with grounded precedent rather than isolated telemetry.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0F1122]/90 border border-[#B8A7FF]/10 space-y-1.5">
                <div className="text-xs font-semibold text-[#F5F3FF] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#C8FF35]" />
                  Execution Latency Tradeoff
                </div>
                <p className="text-[11.5px] text-[#9D9BB6] leading-relaxed">
                  Memory-driven analysis averages <strong className="text-[#F5F3FF] font-mono">10.11s</strong> vs <strong className="text-[#9D9BB6] font-mono">3.61s</strong> for single-pass reasoning, reflecting the additional semantic search, signal diffing, and rule validation steps.
                </p>
              </div>
            </div>
          </div>

          {/* Human-in-the-Loop Principle */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-[#121424] to-[#090B16] border border-[#C8FF35]/25 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#C8FF35]">
                <UserCheck className="w-4 h-4" />
                HUMAN DECISION REMAINS FINAL
              </div>
              <p className="text-xs text-[#F5F3FF]/90 leading-relaxed">
                HINDY is designed as an <strong>experience augmentation system</strong>, not an autonomous auto-closer.
              </p>
              <div className="p-3 rounded-xl bg-[#090B16]/80 border border-[#C8FF35]/20 text-[11.5px] text-[#9D9BB6] space-y-2">
                <div className="text-[#F5F3FF] font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C8FF35]" />
                  Analyst Responsibility
                </div>
                <p>
                  The SOC analyst evaluates HINDY's matched memories and retains absolute authority over the final security verdict. Additional review is a deliberate safety feature, not an operational failure.
                </p>
              </div>
            </div>

            <div className="text-[11px] font-mono text-[#9D9BB6] flex items-center gap-1.5 pt-2 border-t border-[#B8A7FF]/10">
              <Sparkles className="w-3.5 h-3.5 text-[#C8FF35]" />
              Persistent Memory · Grounded Context
            </div>
          </div>
        </section>

        {/* 4. Alert-by-Alert Comparison Table */}
        <section className="p-5 rounded-2xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#F5F3FF] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#C8FF35]" />
                ALERT-BY-ALERT COMPARISON
              </h2>
              <p className="text-xs text-[#9D9BB6] mt-0.5">
                Real evaluated alerts comparing recorded decisions With Memory vs Without Memory.
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#9D9BB6] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search alert, user, host..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[#0F1122] border border-[#B8A7FF]/20 rounded-xl text-xs text-[#F5F3FF] placeholder-[#9D9BB6]/50 focus:outline-none focus:border-[#C8FF35]/50 w-52"
                />
              </div>

              {/* Impact Filter Tabs */}
              <div className="flex items-center bg-[#0F1122] p-1 rounded-xl border border-[#B8A7FF]/20">
                <button
                  onClick={() => setImpactFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    impactFilter === 'all'
                      ? 'bg-[#C8FF35]/15 text-[#C8FF35] font-semibold'
                      : 'text-[#9D9BB6] hover:text-[#F5F3FF]'
                  }`}
                >
                  All ({alerts.length})
                </button>
                <button
                  onClick={() => setImpactFilter('changed')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    impactFilter === 'changed'
                      ? 'bg-[#C8FF35]/15 text-[#C8FF35] font-semibold'
                      : 'text-[#9D9BB6] hover:text-[#F5F3FF]'
                  }`}
                >
                  Changed ({alerts.filter((a) => a.impact_category === 'changed_decision').length})
                </button>
                <button
                  onClick={() => setImpactFilter('enriched')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    impactFilter === 'enriched'
                      ? 'bg-[#C8FF35]/15 text-[#C8FF35] font-semibold'
                      : 'text-[#9D9BB6] hover:text-[#F5F3FF]'
                  }`}
                >
                  Enriched ({alerts.filter((a) => a.impact_category === 'context_enriched').length})
                </button>
                <button
                  onClick={() => setImpactFilter('no_change')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    impactFilter === 'no_change'
                      ? 'bg-[#C8FF35]/15 text-[#C8FF35] font-semibold'
                      : 'text-[#9D9BB6] hover:text-[#F5F3FF]'
                  }`}
                >
                  No Diff ({alerts.filter((a) => a.impact_category === 'no_change').length})
                </button>
              </div>

              {/* Scenario Filter */}
              <select
                value={scenarioFilter}
                onChange={(e) => setScenarioFilter(e.target.value)}
                className="bg-[#0F1122] border border-[#B8A7FF]/20 rounded-xl text-xs text-[#9D9BB6] px-3 py-1.5 focus:outline-none focus:border-[#C8FF35]/50 font-mono"
              >
                <option value="all">All Scenarios</option>
                {uniqueScenarios.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-xl border border-[#B8A7FF]/15 overflow-hidden bg-[#070A10]">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0D0F1D] text-[#9D9BB6] font-mono text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-[#B8A7FF]/15">
                  <tr>
                    <th className="py-3 px-4">Alert ID & Title</th>
                    <th className="py-3 px-4">Category / Scenario</th>
                    <th className="py-3 px-4">Without Memory</th>
                    <th className="py-3 px-4">With HINDY Memory</th>
                    <th className="py-3 px-4">Recorded Impact</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B8A7FF]/10 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#9D9BB6] font-mono">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#C8FF35]" />
                        Loading evaluation records...
                      </td>
                    </tr>
                  ) : filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#9D9BB6]">
                        No evaluated alerts match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((item) => {
                      const isSelected = selectedAlert?.alert_id === item.alert_id;
                      const hasChanged = item.impact_category === 'changed_decision';

                      return (
                        <tr
                          key={item.alert_id}
                          onClick={() => setSelectedAlert(item)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#C8FF35]/10 border-l-2 border-[#C8FF35]'
                              : 'hover:bg-[#111322]'
                          }`}
                        >
                          {/* Alert ID & Title */}
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-[#F5F3FF] flex items-center gap-1.5">
                              {item.alert_id}
                              {hasChanged && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF35]" title="Outcome changed by memory" />
                              )}
                            </div>
                            <div className="text-[11px] text-[#9D9BB6] truncate max-w-[200px]" title={item.title}>
                              {item.title}
                            </div>
                          </td>

                          {/* Category / Scenario */}
                          <td className="py-3 px-4">
                            <div className="text-[#F5F3FF] font-medium">{item.category}</div>
                            <div className="text-[10.5px] font-mono text-[#9D9BB6]">
                              {item.scenario ? item.scenario.replace(/_/g, ' ') : 'General'}
                            </div>
                          </td>

                          {/* Without Memory */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {renderStatePill(item.without_memory.state)}
                              {item.without_memory.elapsed_seconds !== undefined && (
                                <div className="text-[10px] font-mono text-[#9D9BB6]/70">
                                  {item.without_memory.elapsed_seconds.toFixed(2)}s
                                </div>
                              )}
                            </div>
                          </td>

                          {/* With Memory */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {renderStatePill(item.with_memory.state)}
                              {item.with_memory.elapsed_seconds !== undefined && (
                                <div className="text-[10px] font-mono text-[#C8FF35]/80">
                                  {item.with_memory.elapsed_seconds.toFixed(2)}s
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Impact */}
                          <td className="py-3 px-4">
                            {hasChanged ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30">
                                <Sparkles className="w-3 h-3" />
                                {item.impact_label}
                              </span>
                            ) : item.impact_category === 'context_enriched' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-[#B8A7FF]/15 text-[#B8A7FF] border border-[#B8A7FF]/30">
                                <Database className="w-3 h-3" />
                                {item.impact_label}
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono text-[#9D9BB6]/70">
                                Identical classification
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAlert(item);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-mono text-[#C8FF35] hover:bg-[#C8FF35]/15 transition-all inline-flex items-center gap-1"
                            >
                              Inspect <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-[#090B16] border-t border-[#B8A7FF]/15 text-xs text-[#9D9BB6] flex items-center justify-between font-mono">
              <div>
                Showing {filteredAlerts.length} of {alerts.length} evaluated alerts
              </div>
              <div>Click any alert row to inspect full side-by-side comparison</div>
            </div>
          </div>
        </section>

        {/* 5. Alert Detail Modal / Slide-Over (When an alert is clicked) */}
        {selectedAlert && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-fadeIn">
            <div className="bg-[#090B16] border border-[#B8A7FF]/25 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-[#B8A7FF]/15 bg-[#0D0F1D] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30">
                      {selectedAlert.alert_id}
                    </span>
                    <span className="text-xs font-mono text-[#9D9BB6]">
                      {selectedAlert.category} · {selectedAlert.scenario}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#F5F3FF]">{selectedAlert.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="p-2 rounded-xl text-[#9D9BB6] hover:text-[#F5F3FF] hover:bg-[#151828] transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                {/* Available Context Summary */}
                <div className="p-3.5 rounded-xl bg-[#0F1122] border border-[#B8A7FF]/15 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-[#9D9BB6] uppercase block">Host</span>
                    <span className="font-mono text-[#F5F3FF]">{selectedAlert.host || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-[#9D9BB6] uppercase block">User</span>
                    <span className="font-mono text-[#F5F3FF]">{selectedAlert.user || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-[#9D9BB6] uppercase block">Severity</span>
                    <span className="font-mono text-[#F5F3FF]">{selectedAlert.severity || 'Medium'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-[#9D9BB6] uppercase block">Timestamp</span>
                    <span className="font-mono text-[#F5F3FF]">{selectedAlert.timestamp || 'N/A'}</span>
                  </div>
                </div>

                {/* Side-by-Side Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Left: Without HINDY */}
                  <div className="p-4 rounded-xl bg-[#070A10] border border-[#B8A7FF]/15 space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-[#B8A7FF]/10">
                      <div className="text-xs font-mono font-bold text-[#9D9BB6] flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5" />
                        WITHOUT HINDY (No Memory)
                      </div>
                      {selectedAlert.without_memory.elapsed_seconds !== undefined && (
                        <span className="text-[10px] font-mono text-[#9D9BB6]">
                          {selectedAlert.without_memory.elapsed_seconds.toFixed(2)}s
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-[#9D9BB6] uppercase block mb-1">State</span>
                      {renderStatePill(selectedAlert.without_memory.state)}
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-[#9D9BB6] uppercase block mb-1">Reasoning & Explanation</span>
                      <p className="text-[11.5px] text-[#9D9BB6] leading-relaxed bg-[#0F1122] p-3 rounded-lg border border-[#B8A7FF]/10">
                        {selectedAlert.without_memory.explanation ||
                          selectedAlert.without_memory.reasons?.join(' ') ||
                          'No specific reasoning recorded.'}
                      </p>
                    </div>

                    {selectedAlert.without_memory.recommended_action && (
                      <div>
                        <span className="text-[10px] font-mono text-[#9D9BB6] uppercase block mb-1">Recommended Action</span>
                        <div className="text-[11px] text-[#9D9BB6]/90 font-mono bg-[#0F1122] p-2.5 rounded-lg border border-[#B8A7FF]/10">
                          {selectedAlert.without_memory.recommended_action}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: With HINDY */}
                  <div className="p-4 rounded-xl bg-gradient-to-b from-[#0F1122] to-[#070A10] border border-[#C8FF35]/30 space-y-3.5 shadow-[0_0_15px_rgba(200,255,53,0.05)]">
                    <div className="flex items-center justify-between pb-2 border-b border-[#C8FF35]/20">
                      <div className="text-xs font-mono font-bold text-[#C8FF35] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        WITH HINDY (Memory Active)
                      </div>
                      {selectedAlert.with_memory.elapsed_seconds !== undefined && (
                        <span className="text-[10px] font-mono text-[#C8FF35]">
                          {selectedAlert.with_memory.elapsed_seconds.toFixed(2)}s
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-[#9D9BB6] uppercase block mb-1">State</span>
                      {renderStatePill(selectedAlert.with_memory.state)}
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-[#9D9BB6] uppercase block mb-1">Memory Impact & Precedent</span>
                      {selectedAlert.with_memory.recalled_cases && selectedAlert.with_memory.recalled_cases.length > 0 ? (
                        <div className="p-2.5 rounded-lg bg-[#090B16] border border-[#B8A7FF]/20 space-y-1.5">
                          <div className="text-[11px] font-semibold text-[#F5F3FF] flex items-center justify-between">
                            <span>Recalled: {selectedAlert.with_memory.recalled_cases[0].alert_id}</span>
                            <span className="text-[10px] font-mono text-[#C8FF35]">
                              {selectedAlert.with_memory.recalled_cases[0].verdict}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-[#9D9BB6] italic">
                            "{selectedAlert.with_memory.recalled_cases[0].investigation_note}"
                          </p>
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#9D9BB6] italic p-2 rounded bg-[#090B16]">
                          No historical precedent recalled for this alert pattern.
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-[#9D9BB6] uppercase block mb-1">Reasoning & Explanation</span>
                      <p className="text-[11.5px] text-[#F5F3FF]/90 leading-relaxed bg-[#090B16] p-3 rounded-lg border border-[#C8FF35]/20">
                        {selectedAlert.with_memory.explanation ||
                          selectedAlert.with_memory.reasons?.join(' ') ||
                          'No specific reasoning recorded.'}
                      </p>
                    </div>

                    {selectedAlert.with_memory.recommended_action && (
                      <div>
                        <span className="text-[10px] font-mono text-[#9D9BB6] uppercase block mb-1">Recommended Action</span>
                        <div className="text-[11px] text-[#C8FF35] font-mono bg-[#090B16] p-2.5 rounded-lg border border-[#C8FF35]/20">
                          {selectedAlert.with_memory.recommended_action}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* What Changed Summary */}
                <div className="p-4 rounded-xl bg-[#121424]/80 border border-[#B8A7FF]/20 space-y-1.5">
                  <div className="text-xs font-mono font-bold text-[#F5F3FF] flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#C8FF35]" />
                    WHAT CHANGED?
                  </div>
                  <p className="text-xs text-[#9D9BB6] leading-relaxed">
                    {selectedAlert.with_memory.state !== selectedAlert.without_memory.state
                      ? `Memory altered the recorded decision from ${selectedAlert.without_memory.state?.toUpperCase()} to ${selectedAlert.with_memory.state?.toUpperCase()}. Retained experience provided comparative baseline signals that prevented an isolated misclassification.`
                      : selectedAlert.with_memory.recalled_cases?.length
                      ? `Both modes arrived at ${selectedAlert.with_memory.state?.toUpperCase()}. Memory mode corroborated the decision with historical context and analyst notes.`
                      : `No decision difference was recorded between modes for this alert.`}
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[#B8A7FF]/15 bg-[#0D0F1D] flex justify-end">
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-[#1F2338] text-[#F5F3FF] hover:bg-[#282D48] transition-all"
                >
                  Close Detail
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. The HINDY Learning Loop Diagram */}
        <section className="p-6 rounded-2xl bg-gradient-to-b from-[#090B16] to-[#04060C] border border-[#B8A7FF]/15 space-y-5">
          <div className="text-center space-y-1 max-w-2xl mx-auto">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#C8FF35]">
              System Architecture
            </div>
            <h2 className="text-base font-bold text-[#F5F3FF]">THE HINDY LEARNING LOOP</h2>
            <p className="text-xs text-[#9D9BB6]">
              How human analyst determinations feed back into persistent memory to guide future security investigations.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-7 gap-2.5 items-center pt-3 text-center">
            {/* Step 1 */}
            <div className="p-3 rounded-xl bg-[#0F1122] border border-[#B8A7FF]/20 flex flex-col items-center">
              <History className="w-5 h-5 text-[#B8A7FF] mb-1.5" />
              <div className="text-xs font-bold text-[#F5F3FF]">Past Case</div>
              <div className="text-[10px] text-[#9D9BB6] mt-0.5">Historical incident</div>
            </div>

            <div className="hidden md:flex justify-center text-[#B8A7FF]/40 font-bold">→</div>

            {/* Step 2 */}
            <div className="p-3 rounded-xl bg-[#0F1122] border border-[#C8FF35]/30 flex flex-col items-center shadow-[0_0_10px_rgba(200,255,53,0.1)]">
              <Database className="w-5 h-5 text-[#C8FF35] mb-1.5" />
              <div className="text-xs font-bold text-[#F5F3FF]">Memory Bank</div>
              <div className="text-[10px] text-[#9D9BB6] mt-0.5">Retained experience</div>
            </div>

            <div className="hidden md:flex justify-center text-[#B8A7FF]/40 font-bold">→</div>

            {/* Step 3 */}
            <div className="p-3 rounded-xl bg-[#0F1122] border border-[#B8A7FF]/20 flex flex-col items-center">
              <ShieldAlert className="w-5 h-5 text-amber-400 mb-1.5" />
              <div className="text-xs font-bold text-[#F5F3FF]">New Alert</div>
              <div className="text-[10px] text-[#9D9BB6] mt-0.5">Incoming telemetry</div>
            </div>

            <div className="hidden md:flex justify-center text-[#B8A7FF]/40 font-bold">→</div>

            {/* Step 4 */}
            <div className="p-3 rounded-xl bg-[#0F1122] border border-[#C8FF35]/30 flex flex-col items-center shadow-[0_0_10px_rgba(200,255,53,0.1)]">
              <Sparkles className="w-5 h-5 text-[#C8FF35] mb-1.5" />
              <div className="text-xs font-bold text-[#F5F3FF]">Signal Diff</div>
              <div className="text-[10px] text-[#9D9BB6] mt-0.5">Context comparison</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 items-center pt-1 text-center max-w-3xl mx-auto">
            {/* Step 5 */}
            <div className="p-3 rounded-xl bg-[#0F1122] border border-[#B8A7FF]/20 flex flex-col items-center">
              <Cpu className="w-5 h-5 text-[#B8A7FF] mb-1.5" />
              <div className="text-xs font-bold text-[#F5F3FF]">Reasoning</div>
              <div className="text-[10px] text-[#9D9BB6] mt-0.5">HINDY Assessment</div>
            </div>

            <div className="hidden md:flex justify-center text-[#B8A7FF]/40 font-bold">→</div>

            {/* Step 6 */}
            <div className="p-3 rounded-xl bg-gradient-to-b from-[#121424] to-[#090B16] border border-[#C8FF35]/40 flex flex-col items-center shadow-[0_0_12px_rgba(200,255,53,0.15)]">
              <UserCheck className="w-5 h-5 text-[#C8FF35] mb-1.5" />
              <div className="text-xs font-bold text-[#F5F3FF]">Human Decision</div>
              <div className="text-[10px] text-[#C8FF35] mt-0.5">Analyst signs off</div>
            </div>

            <div className="hidden md:flex justify-center text-[#B8A7FF]/40 font-bold">→</div>

            {/* Step 7 */}
            <div className="p-3 rounded-xl bg-[#0F1122] border border-[#B8A7FF]/20 flex flex-col items-center">
              <RefreshCw className="w-5 h-5 text-emerald-400 mb-1.5" />
              <div className="text-xs font-bold text-[#F5F3FF]">Memory Ingest</div>
              <div className="text-[10px] text-[#9D9BB6] mt-0.5">Learned pattern ↺</div>
            </div>
          </div>
        </section>

        {/* 7. Methodology & Limitations */}
        <section className="p-5 rounded-2xl bg-[#090B16] border border-amber-500/20 bg-amber-950/10 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300 font-mono">
            <Info className="w-4 h-4 text-amber-400" />
            Evaluation Methodology & Limitations
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#9D9BB6] leading-relaxed">
            <li>
              <strong>Sample Definition:</strong> Evaluated on 94 simulated replay alerts (10 attack variants, 44 lookalike variants, 40 recurring benign variants) sampled with deterministic seed 42.
            </li>
            <li>
              <strong>Methodology Limitation:</strong> V2 rules were designed after analyzing V1 failures on the same sample. This comparison is not a fully held-out test dataset.
            </li>
            <li>
              <strong>Operational Environment:</strong> In no-memory mode, some alerts were evaluated using fallback models when external provider rate limits were reached.
            </li>
            <li>
              <strong>Workload Context:</strong> The benchmark sample intentionally contains a high proportion (57%) of dangerous lookalikes and attacks to test boundary condition detection.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};
