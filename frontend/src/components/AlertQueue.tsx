import React, { useState, useMemo } from 'react';
import type { AlertSummary } from '../types';
import { Search, ShieldAlert, Clock, User, Server, Sparkles, CheckCircle2, ArrowUpRight } from 'lucide-react';

interface AlertQueueProps {
  alerts: AlertSummary[];
  selectedAlertId: string | null;
  onSelectAlert: (alertId: string) => void;
  loading: boolean;
  learningPairIds: string[];
}

export const AlertQueue: React.FC<AlertQueueProps> = ({
  alerts,
  selectedAlertId,
  onSelectAlert,
  loading,
  learningPairIds,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Pin the Phase 1 demo alert, then the verified learning pair.
  const sortedAndFilteredAlerts = useMemo(() => {
    let filtered = alerts.filter((alert) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        alert.id.toLowerCase().includes(q) ||
        alert.title.toLowerCase().includes(q) ||
        alert.host.toLowerCase().includes(q) ||
        alert.user.toLowerCase().includes(q) ||
        alert.severity.toLowerCase().includes(q)
      );
    });

    // Custom priority sort
    return filtered.sort((a, b) => {
      // 1. ALRT-00663 always pinned top
      if (a.id === 'ALRT-00663') return -1;
      if (b.id === 'ALRT-00663') return 1;

      // 2. Learning pair pinned next in the order supplied by the API.
      const aPairIndex = learningPairIds.indexOf(a.id);
      const bPairIndex = learningPairIds.indexOf(b.id);
      if (aPairIndex !== -1 || bPairIndex !== -1) {
        if (aPairIndex === -1) return 1;
        if (bPairIndex === -1) return -1;
        return aPairIndex - bPairIndex;
      }

      return a.id.localeCompare(b.id);
    });
  }, [alerts, learningPairIds, searchQuery]);

  const getSeverityBadge = (severity: string) => {
    const sev = severity.toLowerCase();
    if (sev === 'critical') {
      return <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-red-950/80 text-red-400 border border-red-800/60">CRIT</span>;
    }
    if (sev === 'high') {
      return <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-amber-950/80 text-amber-400 border border-amber-800/60">HIGH</span>;
    }
    if (sev === 'medium') {
      return <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-yellow-950/60 text-yellow-400 border border-yellow-800/50">MED</span>;
    }
    return <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-slate-800 text-slate-400 border border-slate-700">LOW</span>;
  };

  const getStateDot = (state?: string | null) => {
    if (!state) return null;
    if (state === 'green') {
      return <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" title="Cached: Low Risk" />;
    }
    if (state === 'yellow') {
      return <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" title="Cached: Review Required" />;
    }
    if (state === 'red') {
      return <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" title="Cached: High Risk" />;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f18]/90 border-r border-slate-800/80 select-none">
      {/* Header & Search */}
      <div className="p-3 border-b border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Replay Alerts
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
            {sortedAndFilteredAlerts.length} queue
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ID, title, host, user..."
            className="w-full bg-slate-950/70 border border-slate-800/80 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
          />
        </div>
      </div>

      {/* Alert List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center space-y-2">
            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading replay alerts...</span>
          </div>
        ) : sortedAndFilteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No alerts found matching search.
          </div>
        ) : (
          sortedAndFilteredAlerts.map((alert) => {
            const isSelected = selectedAlertId === alert.id;
            const isDemoPinned = alert.id === 'ALRT-00663';
            const isLearningPair = learningPairIds.includes(alert.id);

            return (
              <div
                key={alert.id}
                onClick={() => onSelectAlert(alert.id)}
                className={`p-3 cursor-pointer transition-all duration-150 relative border-l-2 ${
                  isSelected
                    ? 'bg-cyan-950/30 border-l-cyan-400 text-slate-100 shadow-[inset_0_0_12px_rgba(6,182,212,0.08)]'
                    : isDemoPinned
                    ? 'bg-slate-900/60 border-l-amber-500/80 hover:bg-slate-900 text-slate-300'
                    : isLearningPair
                    ? 'bg-slate-900/40 border-l-cyan-500/60 hover:bg-slate-900/80 text-slate-300'
                    : 'bg-transparent border-l-transparent hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                {/* Pinned Tag / State Dot */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    <span className="text-xs font-mono font-bold text-slate-200 tracking-tight">
                      {alert.id}
                    </span>
                    {isDemoPinned && (
                      <span className="flex items-center space-x-1 px-1.5 py-0.2 bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[9px] font-bold uppercase tracking-wider rounded">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        <span>DEMO ALERT</span>
                      </span>
                    )}
                    {isLearningPair && (
                      <span className="flex items-center space-x-1 px-1.5 py-0.2 bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[9px] font-bold uppercase tracking-wider rounded">
                        <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                        <span>DEMO: LEARNING PAIR</span>
                      </span>
                    )}
                    {alert.is_decided && (
                      <span className="flex items-center space-x-1 px-1.5 py-0.2 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold uppercase rounded">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        <span>decided</span>
                      </span>
                    )}
                    {alert.is_escalated && (
                      <span className="flex items-center space-x-1 px-1.5 py-0.2 bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[9px] font-semibold rounded">
                        <ArrowUpRight className="w-2.5 h-2.5 text-rose-400" />
                        <span>Escalated to Tier 2 (demo status)</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {getStateDot(alert.cached_state)}
                    {getSeverityBadge(alert.severity)}
                  </div>
                </div>

                {/* Title */}
                <div className="text-xs font-medium text-slate-200 line-clamp-1 mb-2">
                  {alert.title}
                </div>

                {/* Metadata Row */}
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1.5 truncate max-w-[130px]">
                    <Server className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{alert.host}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 truncate max-w-[110px]">
                    <User className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{alert.user}</span>
                  </div>
                </div>

                {/* Timestamp */}
                {alert.timestamp && (
                  <div className="flex items-center space-x-1 text-[10px] text-slate-400 mt-1.5 font-mono">
                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                    <span>{alert.timestamp}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
