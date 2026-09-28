import React, { useEffect, useMemo, useState } from 'react';
import { 
  RotateCcw, 
  Play, 
  Pause, 
  ArrowLeft, 
  ShieldCheck, 
  ShieldAlert, 
  Database, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  Server, 
  User as UserIcon, 
  Clock, 
  Tag, 
  Search, 
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';
import type { ReplayCache, ReplayEntry } from '../types';

interface ReplayViewProps {
  onOpenAlert?: (entry: ReplayEntry) => void;
  onNavigateToMemory?: (memoryId?: string) => void;
}

const API_BASE = '';

const REPLAY_STEPS = [
  { id: 1, title: 'Alert Observed', icon: ShieldAlert, short: 'Alert' },
  { id: 2, title: 'Memory Recalled', icon: Database, short: 'Memory Recall' },
  { id: 3, title: 'Context Compared', icon: Layers, short: 'Context Comparison' },
  { id: 4, title: 'Hindy Reasoning', icon: Sparkles, short: 'Reasoning' },
  { id: 5, title: 'Analyst Decision', icon: ShieldCheck, short: 'Decision' },
  { id: 6, title: 'Retained Learning', icon: CheckCircle2, short: 'Learning Retained' },
];

export const ReplayView: React.FC<ReplayViewProps> = ({ onNavigateToMemory }) => {
  const [cache, setCache] = useState<ReplayCache | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selection & Search/Filter state
  const [selectedEntry, setSelectedEntry] = useState<ReplayEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [stateFilter, setStateFilter] = useState<'all' | 'green' | 'yellow' | 'red'>('all');

  // Interactive step stepper for selected replay
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [showAllSteps, setShowAllSteps] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/replay-cache`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || 'Replay cache unavailable.');
        }
        return res.json();
      })
      .then((data: ReplayCache) => {
        setCache(data);
        setLoading(false);
      })
      .catch((fetchError: Error) => {
        setError(fetchError.message);
        setLoading(false);
      });
  }, []);

  // Auto-step timer for playback
  useEffect(() => {
    if (!isAutoPlaying || !selectedEntry) return;

    const timer = setTimeout(() => {
      setCurrentStep((prev) => {
        if (prev >= REPLAY_STEPS.length) {
          setIsAutoPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2500 / playbackSpeed);

    return () => clearTimeout(timer);
  }, [isAutoPlaying, currentStep, selectedEntry, playbackSpeed]);

  const entries = useMemo(() => cache?.entries || [], [cache]);

  // Dynamic metrics derived from real loaded replay entries
  const metrics = useMemo(() => {
    const total = entries.length;
    const recalled = entries.filter((e) => e.recalled_case_ids && e.recalled_case_ids.length > 0).length;
    const green = entries.filter((e) => e.state === 'green').length;
    const yellow = entries.filter((e) => e.state === 'yellow').length;
    const red = entries.filter((e) => e.state === 'red').length;
    return { total, recalled, green, yellow, red };
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (stateFilter !== 'all' && entry.state !== stateFilter) return false;
      if (severityFilter !== 'all' && entry.severity?.toLowerCase() !== severityFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        entry.alert_id?.toLowerCase().includes(q) ||
        entry.title?.toLowerCase().includes(q) ||
        entry.host?.toLowerCase().includes(q) ||
        entry.user?.toLowerCase().includes(q) ||
        entry.best_match_id?.toLowerCase().includes(q)
      );
    });
  }, [entries, stateFilter, severityFilter, searchQuery]);

  const handleSelectEntry = (entry: ReplayEntry) => {
    setSelectedEntry(entry);
    setCurrentStep(1);
    setIsAutoPlaying(false);
    setShowAllSteps(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartReplayFlow = (entry: ReplayEntry) => {
    setSelectedEntry(entry);
    setCurrentStep(1);
    setShowAllSteps(false);
    setIsAutoPlaying(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="h-full w-full bg-[#070A10] text-[#F5F3FF] flex flex-col items-center justify-center space-y-3 select-none">
        <RotateCcw className="w-8 h-8 text-[#C8FF35] animate-spin" />
        <div className="text-sm font-mono text-[#9D9BB6]">Loading recorded investigations...</div>
      </div>
    );
  }

  if (error || !cache || entries.length === 0) {
    return (
      <div className="h-full w-full bg-[#070A10] text-[#F5F3FF] p-8 flex flex-col items-center justify-center text-center space-y-4 select-none">
        <div className="w-14 h-14 rounded-2xl bg-[#090B16] border border-rose-500/30 flex items-center justify-center shadow-lg">
          <ShieldAlert className="w-7 h-7 text-rose-400" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-[#F5F3FF]">No recorded investigations available for replay.</h2>
          <p className="text-xs text-[#9D9BB6] font-mono max-w-md">
            {error || 'The replay cache has not been initialized. Run the evaluation or cache builder script.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[#070A10] text-[#F5F3FF] overflow-y-auto select-none font-sans">
      {/* Ambient background glow */}
      <div className="fixed top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[#C8FF35]/3 blur-[160px] pointer-events-none z-0" />
      <div className="fixed bottom-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#B8A7FF]/4 blur-[160px] pointer-events-none z-0" />

      <div className="relative z-10 p-5 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* ========================================================= */}
        {/* 1. REPLAY PAGE HEADER */}
        {/* ========================================================= */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#B8A7FF]/15">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider bg-[#C8FF35]/15 text-[#C8FF35] px-2.5 py-0.5 rounded-full border border-[#C8FF35]/30">
                SOC REPLAY WORKSPACE
              </span>
              <span className="text-xs font-mono text-[#9D9BB6]">•</span>
              <span className="text-xs font-mono text-[#9D9BB6]">{cache.recorded_count} of {cache.total_replay_alerts} Recorded Alerts</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#F5F3FF]">
              REPLAY
            </h1>
            <p className="text-sm font-medium text-[#C8FF35]">
              Revisit how HINDY investigated previous security alerts.
            </p>
            <p className="text-xs text-[#9D9BB6] leading-relaxed max-w-2xl">
              Replay recorded investigations to see what HINDY remembered, how context was compared, and what the analyst decided.
            </p>
          </div>

          {selectedEntry && (
            <button
              onClick={() => {
                setSelectedEntry(null);
                setIsAutoPlaying(false);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111321] hover:bg-[#181B2E] border border-[#B8A7FF]/20 text-xs font-mono text-[#B8A7FF] hover:text-[#C8FF35] transition-all cursor-pointer shadow-sm self-start md:self-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Investigation List</span>
            </button>
          )}
        </header>

        {/* ========================================================= */}
        {/* 2. SUMMARY METRICS BAR */}
        {/* ========================================================= */}
        {!selectedEntry && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-[#111321]/80 border border-[#B8A7FF]/15 backdrop-blur-sm space-y-1">
              <div className="text-[10px] font-mono text-[#9D9BB6] uppercase">Recorded Alerts</div>
              <div className="text-2xl font-mono font-bold text-[#F5F3FF]">{metrics.total}</div>
              <div className="text-[11px] text-[#9D9BB6] font-mono">Full replay traces</div>
            </div>

            <div className="p-4 rounded-xl bg-[#111321]/80 border border-[#B8A7FF]/15 backdrop-blur-sm space-y-1">
              <div className="text-[10px] font-mono text-[#9D9BB6] uppercase">Memory Recalled</div>
              <div className="text-2xl font-mono font-bold text-[#C8FF35]">{metrics.recalled}</div>
              <div className="text-[11px] text-[#9D9BB6] font-mono">Precedent assisted</div>
            </div>

            <div className="p-4 rounded-xl bg-[#111321]/80 border border-emerald-500/20 backdrop-blur-sm space-y-1">
              <div className="text-[10px] font-mono text-emerald-400/80 uppercase">Low Risk (Green)</div>
              <div className="text-2xl font-mono font-bold text-emerald-400">{metrics.green}</div>
              <div className="text-[11px] text-emerald-300/70 font-mono">Quick-confirm</div>
            </div>

            <div className="p-4 rounded-xl bg-[#111321]/80 border border-amber-500/20 backdrop-blur-sm space-y-1">
              <div className="text-[10px] font-mono text-amber-400/80 uppercase">Review (Yellow)</div>
              <div className="text-2xl font-mono font-bold text-amber-400">{metrics.yellow}</div>
              <div className="text-[11px] text-amber-300/70 font-mono">Analyst review</div>
            </div>

            <div className="p-4 rounded-xl bg-[#111321]/80 border border-rose-500/20 backdrop-blur-sm space-y-1 col-span-2 sm:col-span-1">
              <div className="text-[10px] font-mono text-rose-400/80 uppercase">High Risk (Red)</div>
              <div className="text-2xl font-mono font-bold text-rose-400">{metrics.red}</div>
              <div className="text-[11px] text-rose-300/70 font-mono">Escalated to Tier 2</div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. HISTORICAL INVESTIGATION LIST (WHEN NO ALERT SELECTED) */}
        {/* ========================================================= */}
        {!selectedEntry ? (
          <div className="space-y-4">
            {/* Search & Filter Toolbar */}
            <div className="p-4 rounded-2xl bg-[#111321]/90 border border-[#B8A7FF]/20 shadow-lg flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#9D9BB6] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Alert ID (e.g. ALRT-00515), title, host, user, or precedent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#090B16] border border-[#B8A7FF]/20 text-xs font-mono text-[#F5F3FF] placeholder-[#9D9BB6]/50 focus:outline-none focus:border-[#C8FF35]/50 transition-colors"
                />
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Severity Filter */}
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-[#090B16] border border-[#B8A7FF]/20 text-xs font-mono text-[#F5F3FF] focus:outline-none focus:border-[#C8FF35]/50 cursor-pointer"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* State Filter */}
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-[#090B16] border border-[#B8A7FF]/20 text-xs font-mono text-[#F5F3FF] focus:outline-none focus:border-[#C8FF35]/50 cursor-pointer"
                >
                  <option value="all">All Hindy States</option>
                  <option value="green">Low Risk (Green)</option>
                  <option value="yellow">Review (Yellow)</option>
                  <option value="red">High Risk (Red)</option>
                </select>
              </div>
            </div>

            {/* List Table / Card Grid */}
            <div className="rounded-2xl bg-[#111321]/90 border border-[#B8A7FF]/20 overflow-hidden shadow-xl">
              <div className="px-5 py-3.5 bg-[#090B16] border-b border-[#B8A7FF]/15 flex items-center justify-between">
                <span className="text-xs font-mono text-[#9D9BB6] uppercase tracking-wider font-semibold">
                  {filteredEntries.length} Recorded Investigations • Click to Replay
                </span>
                <span className="text-[11px] font-mono text-[#C8FF35]">
                  Real Historical Traces
                </span>
              </div>

              <div className="divide-y divide-[#B8A7FF]/10">
                {filteredEntries.map((entry) => {
                  const isGreen = entry.state === 'green';
                  const isYellow = entry.state === 'yellow';
                  const isRed = entry.state === 'red';

                  const bestMatch = entry.analysis?.best_match;
                  const matchesCount = entry.matches_count || bestMatch?.matches?.length || 0;
                  const totalSignals = matchesCount + (entry.differences_count || bestMatch?.differences?.length || 0);

                  return (
                    <div
                      key={entry.alert_id}
                      className="p-4 md:p-5 hover:bg-[#181B2E]/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group cursor-pointer"
                      onClick={() => handleSelectEntry(entry)}
                    >
                      {/* Left: ID & Title & Telemetry */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Alert ID */}
                          <span className="text-xs font-mono font-bold text-[#C8FF35] bg-[#090B16] px-2.5 py-0.5 rounded border border-[#C8FF35]/30">
                            {entry.alert_id}
                          </span>

                          {/* Severity */}
                          {entry.severity && (
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                                entry.severity.toLowerCase() === 'critical'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : entry.severity.toLowerCase() === 'high'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-[#B8A7FF]/15 text-[#B8A7FF] border border-[#B8A7FF]/20'
                              }`}
                            >
                              {entry.severity}
                            </span>
                          )}

                          {/* Category */}
                          {entry.category && (
                            <span className="text-[11px] font-mono text-[#9D9BB6] bg-[#090B16] px-2 py-0.5 rounded border border-[#B8A7FF]/10 flex items-center gap-1">
                              <Tag className="w-3 h-3 text-[#B8A7FF]" />
                              {entry.category}
                            </span>
                          )}

                          {/* Timestamp */}
                          <span className="text-[11px] font-mono text-[#9D9BB6] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>

                        {/* Title */}
                        <div className="text-sm md:text-base font-bold text-[#F5F3FF] group-hover:text-[#C8FF35] transition-colors truncate">
                          {entry.title}
                        </div>

                        {/* Entity Telemetry & Precedent summary */}
                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#9D9BB6]">
                          {entry.host && (
                            <span className="flex items-center gap-1">
                              <Server className="w-3.5 h-3.5 text-[#C8FF35]" />
                              Host: <span className="text-slate-300 font-semibold">{entry.host}</span>
                            </span>
                          )}
                          {entry.user && (
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3.5 h-3.5 text-[#B8A7FF]" />
                              User: <span className="text-slate-300 font-semibold">{entry.user}</span>
                            </span>
                          )}
                          {entry.recalled_case_ids && entry.recalled_case_ids.length > 0 ? (
                            <span className="flex items-center gap-1 text-[#B8A7FF]">
                              <Database className="w-3.5 h-3.5" />
                              {entry.recalled_case_ids.length} memories recalled
                              {totalSignals > 0 && ` (${matchesCount}/${totalSignals} signals match)`}
                            </span>
                          ) : (
                            <span className="text-slate-500">No memory recalled</span>
                          )}
                        </div>
                      </div>

                      {/* Right: Hindy Result Badge & Action Button */}
                      <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                        <span
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                            isRed
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                              : isYellow
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                              : isGreen
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {isRed ? (
                            <>
                              <Flame className="w-3.5 h-3.5 text-rose-400" />
                              High Risk (Red)
                            </>
                          ) : isYellow ? (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              Review (Yellow)
                            </>
                          ) : isGreen ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Low Risk (Green)
                            </>
                          ) : (
                            entry.state
                          )}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartReplayFlow(entry);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#C8FF35] hover:bg-[#d6ff52] text-[#090B16] font-bold text-xs font-mono shadow-[0_0_15px_rgba(200,255,53,0.25)] transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Replay</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredEntries.length === 0 && (
                  <div className="p-12 text-center space-y-2">
                    <Search className="w-8 h-8 text-[#9D9BB6] mx-auto opacity-50" />
                    <div className="text-sm font-bold text-[#F5F3FF]">No recorded investigations match your filter query.</div>
                    <div className="text-xs font-mono text-[#9D9BB6]">Try adjusting your search terms or severity/state filters.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* 4. SELECTED INVESTIGATION REPLAY WORKSPACE */
          /* ========================================================= */
          <div className="space-y-6">
            {/* Top Workspace Header Bar */}
            <div className="p-5 lg:p-6 rounded-2xl bg-[#111321]/95 border border-[#B8A7FF]/20 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-[#C8FF35] bg-[#090B16] px-2.5 py-0.5 rounded border border-[#C8FF35]/30">
                    {selectedEntry.alert_id}
                  </span>
                  {selectedEntry.severity && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                      SEVERITY: {selectedEntry.severity}
                    </span>
                  )}
                  {selectedEntry.category && (
                    <span className="text-[11px] font-mono text-[#9D9BB6] bg-[#090B16] px-2 py-0.5 rounded border border-[#B8A7FF]/15 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[#B8A7FF]" />
                      {selectedEntry.category}
                    </span>
                  )}
                  <span className="text-xs font-mono text-[#9D9BB6] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(selectedEntry.timestamp).toLocaleString()}
                  </span>
                </div>

                <h2 className="text-lg lg:text-xl font-bold tracking-tight text-[#F5F3FF]">
                  {selectedEntry.title}
                </h2>
              </div>

              {/* Playback Controls Toolbar */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto bg-[#090B16] p-1.5 rounded-xl border border-[#B8A7FF]/20">
                <button
                  onClick={() => setIsAutoPlaying((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isAutoPlaying
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-[#C8FF35] text-[#090B16] hover:bg-[#d6ff52] shadow-[0_0_12px_rgba(200,255,53,0.25)]'
                  }`}
                >
                  {isAutoPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isAutoPlaying ? 'PAUSE FLOW' : 'AUTO-STEP'}</span>
                </button>

                <button
                  onClick={() => {
                    setIsAutoPlaying(false);
                    setCurrentStep(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-[#9D9BB6] hover:text-[#F5F3FF] hover:bg-[#111321] transition-all cursor-pointer flex items-center gap-1"
                  title="Reset to beginning"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>

                <div className="h-4 w-px bg-[#B8A7FF]/20 mx-1" />

                <button
                  onClick={() => setShowAllSteps((prev) => !prev)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    showAllSteps
                      ? 'bg-[#B8A7FF]/20 text-[#B8A7FF] font-semibold border border-[#B8A7FF]/30'
                      : 'text-[#9D9BB6] hover:text-[#F5F3FF]'
                  }`}
                >
                  {showAllSteps ? 'Showing Full Trace' : 'Step Mode'}
                </button>

                <div className="flex items-center gap-1 ml-1">
                  {[1, 2].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                        playbackSpeed === spd
                          ? 'bg-[#C8FF35]/20 text-[#C8FF35] border-[#C8FF35]/40'
                          : 'bg-[#090B16] text-[#9D9BB6] border-transparent hover:text-[#F5F3FF]'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Stepper Timeline Navigation */}
            <div className="p-4 rounded-2xl bg-[#090B16] border border-[#B8A7FF]/20 shadow-md overflow-x-auto">
              <div className="flex items-center justify-between min-w-[650px] gap-2">
                {REPLAY_STEPS.map((step) => {
                  const StepIcon = step.icon;
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;

                  return (
                    <button
                      key={step.id}
                      onClick={() => {
                        setCurrentStep(step.id);
                        setIsAutoPlaying(false);
                      }}
                      className={`flex-1 flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-[#C8FF35]/15 border-[#C8FF35]/40 text-[#C8FF35] shadow-[0_0_15px_rgba(200,255,53,0.15)]'
                          : isCompleted
                          ? 'bg-[#111321] border-[#B8A7FF]/20 text-[#F5F3FF]'
                          : 'bg-[#090B16] border-transparent text-[#9D9BB6]/60 hover:text-[#9D9BB6]'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono font-bold ${
                          isActive
                            ? 'bg-[#C8FF35] text-[#090B16]'
                            : isCompleted
                            ? 'bg-[#B8A7FF]/20 text-[#B8A7FF]'
                            : 'bg-[#111321] text-[#9D9BB6]'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <StepIcon className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono uppercase tracking-wider opacity-70">
                          Step {step.id}
                        </div>
                        <div className="text-xs font-bold truncate">
                          {step.short}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ========================================================= */}
            {/* WORKSPACE SECTIONS */}
            {/* ========================================================= */}
            <div className="space-y-6">

              {/* --------------------------------------------------------- */}
              {/* SECTION 1: ORIGINAL ALERT */}
              {/* --------------------------------------------------------- */}
              {(showAllSteps || currentStep >= 1) && (
                <section className="p-5 lg:p-6 rounded-2xl bg-[#111321]/95 border border-[#B8A7FF]/20 shadow-xl backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#B8A7FF]/15">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#090B16] border border-[#B8A7FF]/30 flex items-center justify-center">
                        <ShieldAlert className="w-4 h-4 text-[#C8FF35]" />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-[#9D9BB6] uppercase">STEP 1 • TELEMETRY</div>
                        <h3 className="text-base font-bold text-[#F5F3FF]">Original Alert Telemetry</h3>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#C8FF35] bg-[#090B16] px-2.5 py-1 rounded border border-[#C8FF35]/30">
                      {selectedEntry.alert_id}
                    </span>
                  </div>

                  {/* Core Telemetry Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15">
                      <div className="text-[10px] font-mono text-[#9D9BB6] uppercase">Host System</div>
                      <div className="text-xs font-mono font-bold text-[#F5F3FF] mt-1 flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-[#C8FF35]" />
                        <span>{selectedEntry.host || selectedEntry.analysis?.best_match?.host || 'Not available in recorded investigation'}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15">
                      <div className="text-[10px] font-mono text-[#9D9BB6] uppercase">Target User</div>
                      <div className="text-xs font-mono font-bold text-[#F5F3FF] mt-1 flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-[#B8A7FF]" />
                        <span>{selectedEntry.user || selectedEntry.analysis?.best_match?.user || 'Not available in recorded investigation'}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15">
                      <div className="text-[10px] font-mono text-[#9D9BB6] uppercase">Observed Severity</div>
                      <div className="text-xs font-mono font-bold text-amber-300 mt-1 uppercase">
                        {selectedEntry.severity || selectedEntry.analysis?.best_match?.severity || 'Medium'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15">
                      <div className="text-[10px] font-mono text-[#9D9BB6] uppercase">MITRE Technique</div>
                      <div className="text-xs font-mono font-bold text-purple-300 mt-1">
                        {selectedEntry.mitre_technique || selectedEntry.analysis?.best_match?.mitre_technique || 'T1048 / T1078'}
                      </div>
                    </div>
                  </div>

                  {/* Context & Details Payload if available */}
                  {(selectedEntry.details || selectedEntry.context) && (
                    <div className="p-4 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-2">
                      <div className="text-[11px] font-mono text-[#9D9BB6] uppercase tracking-wider font-semibold">
                        Recorded Investigation Context Attributes
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
                        {Object.entries({ ...(selectedEntry.details || {}), ...(selectedEntry.context || {}) }).map(([k, v]) => (
                          <div key={k} className="p-2 rounded-lg bg-[#111321] border border-[#B8A7FF]/10 flex items-center justify-between gap-2">
                            <span className="text-[#9D9BB6] truncate">{k}:</span>
                            <span className="text-[#F5F3FF] font-semibold truncate">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* --------------------------------------------------------- */}
              {/* SECTION 2: HINDY MEMORY RECALL */}
              {/* --------------------------------------------------------- */}
              {(showAllSteps || currentStep >= 2) && (
                <section className="p-5 lg:p-6 rounded-2xl bg-[#111321]/95 border border-[#B8A7FF]/20 shadow-xl backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#B8A7FF]/15">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#090B16] border border-[#B8A7FF]/30 flex items-center justify-center">
                        <Database className="w-4 h-4 text-[#C8FF35]" />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-[#9D9BB6] uppercase">STEP 2 • MEMORY RECALL</div>
                        <h3 className="text-base font-bold text-[#F5F3FF]">Hindy Memory Recall</h3>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#B8A7FF] bg-[#090B16] px-2.5 py-1 rounded border border-[#B8A7FF]/20">
                      {selectedEntry.recalled_case_ids?.length || 0} Retained Precedents Found
                    </span>
                  </div>

                  {selectedEntry.analysis?.best_match ? (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-[#090B16] to-[#121424] border border-[#C8FF35]/30 shadow-md space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider bg-[#C8FF35]/15 text-[#C8FF35] px-2 py-0.5 rounded border border-[#C8FF35]/30 font-bold">
                              PRIMARY HISTORICAL PRECEDENT
                            </span>
                            <span className="text-xs font-mono font-bold text-[#F5F3FF]">
                              {selectedEntry.analysis.best_match.alert_id}
                            </span>
                          </div>

                          {onNavigateToMemory && (
                            <button
                              onClick={() => onNavigateToMemory(selectedEntry.analysis?.best_match?.alert_id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#C8FF35]/10 hover:bg-[#C8FF35]/20 text-[#C8FF35] border border-[#C8FF35]/30 text-xs font-mono transition-all cursor-pointer"
                            >
                              <Database className="w-3.5 h-3.5" />
                              <span>View Memory</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Title & Notes */}
                        <div>
                          <h4 className="text-sm font-bold text-[#F5F3FF]">
                            {selectedEntry.analysis.best_match.title}
                          </h4>
                          {selectedEntry.analysis.best_match.investigation_note && (
                            <p className="text-xs text-[#9D9BB6] mt-1 italic font-mono bg-[#090B16]/80 p-2.5 rounded-lg border border-[#B8A7FF]/10">
                              "{selectedEntry.analysis.best_match.investigation_note}"
                            </p>
                          )}
                        </div>

                        {/* Precedent Metadata Chips */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                          <div className="p-2 rounded-lg bg-[#090B16] border border-[#B8A7FF]/10">
                            <div className="text-[10px] text-[#9D9BB6] uppercase">Original Analyst</div>
                            <div className="text-slate-200 font-bold mt-0.5 truncate">
                              {selectedEntry.analysis.best_match.analyst || 'SOC Analyst'}
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-[#090B16] border border-[#B8A7FF]/10">
                            <div className="text-[10px] text-[#9D9BB6] uppercase">Past Verdict</div>
                            <div className="text-emerald-400 font-bold mt-0.5 truncate">
                              {selectedEntry.analysis.best_match.verdict}
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-[#090B16] border border-[#B8A7FF]/10">
                            <div className="text-[10px] text-[#9D9BB6] uppercase">Past Host</div>
                            <div className="text-slate-200 font-bold mt-0.5 truncate">
                              {selectedEntry.analysis.best_match.host}
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-[#090B16] border border-[#B8A7FF]/10">
                            <div className="text-[10px] text-[#9D9BB6] uppercase">Past User</div>
                            <div className="text-slate-200 font-bold mt-0.5 truncate">
                              {selectedEntry.analysis.best_match.user}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Other recalled IDs */}
                      {selectedEntry.recalled_case_ids && selectedEntry.recalled_case_ids.length > 1 && (
                        <div className="text-xs font-mono text-[#9D9BB6] flex items-center gap-2 flex-wrap">
                          <span>Additional recalled cases in memory cluster:</span>
                          {selectedEntry.recalled_case_ids.slice(1, 8).map((cid) => (
                            <span key={cid} className="px-2 py-0.5 rounded bg-[#090B16] border border-[#B8A7FF]/15 text-slate-300">
                              {cid}
                            </span>
                          ))}
                          {selectedEntry.recalled_case_ids.length > 8 && (
                            <span className="text-slate-500">+{selectedEntry.recalled_case_ids.length - 8} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 text-center space-y-1">
                      <div className="text-xs font-mono text-[#9D9BB6]">
                        No relevant memory recalled for this pattern.
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        Alert treated as novel activity requiring standard tier-1 triage baseline.
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* --------------------------------------------------------- */}
              {/* SECTION 3: CONTEXT COMPARISON (MEMORY FOUND ≠ APPLIES) */}
              {/* --------------------------------------------------------- */}
              {(showAllSteps || currentStep >= 3) && (
                <section className="p-5 lg:p-6 rounded-2xl bg-[#111321]/95 border border-[#B8A7FF]/20 shadow-xl backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#B8A7FF]/15">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#090B16] border border-[#B8A7FF]/30 flex items-center justify-center">
                        <Layers className="w-4 h-4 text-[#C8FF35]" />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-[#9D9BB6] uppercase">STEP 3 • DIFFERENTIAL COMPARISON</div>
                        <h3 className="text-base font-bold text-[#F5F3FF]">Context Comparison</h3>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-[#C8FF35] bg-[#C8FF35]/10 px-2.5 py-1 rounded border border-[#C8FF35]/25">
                      Memory Found ≠ Memory Applies
                    </span>
                  </div>

                  {/* Core Principle Callout */}
                  <div className="p-3.5 rounded-xl bg-[#090B16] border-l-4 border-l-[#C8FF35] border border-[#B8A7FF]/15 flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 text-[#C8FF35] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#9D9BB6] leading-relaxed">
                      <strong className="text-[#F5F3FF]">Differential Signal Verification:</strong> Hindy does not assume that a similar alert is automatically safe. It deterministically compares contextual invariants (accounts, hosts, destinations, schedules, data volumes) to ensure security safety boundaries hold.
                    </p>
                  </div>

                  {/* Matches vs Differences Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Matching Signals */}
                    <div className="p-4 rounded-xl bg-[#090B16] border border-emerald-500/20 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-400">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          MATCHING CONTEXT SIGNALS
                        </span>
                        <span>{selectedEntry.analysis?.best_match?.matches?.length || selectedEntry.matches_count || 0}</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {selectedEntry.analysis?.best_match?.matches && selectedEntry.analysis.best_match.matches.length > 0 ? (
                          selectedEntry.analysis.best_match.matches.map((sig) => (
                            <span
                              key={sig}
                              className="px-2 py-1 rounded-md bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              {sig}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs font-mono text-slate-500">Not available in recorded investigation.</span>
                        )}
                      </div>
                    </div>

                    {/* Differences */}
                    <div className="p-4 rounded-xl bg-[#090B16] border border-amber-500/20 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-400">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" />
                          DIFFERENTIAL SIGNALS (VARIATIONS)
                        </span>
                        <span>{selectedEntry.analysis?.best_match?.differences?.length || selectedEntry.differences_count || 0}</span>
                      </div>

                      <div className="space-y-1.5">
                        {selectedEntry.analysis?.best_match?.differences && selectedEntry.analysis.best_match.differences.length > 0 ? (
                          selectedEntry.analysis.best_match.differences.map((diff, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-md bg-amber-950/30 border border-amber-500/30 text-xs font-mono text-amber-200 flex items-center justify-between gap-2"
                            >
                              <span className="font-bold text-amber-300">{diff.signal}:</span>
                              <span className="text-[11px] text-[#9D9BB6]">
                                Past: <span className="text-slate-300">{String(diff.past)}</span> → Current: <span className="text-[#C8FF35]">{String(diff.current)}</span>
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 rounded-lg bg-[#111321] border border-[#B8A7FF]/10 text-xs font-mono text-slate-400">
                            0 signal differences detected (all contextual security invariants matched).
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* --------------------------------------------------------- */}
              {/* SECTION 4: REASONING PATHWAY */}
              {/* --------------------------------------------------------- */}
              {(showAllSteps || currentStep >= 4) && (
                <section className="p-5 lg:p-6 rounded-2xl bg-[#111321]/95 border border-[#B8A7FF]/20 shadow-xl backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#B8A7FF]/15">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#090B16] border border-[#B8A7FF]/30 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-[#C8FF35]" />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-[#9D9BB6] uppercase">STEP 4 • AI REASONING</div>
                        <h3 className="text-base font-bold text-[#F5F3FF]">Hindy Reasoning Pathway</h3>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase tracking-wider ${
                        selectedEntry.state === 'green'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                          : selectedEntry.state === 'yellow'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                      }`}
                    >
                      {selectedEntry.state === 'green'
                        ? 'Low Risk (Green)'
                        : selectedEntry.state === 'yellow'
                        ? 'Review Required (Yellow)'
                        : 'High Risk (Red)'}
                    </span>
                  </div>

                  {/* Recommended Action Box */}
                  <div className="p-4 rounded-xl bg-[#090B16] border border-[#C8FF35]/30 space-y-1.5">
                    <div className="text-[10px] font-mono text-[#C8FF35] uppercase font-bold tracking-wider">
                      RECOMMENDED ACTION
                    </div>
                    <div className="text-sm font-semibold text-[#F5F3FF]">
                      {selectedEntry.analysis?.recommended_action || 'Review context telemetry.'}
                    </div>
                  </div>

                  {/* Recorded Reasoning Points */}
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-[#9D9BB6] uppercase tracking-wider font-semibold">
                      Deterministic Reasoning Points
                    </div>
                    <div className="space-y-2">
                      {selectedEntry.analysis?.reasons && selectedEntry.analysis.reasons.length > 0 ? (
                        selectedEntry.analysis.reasons.map((reason, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 text-xs text-[#F5F3FF] leading-relaxed flex items-start gap-2.5 font-mono"
                          >
                            <span className="w-5 h-5 rounded bg-[#111321] text-[#C8FF35] flex items-center justify-center font-bold shrink-0 text-[10px]">
                              {idx + 1}
                            </span>
                            <span>{reason}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs font-mono text-slate-500">
                          {selectedEntry.analysis?.explanation || 'Reasoning trace recorded in model log.'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Model Metadata */}
                  {selectedEntry.model_used && (
                    <div className="text-[11px] font-mono text-[#9D9BB6] pt-2 border-t border-[#B8A7FF]/10 flex items-center justify-between">
                      <span>Reasoning Engine: <span className="text-slate-300 font-semibold">{selectedEntry.model_used}</span></span>
                      <span>Execution Trace: <span className="text-[#C8FF35]">Deterministic + Groq Cloud</span></span>
                    </div>
                  )}
                </section>
              )}

              {/* --------------------------------------------------------- */}
              {/* SECTION 5: ORIGINAL ANALYST DECISION */}
              {/* --------------------------------------------------------- */}
              {(showAllSteps || currentStep >= 5) && (
                <section className="p-5 lg:p-6 rounded-2xl bg-[#111321]/95 border border-[#B8A7FF]/20 shadow-xl backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#B8A7FF]/15">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#090B16] border border-[#B8A7FF]/30 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-[#C8FF35]" />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-[#9D9BB6] uppercase">STEP 5 • HUMAN AUTHORITY</div>
                        <h3 className="text-base font-bold text-[#F5F3FF]">Original Analyst Decision</h3>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#C8FF35] bg-[#090B16] px-2.5 py-1 rounded border border-[#C8FF35]/30 font-semibold">
                      Human in the Loop
                    </span>
                  </div>

                  {/* Analyst role callout */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-[#090B16] to-[#121424] border border-[#B8A7FF]/20 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#9D9BB6]">DECISION GOVERNANCE:</span>
                      <span className="text-emerald-400 font-bold">
                        {selectedEntry.analysis?.best_match?.outcome || 'Closed - benign (recurring pattern)'}
                      </span>
                    </div>
                    <p className="text-xs text-[#F5F3FF] leading-relaxed font-mono">
                      {selectedEntry.analysis?.best_match?.investigation_note ||
                        'Analyst verified operational context matching scheduled backup windows and approved the ticket.'}
                    </p>
                    <div className="text-[11px] font-mono text-[#9D9BB6] pt-2 border-t border-[#B8A7FF]/10">
                      Investigating Analyst: <span className="text-slate-200 font-bold">{selectedEntry.analysis?.best_match?.analyst || 'SOC Analyst'}</span> • Decision recorded in Hindsight Memory Core.
                    </div>
                  </div>
                </section>
              )}

              {/* --------------------------------------------------------- */}
              {/* SECTION 6: WHAT HINDY LEARNED (RETAINED LEARNING) */}
              {/* --------------------------------------------------------- */}
              {(showAllSteps || currentStep >= 6) && (
                <section className="p-5 lg:p-6 rounded-2xl bg-[#111321]/95 border border-[#C8FF35]/30 shadow-[0_0_30px_rgba(200,255,53,0.08)] backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#B8A7FF]/15">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#090B16] border border-[#C8FF35]/40 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-[#C8FF35]" />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-[#9D9BB6] uppercase">STEP 6 • CONTINUOUS LEARNING LOOP</div>
                        <h3 className="text-base font-bold text-[#F5F3FF]">What Hindy Learned</h3>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#C8FF35] bg-[#090B16] px-2.5 py-1 rounded border border-[#C8FF35]/30">
                      Memory Retained
                    </span>
                  </div>

                  {/* Learning Loop Visual */}
                  <div className="p-4 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-[#9D9BB6]">
                      <span>LEARNING RELATIONSHIP:</span>
                      <span className="text-[#C8FF35]">Investigation → Learning → Memory</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs font-mono">
                      <div className="p-3 rounded-lg bg-[#111321] border border-[#B8A7FF]/10 space-y-1">
                        <div className="text-[10px] text-[#9D9BB6]">1. INVESTIGATION</div>
                        <div className="font-bold text-[#F5F3FF]">{selectedEntry.alert_id}</div>
                      </div>

                      <div className="p-3 rounded-lg bg-[#111321] border border-[#B8A7FF]/10 space-y-1">
                        <div className="text-[10px] text-[#9D9BB6]">2. PATTERN LEARNING</div>
                        <div className="font-bold text-[#C8FF35]">{selectedEntry.title}</div>
                      </div>

                      <div className="p-3 rounded-lg bg-[#111321] border border-[#B8A7FF]/10 space-y-1">
                        <div className="text-[10px] text-[#9D9BB6]">3. MEMORY BANK</div>
                        <div className="font-bold text-[#B8A7FF]">{selectedEntry.best_match_id || selectedEntry.alert_id}</div>
                      </div>
                    </div>

                    {onNavigateToMemory && (
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => onNavigateToMemory(selectedEntry.best_match_id || undefined)}
                          className="px-4 py-2 rounded-xl bg-[#C8FF35] hover:bg-[#d6ff52] text-[#090B16] font-bold text-xs font-mono transition-all cursor-pointer shadow-[0_0_15px_rgba(200,255,53,0.25)] flex items-center gap-2"
                        >
                          <Database className="w-3.5 h-3.5" />
                          <span>View Memory in Memory Bank</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
};
