import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Flame, 
  Activity, 
  ArrowRight, 
  Clock, 
  UserCheck, 
  Radio, 
  Search,
  RotateCcw,
  CheckCircle2,
  Server,
  User as UserIcon,
  LogOut,
  Settings as SettingsIcon,
  ChevronDown,
  Mail
} from 'lucide-react';
import type { AlertSummary, HealthStatus, UserProfile } from '../types';
import hindyRobot from '../assets/hindy_robot_base.png';

interface DashboardViewProps {
  alerts: AlertSummary[];
  health: HealthStatus | null;
  user: UserProfile | null;
  analystName: string;
  demoMode: boolean;
  onDemoModeChange: (enabled: boolean) => void;
  onResetDemo: () => Promise<void>;
  isResetting: boolean;
  resetNotification: string | null;
  onNavigateToAlerts: (alertId?: string) => void;
  onNavigateSettings?: () => void;
  onLogout?: () => void;
}

const severityWeight = (sev: string): number => {
  switch (sev?.toLowerCase()) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  alerts,
  health,
  user,
  analystName,
  demoMode,
  onDemoModeChange,
  onResetDemo,
  isResetting,
  resetNotification,
  onNavigateToAlerts,
  onNavigateSettings,
  onLogout,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'decided' | 'all'>('pending');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isMemoryOnline = health?.memory_core_online === true;

  const displayName = user?.name || analystName || 'Priya Nair';
  const displayRole = user?.role || 'SOC Lead Tier-3';
  const displayLevel = user?.level || 'Tier-3 Analyst';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Active / Pending alerts requiring current triage vs historical decided alerts
  const pendingAlerts = useMemo(() => alerts.filter(a => !a.is_decided), [alerts]);
  const decidedAlerts = useMemo(() => alerts.filter(a => a.is_decided), [alerts]);

  // Derive dynamic metrics accurately from actual pending triage population
  const totalActive = pendingAlerts.length;
  const criticalCount = useMemo(() => pendingAlerts.filter(a => a.severity?.toLowerCase() === 'critical').length, [pendingAlerts]);
  const highRiskCount = useMemo(() => pendingAlerts.filter(a => a.severity?.toLowerCase() === 'high').length, [pendingAlerts]);
  const pendingTriageCount = pendingAlerts.length;

  // Sort alerts by severity (CRITICAL -> HIGH -> MEDIUM -> LOW), then by timestamp descending
  const sortedAlerts = useMemo(() => {
    const listToFilter = statusFilter === 'pending' ? pendingAlerts : statusFilter === 'decided' ? decidedAlerts : alerts;
    return [...listToFilter].sort((a, b) => {
      const weightDiff = severityWeight(b.severity) - severityWeight(a.severity);
      if (weightDiff !== 0) return weightDiff;
      
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
  }, [alerts, pendingAlerts, decidedAlerts, statusFilter]);

  // Filtered list for search and severity tabs
  const filteredAlerts = useMemo(() => {
    return sortedAlerts.filter(alert => {
      const matchesSeverity = severityFilter === 'all' || alert.severity?.toLowerCase() === severityFilter;
      if (!matchesSeverity) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        alert.id?.toLowerCase().includes(q) ||
        alert.title?.toLowerCase().includes(q) ||
        alert.host?.toLowerCase().includes(q) ||
        alert.user?.toLowerCase().includes(q)
      );
    });
  }, [sortedAlerts, severityFilter, searchQuery]);

  const topCriticalAlert = useMemo(() => {
    return pendingAlerts.find(a => a.severity?.toLowerCase() === 'critical') || pendingAlerts[0] || null;
  }, [pendingAlerts]);

  return (
    <div className="relative h-full w-full bg-[#070A10] text-[#F5F3FF] overflow-y-auto select-none">
      {/* Centered Background Holographic 3D Hindy Presence */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] md:w-[640px] pointer-events-none opacity-[0.14] select-none mix-blend-screen z-0 animate-[float_6s_ease-in-out_infinite]">
        <img
          src={hindyRobot}
          alt="Hindy Holographic Presence"
          className="w-full h-auto object-contain filter drop-shadow-[0_0_90px_rgba(200,255,53,0.35)]"
        />
      </div>

      {/* Ambient background glow orbs */}
      <div className="fixed top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#B8A7FF]/5 blur-[160px] pointer-events-none z-0" />
      <div className="fixed bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#C8FF35]/4 blur-[160px] pointer-events-none z-0" />

      {/* Main Dashboard Container */}
      <div className="relative z-10 max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
        {/* ========================================================= */}
        {/* 1. TOP PRIMARY HEADER */}
        {/* ========================================================= */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#B8A7FF]/15">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#111321] border border-[#C8FF35]/30 flex items-center justify-center shadow-[0_0_20px_rgba(200,255,53,0.2)]">
              <Shield className="w-6 h-6 text-[#C8FF35]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-[#F5F3FF]">Hindy</h1>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#B8A7FF]/15 text-[#B8A7FF] border border-[#B8A7FF]/30">
                  SOC OPERATIONS DASHBOARD
                </span>
              </div>
              <p className="text-xs text-[#9D9BB6] font-mono mt-0.5">
                Real-time Threat Triage & Experience-Driven SOC Intelligence
              </p>
            </div>
          </div>

          {/* Header Controls & Status */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Demo Mode Toggle */}
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111321] border border-[#B8A7FF]/20 text-xs text-[#9D9BB6] cursor-pointer hover:border-[#B8A7FF]/40 transition-colors">
              <input 
                type="checkbox" 
                checked={demoMode} 
                onChange={(e) => onDemoModeChange(e.target.checked)} 
                className="accent-[#C8FF35] cursor-pointer" 
              />
              <span className="font-mono text-[11px]">Cached demo mode</span>
              {demoMode && (
                <span className="px-1.5 py-0.2 rounded bg-[#C8FF35]/15 text-[#C8FF35] text-[10px] font-mono font-bold">
                  ON
                </span>
              )}
            </label>

            {/* Reset Demo Button */}
            <button
              onClick={onResetDemo}
              disabled={isResetting}
              title="Reset live demo memory overrides"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111321] hover:bg-[#181B2E] border border-[#B8A7FF]/20 text-xs font-mono text-[#9D9BB6] hover:text-[#F5F3FF] transition-all disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-[#C8FF35] ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? 'Resetting...' : 'Reset Demo'}</span>
            </button>

            {/* Reset Notification Toast */}
            {resetNotification && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{resetNotification}</span>
              </div>
            )}

            {/* Memory Core Status Pill */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111321] border border-[#B8A7FF]/20 shadow-sm">
              <span className={`w-2 h-2 rounded-full ${isMemoryOnline ? 'bg-[#C8FF35] shadow-[0_0_8px_#C8FF35] animate-pulse' : 'bg-[#9D9BB6]'}`} />
              <span className="text-xs font-mono font-medium text-[#F5F3FF]">
                {isMemoryOnline ? 'MEMORY CORE ONLINE' : 'CONNECTING...'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#090B16] text-[#9D9BB6] border border-[#B8A7FF]/10">
                soc-memory
              </span>
            </div>

            {/* Interactive Analyst Profile Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#111321] border border-[#B8A7FF]/20 hover:border-[#C8FF35]/40 transition-all cursor-pointer text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-[#C8FF35]/15 border border-[#C8FF35]/30 flex items-center justify-center text-[#C8FF35] text-xs font-mono font-bold shadow-[0_0_8px_rgba(200,255,53,0.15)]">
                  {initials}
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-[#F5F3FF] leading-none flex items-center gap-1">
                    {displayName}
                    <ChevronDown className="w-3 h-3 text-[#9D9BB6]" />
                  </div>
                  <div className="text-[10px] text-[#9D9BB6] font-mono mt-0.5 flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-[#C8FF35]" /> {displayRole}
                  </div>
                </div>
              </button>

              {/* Profile Dropdown Popup */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#090B16] border border-[#B8A7FF]/25 shadow-2xl p-2.5 space-y-2 z-50 animate-fadeIn">
                  <div className="p-3 rounded-xl bg-[#0F1122] border border-[#B8A7FF]/15 space-y-1">
                    <div className="text-xs font-bold text-[#F5F3FF] truncate">{displayName}</div>
                    {user?.email && (
                      <div className="text-[11px] text-[#9D9BB6] truncate flex items-center gap-1">
                        <Mail className="w-3 h-3 text-[#B8A7FF]" />
                        {user.email}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-semibold bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30">
                        {displayRole}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono text-[#9D9BB6] bg-[#151828]">
                        {displayLevel}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {onNavigateSettings && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onNavigateSettings();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#9D9BB6] hover:text-[#F5F3FF] hover:bg-[#151828] transition-all text-left cursor-pointer"
                      >
                        <SettingsIcon className="w-4 h-4 text-[#C8FF35]" />
                        <span>Profile / Settings</span>
                      </button>
                    )}

                    {onLogout && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition-all text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span>Log Out</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 2. DYNAMIC SECURITY OVERVIEW METRICS */}
        {/* ========================================================= */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Alerts */}
          <div className="p-4 rounded-2xl bg-[#111321]/90 border border-[#B8A7FF]/15 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between text-xs font-mono text-[#9D9BB6]">
              <span>ACTIVE ALERTS</span>
              <Activity className="w-4 h-4 text-[#B8A7FF]" />
            </div>
            <div className="text-3xl font-bold text-[#F5F3FF] font-mono mt-2">{totalActive}</div>
            <div className="text-[11px] text-[#9D9BB6] mt-1 flex items-center gap-1.5">
              <span className="text-[#C8FF35] font-semibold font-mono">100% indexed</span> in current queue
            </div>
          </div>

          {/* Critical Alerts */}
          <div className="p-4 rounded-2xl bg-[#111321]/90 border border-rose-500/25 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between text-xs font-mono text-rose-300">
              <span>CRITICAL ALERTS</span>
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-3xl font-bold text-rose-400 font-mono mt-2">{criticalCount}</div>
            <div className="text-[11px] text-[#9D9BB6] mt-1 flex items-center gap-1">
              <span className="text-rose-400 font-semibold font-mono">Top priority</span> • requires decision
            </div>
          </div>

          {/* High Risk Alerts */}
          <div className="p-4 rounded-2xl bg-[#111321]/90 border border-amber-500/25 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between text-xs font-mono text-amber-300">
              <span>HIGH RISK</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-amber-400 font-mono mt-2">{highRiskCount}</div>
            <div className="text-[11px] text-[#9D9BB6] mt-1 flex items-center gap-1">
              <span className="text-amber-400 font-semibold font-mono">Elevated threat</span> signatures
            </div>
          </div>

          {/* Pending Triage */}
          <div className="p-4 rounded-2xl bg-[#111321]/90 border border-[#C8FF35]/25 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between text-xs font-mono text-[#C8FF35]">
              <span>PENDING TRIAGE</span>
              <Radio className="w-4 h-4 text-[#C8FF35] animate-pulse" />
            </div>
            <div className="text-3xl font-bold text-[#C8FF35] font-mono mt-2">{pendingTriageCount}</div>
            <div className="text-[11px] text-[#9D9BB6] mt-1 flex items-center gap-1">
              <span className="text-[#C8FF35] font-semibold font-mono">Awaiting review</span> in queue
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. COMPLETE PRIORITIZED ALERT QUEUE */}
        {/* ========================================================= */}
        <section className="p-6 rounded-2xl bg-[#111321]/95 border border-[#B8A7FF]/20 shadow-2xl backdrop-blur-xl space-y-4">
          {/* Header & Controls Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#B8A7FF]/15">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-[#F5F3FF]">
                  {statusFilter === 'pending' ? 'Active Alert Queue' : statusFilter === 'decided' ? 'Decided Investigations' : 'All Alerts'}
                </h2>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30">
                  {filteredAlerts.length} {statusFilter === 'pending' ? 'active' : statusFilter === 'decided' ? 'decided' : 'total'} • Ordered by severity
                </span>
              </div>
              <p className="text-xs text-[#9D9BB6] mt-0.5">
                {statusFilter === 'pending'
                  ? 'All active pending alerts requiring current triage, ordered by severity.'
                  : statusFilter === 'decided'
                  ? 'Historical and confirmed investigations saved in memory.'
                  : 'Complete alert population across active and resolved cases.'}
              </p>
            </div>

            {/* Quick Action & Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Primary Next Action CTA */}
              {topCriticalAlert && statusFilter !== 'decided' && (
                <button
                  onClick={() => onNavigateToAlerts(topCriticalAlert.id)}
                  className="px-4 py-2 rounded-xl bg-[#C8FF35] hover:bg-[#d4ff4d] text-[#090B16] font-bold text-xs tracking-wide shadow-[0_0_18px_rgba(200,255,53,0.3)] active:scale-[0.99] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 stroke-[2.5]" />
                  INVESTIGATE TOP ALERT ({topCriticalAlert.id})
                </button>
              )}

              {/* Search input */}
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-3.5 h-3.5 text-[#9D9BB6]" />
                <input
                  type="text"
                  placeholder="Search alert, host, user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-[#090B16] border border-[#B8A7FF]/20 rounded-xl text-xs text-[#F5F3FF] placeholder-[#9D9BB6]/50 focus:outline-none focus:border-[#C8FF35] font-mono transition-all w-48 sm:w-60"
                />
              </div>

              {/* Status Filter (Pending / Decided / All) */}
              <div className="flex items-center bg-[#090B16] p-1 rounded-xl border border-[#B8A7FF]/15 text-[11px] font-mono">
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'pending'
                      ? 'bg-[#C8FF35]/20 text-[#C8FF35] border border-[#C8FF35]/30 font-bold shadow-sm'
                      : 'text-[#9D9BB6] hover:text-[#F5F3FF]'
                  }`}
                >
                  Pending ({pendingAlerts.length})
                </button>
                <button
                  onClick={() => setStatusFilter('decided')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'decided'
                      ? 'bg-[#B8A7FF]/20 text-[#B8A7FF] border border-[#B8A7FF]/30 font-bold shadow-sm'
                      : 'text-[#9D9BB6] hover:text-[#F5F3FF]'
                  }`}
                >
                  Decided ({decidedAlerts.length})
                </button>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-[#111321] text-[#F5F3FF] border border-[#B8A7FF]/30 font-bold shadow-sm'
                      : 'text-[#9D9BB6] hover:text-[#F5F3FF]'
                  }`}
                >
                  All ({alerts.length})
                </button>
              </div>

              {/* Severity Filter Pills */}
              <div className="flex items-center bg-[#090B16] p-1 rounded-xl border border-[#B8A7FF]/15 text-[11px] font-mono">
                {(['all', 'critical', 'high', 'medium', 'low'] as const).map(sev => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2 py-1 rounded-lg transition-all capitalize cursor-pointer ${
                      severityFilter === sev
                        ? 'bg-[#111321] text-[#C8FF35] border border-[#C8FF35]/30 font-bold shadow-sm'
                        : 'text-[#9D9BB6] hover:text-[#F5F3FF]'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Complete Scrollable Alert List */}
          <div className="max-h-[640px] overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
            {filteredAlerts.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-mono text-sm bg-[#090B16] rounded-xl border border-slate-800">
                No alerts match the filter query.
              </div>
            ) : (
              filteredAlerts.map((alert, idx) => {
                const sev = alert.severity?.toLowerCase();
                const isCritical = sev === 'critical';
                const isHigh = sev === 'high';
                const isMedium = sev === 'medium';

                return (
                  <div
                    key={alert.id}
                    onClick={() => onNavigateToAlerts(alert.id)}
                    className={`group p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isCritical
                        ? 'bg-[#140D17]/90 hover:bg-[#1C1021] border-rose-500/30 hover:border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.12)]'
                        : isHigh
                        ? 'bg-[#161214]/90 hover:bg-[#20181A] border-amber-500/25 hover:border-amber-500/50'
                        : isMedium
                        ? 'bg-[#090B16]/90 hover:bg-[#0E1122] border-[#B8A7FF]/15 hover:border-[#B8A7FF]/40'
                        : 'bg-[#080912]/80 hover:bg-[#0D0F1C] border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Left: Rank, Severity & ID, Title */}
                    <div className="flex-1 min-w-0 flex items-start sm:items-center gap-3">
                      {/* Priority Rank Number */}
                      <span className="text-[11px] font-mono text-[#9D9BB6]/60 w-6 flex-shrink-0 text-right">
                        #{idx + 1}
                      </span>

                      {/* Severity Badge */}
                      <span
                        className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md flex-shrink-0 uppercase tracking-wider ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                            : isHigh
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : isMedium
                            ? 'bg-[#B8A7FF]/15 text-[#B8A7FF] border border-[#B8A7FF]/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {alert.severity || 'UNKNOWN'}
                      </span>

                      {/* Alert ID */}
                      <span className="text-xs font-mono font-bold text-[#C8FF35] flex-shrink-0">
                        {alert.id}
                      </span>

                      {/* Title */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-[#F5F3FF] truncate group-hover:text-[#C8FF35] transition-colors">
                          {alert.title}
                        </h3>
                      </div>
                    </div>

                    {/* Middle: Host, User, Timestamp */}
                    <div className="flex items-center gap-4 text-xs font-mono text-[#9D9BB6] flex-wrap md:flex-nowrap flex-shrink-0">
                      <span className="flex items-center gap-1">
                        <Server className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300">{alert.host || 'unknown'}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300">{alert.user || 'system'}</span>
                      </span>

                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                      </span>

                      {/* Status pill */}
                      {alert.is_decided ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          DECIDED
                        </span>
                      ) : alert.is_escalated ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          ESCALATED
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#111321] text-[#9D9BB6] border border-[#B8A7FF]/15">
                          PENDING
                        </span>
                      )}

                      {/* Review Action Trigger Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToAlerts(alert.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#111321] group-hover:bg-[#C8FF35] text-[#B8A7FF] group-hover:text-[#090B16] font-bold text-xs tracking-wide border border-[#B8A7FF]/20 group-hover:border-[#C8FF35] transition-all flex items-center gap-1.5 cursor-pointer ml-2"
                      >
                        Investigate
                        <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
