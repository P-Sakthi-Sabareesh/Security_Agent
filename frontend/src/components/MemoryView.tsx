import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Search,
  ShieldCheck,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Server,
  User as UserIcon,
  Clock,
  ExternalLink,
  X,
  Sparkles,
  Tag,
  Radio,
  UserCheck,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import type { MemoryItem, MemoryStats, MemoryResponse } from '../types';
import hindyRobot from '../assets/hindy_robot_base.png';

interface MemoryViewProps {
  onNavigateToInvestigation?: (alertId: string) => void;
  onNavigateToActiveInvestigation?: () => void;
}

const API_BASE = 'http://127.0.0.1:8000';

export const MemoryView: React.FC<MemoryViewProps> = ({
  onNavigateToInvestigation,
  onNavigateToActiveInvestigation,
}) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<'all' | 'benign' | 'attack' | 'live'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'id' | 'severity'>('recent');

  // Modal Detail State
  const [inspectMemory, setInspectMemory] = useState<MemoryItem | null>(null);

  // Fetch real memories from backend
  const fetchMemories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/memories`);
      if (!res.ok) {
        throw new Error('Failed to retrieve memory bank data.');
      }
      const data: MemoryResponse = await res.json();
      setMemories(data.memories || []);
      setStats(data.stats || null);
    } catch (err: any) {
      console.error('Error fetching memories:', err);
      setError(err.message || 'Unable to connect to memory store.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  // Filtered and Sorted Memories
  const filteredMemories = useMemo(() => {
    let list = [...memories];

    // Filter by Verdict / Live status
    if (verdictFilter === 'attack') {
      list = list.filter((m) => m.verdict === 'TruePositive' || m.verdict === 'Malicious');
    } else if (verdictFilter === 'benign') {
      list = list.filter((m) => m.verdict === 'BenignPositive' || m.verdict === 'Benign');
    } else if (verdictFilter === 'live') {
      list = list.filter((m) => m.is_live);
    }

    // Filter by Category
    if (selectedCategory !== 'all') {
      list = list.filter((m) => m.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Filter by Severity
    if (selectedSeverity !== 'all') {
      list = list.filter((m) => m.severity?.toLowerCase() === selectedSeverity.toLowerCase());
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => {
        return (
          m.id?.toLowerCase().includes(q) ||
          m.title?.toLowerCase().includes(q) ||
          m.host?.toLowerCase().includes(q) ||
          m.user?.toLowerCase().includes(q) ||
          m.analyst?.toLowerCase().includes(q) ||
          m.category?.toLowerCase().includes(q) ||
          m.investigation_note?.toLowerCase().includes(q) ||
          m.outcome?.toLowerCase().includes(q) ||
          m.mitre_technique?.toLowerCase().includes(q) ||
          JSON.stringify(m.details || {}).toLowerCase().includes(q) ||
          JSON.stringify(m.context || {}).toLowerCase().includes(q)
        );
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'recent') {
        if (a.is_live && !b.is_live) return -1;
        if (!a.is_live && b.is_live) return 1;
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      } else if (sortBy === 'id') {
        return b.id.localeCompare(a.id);
      } else if (sortBy === 'severity') {
        const sevOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        const weightA = sevOrder[a.severity?.toLowerCase()] || 0;
        const weightB = sevOrder[b.severity?.toLowerCase()] || 0;
        return weightB - weightA;
      }
      return 0;
    });

    return list;
  }, [memories, verdictFilter, selectedCategory, selectedSeverity, searchQuery, sortBy]);

  // Categories list from real data stats
  const availableCategories = useMemo(() => {
    return stats?.categories || [];
  }, [stats]);

  return (
    <div className="relative h-full w-full bg-[#070A10] text-[#F5F3FF] overflow-y-auto select-none p-4 md:p-6 lg:p-8">
      {/* Background Holographic Hindy Presence */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] md:w-[620px] pointer-events-none opacity-[0.12] select-none mix-blend-screen z-0 animate-[float_8s_ease-in-out_infinite]">
        <img
          src={hindyRobot}
          alt="Hindy Memory Intelligence"
          className="w-full h-auto object-contain filter drop-shadow-[0_0_80px_rgba(200,255,53,0.25)]"
        />
      </div>

      {/* Ambient glow lights */}
      <div className="fixed top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-[#B8A7FF]/5 blur-[160px] pointer-events-none z-0" />
      <div className="fixed bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[550px] h-[550px] rounded-full bg-[#C8FF35]/4 blur-[160px] pointer-events-none z-0" />

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto space-y-6 pb-20">
        
        {/* ========================================================= */}
        {/* 1. SECTION SUB-NAVIGATION (Investigations Workspace) */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#B8A7FF]/15">
          {/* Sub-tabs under Investigations */}
          <div className="flex items-center gap-2 bg-[#090B16] p-1 rounded-xl border border-[#B8A7FF]/20">
            {onNavigateToActiveInvestigation && (
              <button
                onClick={onNavigateToActiveInvestigation}
                className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium text-[#9D9BB6] hover:text-[#F5F3FF] hover:bg-[#111321] transition-all cursor-pointer flex items-center gap-2"
              >
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>Active Investigation</span>
              </button>
            )}
            <div className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30 shadow-sm flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-[#C8FF35]" />
              <span>Memory Bank</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#9D9BB6]">
            <span className="w-2 h-2 rounded-full bg-[#C8FF35] animate-pulse" />
            <span className="text-[#F5F3FF] font-semibold">Hindsight Memory Core</span>
            <span className="text-[#B8A7FF]/40">•</span>
            <span className="text-[#C8FF35]">bank: soc-memory</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. HEADER & TAGLINE */}
        {/* ========================================================= */}
        <header className="p-6 rounded-2xl bg-[#111321]/95 border border-[#B8A7FF]/20 shadow-xl backdrop-blur-xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#090B16] border border-[#C8FF35]/30 flex items-center justify-center shadow-[0_0_20px_rgba(200,255,53,0.18)] shrink-0">
                <Database className="w-6 h-6 text-[#C8FF35]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#F5F3FF] font-sans">
                    MEMORY
                  </h1>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#B8A7FF]/15 text-[#B8A7FF] border border-[#B8A7FF]/30">
                    RETAINED SOC EXPERIENCE
                  </span>
                </div>
                <p className="text-xs text-[#9D9BB6] font-mono">
                  What HINDY has learned from previous investigations
                </p>
                <p className="text-[11px] text-[#C8FF35] italic font-sans pt-0.5">
                  "Today's security tools remember what happened. HINDY remembers what the security team learned."
                </p>
              </div>
            </div>

            <button
              onClick={fetchMemories}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-[#090B16] hover:bg-[#181B2E] border border-[#B8A7FF]/20 text-xs font-mono text-[#9D9BB6] hover:text-[#F5F3FF] transition-all cursor-pointer self-start lg:self-center flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#C8FF35] ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Memory Store</span>
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 3. CORE SAFETY BANNER: MEMORY FOUND != MEMORY APPLIES */}
        {/* ========================================================= */}
        <section className="p-4 rounded-xl bg-gradient-to-r from-[#181226] via-[#111321] to-[#0d1424] border border-[#B8A7FF]/30 shadow-lg relative overflow-hidden">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-[#090B16] border border-[#B8A7FF]/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#C8FF35]" />
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-[#C8FF35] tracking-wider uppercase">
                  SAFETY PRINCIPLE: MEMORY FOUND ≠ MEMORY APPLIES
                </span>
                <span className="text-[10px] font-mono text-[#B8A7FF] bg-[#090B16] px-2 py-0.5 rounded border border-[#B8A7FF]/20">
                  Precedent Advisory
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Previous experience can guide an investigation, but HINDY must compare the current alert's context before applying that experience. Retained patterns never automatically close an alert without contextual verification.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. REAL OVERVIEW METRICS (DERIVED STRICTLY FROM REAL DATA) */}
        {/* ========================================================= */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Total Memories */}
          <div className="p-4 rounded-2xl bg-[#111321]/90 border border-[#B8A7FF]/15 backdrop-blur-md shadow-md">
            <div className="flex items-center justify-between text-xs font-mono text-[#9D9BB6]">
              <span>TOTAL MEMORIES</span>
              <Database className="w-4 h-4 text-[#B8A7FF]" />
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-[#F5F3FF] font-mono mt-1.5">
              {stats?.total_memories || memories.length}
            </div>
            <div className="text-[10px] font-mono text-[#9D9BB6] mt-1">
              Retained in Hindsight bank
            </div>
          </div>

          {/* Benign / Expected Patterns */}
          <div className="p-4 rounded-2xl bg-[#111321]/90 border border-emerald-500/25 backdrop-blur-md shadow-md">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-300">
              <span>BENIGN / EXPECTED</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-emerald-400 font-mono mt-1.5">
              {stats?.benign_count ?? memories.filter((m) => m.verdict === 'BenignPositive' || m.verdict === 'Benign').length}
            </div>
            <div className="text-[10px] font-mono text-[#9D9BB6] mt-1">
              Verified benign baselines
            </div>
          </div>

          {/* Attack / Malicious Precedents */}
          <div className="p-4 rounded-2xl bg-[#111321]/90 border border-rose-500/25 backdrop-blur-md shadow-md">
            <div className="flex items-center justify-between text-xs font-mono text-rose-300">
              <span>ATTACK PRECEDENTS</span>
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-rose-400 font-mono mt-1.5">
              {stats?.attack_count ?? memories.filter((m) => m.verdict === 'TruePositive' || m.verdict === 'Malicious').length}
            </div>
            <div className="text-[10px] font-mono text-[#9D9BB6] mt-1">
              Confirmed threat experiences
            </div>
          </div>

          {/* Live Analyst Evolved */}
          <div className="p-4 rounded-2xl bg-[#111321]/90 border border-[#C8FF35]/30 backdrop-blur-md shadow-md">
            <div className="flex items-center justify-between text-xs font-mono text-[#C8FF35]">
              <span>LIVE EVOLVED</span>
              <Sparkles className="w-4 h-4 text-[#C8FF35]" />
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-[#C8FF35] font-mono mt-1.5">
              {stats?.live_count ?? memories.filter((m) => m.is_live).length}
            </div>
            <div className="text-[10px] font-mono text-[#C8FF35] mt-1">
              Analyst decision overrides
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. SEARCH & FILTER CONTROLS */}
        {/* ========================================================= */}
        <section className="p-5 rounded-2xl bg-[#111321]/95 border border-[#B8A7FF]/20 shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9D9BB6]" />
              <input
                type="text"
                placeholder="Search memories by title, alert ID, host, user, analyst, or reasoning note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#090B16] border border-[#B8A7FF]/20 rounded-xl text-xs text-[#F5F3FF] placeholder-[#9D9BB6]/50 focus:outline-none focus:border-[#C8FF35] font-mono transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9D9BB6] hover:text-[#F5F3FF]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#9D9BB6]" />
              <span className="text-xs font-mono text-[#9D9BB6]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#090B16] border border-[#B8A7FF]/20 rounded-xl px-3 py-2 text-xs font-mono text-[#F5F3FF] focus:outline-none focus:border-[#C8FF35] cursor-pointer"
              >
                <option value="recent">Recently Learned / Newest</option>
                <option value="id">Memory ID</option>
                <option value="severity">Severity Weight</option>
              </select>
            </div>
          </div>

          {/* Filter Pills Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#B8A7FF]/10">
            {/* Verdict Type Pills */}
            <div className="flex items-center gap-1.5 flex-wrap bg-[#090B16] p-1 rounded-xl border border-[#B8A7FF]/15 text-xs font-mono">
              <button
                onClick={() => setVerdictFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  verdictFilter === 'all'
                    ? 'bg-[#111321] text-[#C8FF35] border border-[#C8FF35]/30 font-bold shadow-sm'
                    : 'text-[#9D9BB6] hover:text-[#F5F3FF]'
                }`}
              >
                All Experiences ({memories.length})
              </button>

              <button
                onClick={() => setVerdictFilter('benign')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  verdictFilter === 'benign'
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 font-bold'
                    : 'text-[#9D9BB6] hover:text-emerald-400'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Benign / Expected</span>
              </button>

              <button
                onClick={() => setVerdictFilter('attack')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  verdictFilter === 'attack'
                    ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40 font-bold'
                    : 'text-[#9D9BB6] hover:text-rose-300'
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>Attack Precedents</span>
              </button>

              <button
                onClick={() => setVerdictFilter('live')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  verdictFilter === 'live'
                    ? 'bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30 font-bold'
                    : 'text-[#9D9BB6] hover:text-[#C8FF35]'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Live Evolved</span>
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <span className="text-[#9D9BB6]">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#090B16] border border-[#B8A7FF]/20 rounded-xl px-2.5 py-1.5 text-xs text-[#F5F3FF] focus:outline-none focus:border-[#C8FF35] cursor-pointer max-w-[180px]"
              >
                <option value="all">All Categories ({availableCategories.reduce((sum, c) => sum + c.count, 0)})</option>
                {availableCategories.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.category} ({c.count})
                  </option>
                ))}
              </select>

              <span className="text-[#9D9BB6] ml-2">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-[#090B16] border border-[#B8A7FF]/20 rounded-xl px-2.5 py-1.5 text-xs text-[#F5F3FF] focus:outline-none focus:border-[#C8FF35] cursor-pointer"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 6. "WHAT HINDY REMEMBERS" (MAIN EXPERIENCE CARDS) */}
        {/* ========================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#F5F3FF]">What HINDY Remembers</h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30">
                {filteredMemories.length} matches
              </span>
            </div>
            <p className="text-xs font-mono text-[#9D9BB6] hidden sm:block">
              Click any memory to inspect complete telemetry, analyst rationale, and linked investigations
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center rounded-2xl bg-[#111321] border border-[#B8A7FF]/15 space-y-3">
              <RefreshCw className="w-6 h-6 text-[#C8FF35] animate-spin mx-auto" />
              <div className="text-xs font-mono text-[#9D9BB6]">Loading memory experiences from Hindsight bank...</div>
            </div>
          ) : error ? (
            <div className="p-8 text-center rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-2 text-rose-300 font-mono text-xs">
              <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
              <div>{error}</div>
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#111321] border border-slate-800 space-y-2">
              <div className="text-sm font-semibold text-slate-300">No memory experiences match the criteria.</div>
              <div className="text-xs font-mono text-[#9D9BB6]">Try adjusting search keywords or resetting filters.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredMemories.map((m) => {
                const isBenign = m.verdict === 'BenignPositive' || m.verdict === 'Benign' || m.verdict === 'FalsePositive';
                const isAttack = m.verdict === 'TruePositive' || m.verdict === 'Malicious';
                const hasRelated = m.related_investigations && m.related_investigations.length > 0;

                return (
                  <div
                    key={m.id}
                    onClick={() => setInspectMemory(m)}
                    className={`group p-4 md:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden ${
                      m.is_live
                        ? 'bg-[#151a24] hover:bg-[#1b2230] border-[#C8FF35]/60 hover:border-[#C8FF35] shadow-[0_0_20px_rgba(200,255,53,0.12)]'
                        : isAttack
                        ? 'bg-[#140D17]/90 hover:bg-[#1C1021] border-rose-500/25 hover:border-rose-500/50'
                        : 'bg-[#111321]/95 hover:bg-[#181B2E] border-[#B8A7FF]/15 hover:border-[#B8A7FF]/40'
                    }`}
                  >
                    {/* Top Row: Memory ID, Category, MITRE, Verdict & Live Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Live Override Badge */}
                        {m.is_live && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#C8FF35] text-[#090B16] flex items-center gap-1 shadow-[0_0_10px_rgba(200,255,53,0.4)]">
                            <Sparkles className="w-3 h-3 stroke-[2.5]" />
                            LIVE ANALYST OVERRIDE
                          </span>
                        )}

                        {/* Memory ID */}
                        <span className="text-xs font-mono font-bold text-[#C8FF35] px-2 py-0.5 rounded bg-[#090B16] border border-[#C8FF35]/30">
                          {m.id}
                        </span>

                        {/* Category */}
                        <span className="text-xs font-mono text-[#9D9BB6] px-2 py-0.5 rounded bg-[#090B16] border border-[#B8A7FF]/15 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-[#B8A7FF]" />
                          {m.category}
                        </span>

                        {/* MITRE technique */}
                        {m.mitre_technique && (
                          <span className="text-[11px] font-mono text-purple-300 px-2 py-0.5 rounded bg-purple-950/40 border border-purple-800/40">
                            MITRE: {m.mitre_technique}
                          </span>
                        )}
                      </div>

                      {/* Right: Verdict Badge */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                            isAttack
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : isBenign
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {m.verdict}
                        </span>

                        {m.timestamp && (
                          <span className="text-[11px] font-mono text-[#9D9BB6] hidden md:flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {new Date(m.timestamp).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Title and What was Observed */}
                    <div>
                      <h3 className="text-sm md:text-base font-bold text-[#F5F3FF] group-hover:text-[#C8FF35] transition-colors">
                        {m.title}
                      </h3>

                      {/* Telemetry Chips */}
                      <div className="flex items-center gap-3 text-xs font-mono text-[#9D9BB6] mt-1.5 flex-wrap">
                        {m.host && (
                          <span className="flex items-center gap-1 bg-[#090B16] px-2 py-0.5 rounded border border-[#B8A7FF]/10">
                            <Server className="w-3 h-3 text-[#C8FF35]" />
                            <span className="text-slate-200">{m.host}</span>
                          </span>
                        )}
                        {m.user && (
                          <span className="flex items-center gap-1 bg-[#090B16] px-2 py-0.5 rounded border border-[#B8A7FF]/10">
                            <UserIcon className="w-3 h-3 text-[#B8A7FF]" />
                            <span className="text-slate-200">{m.user}</span>
                          </span>
                        )}
                        {m.src_ip && (
                          <span className="text-slate-400">IP: {m.src_ip}</span>
                        )}
                        {m.dst && (
                          <span className="text-slate-400">Dst: {m.dst}</span>
                        )}
                      </div>
                    </div>

                    {/* What Analyst Found / Retained Learning */}
                    <div className="p-3 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#9D9BB6] uppercase">
                        <span className="text-[#B8A7FF] font-bold">RETAINED INVESTIGATION FINDING</span>
                        <span>Analyst: {m.analyst}</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans line-clamp-2">
                        {m.investigation_note || m.outcome || 'No investigation note recorded.'}
                      </p>
                    </div>

                    {/* Bottom Row: Outcome & Connection to Investigations */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#B8A7FF]/10 text-xs font-mono">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-[#9D9BB6]">Resolution:</span>
                        <span className="text-slate-300 font-semibold">{m.outcome || 'Case resolved'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasRelated ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#B8A7FF]/15 text-[#B8A7FF] border border-[#B8A7FF]/30">
                            Recalled in {m.related_investigations.length} replay case{m.related_investigations.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-[#9D9BB6]/70">
                            Primary precedent
                          </span>
                        )}

                        <span className="text-[#C8FF35] group-hover:underline flex items-center gap-1 font-bold text-xs ml-1">
                          Inspect Experience
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ========================================================= */}
      {/* 7. DETAILED MEMORY INSPECTION MODAL */}
      {/* ========================================================= */}
      {inspectMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-text">
          <div className="relative w-full max-w-3xl bg-[#111321] border border-[#B8A7FF]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#B8A7FF]/15 flex items-center justify-between bg-[#090B16]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#111321] border border-[#C8FF35]/30 flex items-center justify-center">
                  <Database className="w-5 h-5 text-[#C8FF35]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#F5F3FF] font-mono">
                      Retained Experience: {inspectMemory.id}
                    </span>
                    {inspectMemory.is_live && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#C8FF35] text-[#090B16]">
                        LIVE OVERRIDE
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                        inspectMemory.verdict === 'TruePositive' || inspectMemory.verdict === 'Malicious'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {inspectMemory.verdict}
                    </span>
                  </div>
                  <p className="text-xs text-[#9D9BB6] mt-0.5 font-mono">
                    Retained into permanent Hindsight memory core • Bank: <span className="text-slate-300">soc-memory</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectMemory(null)}
                className="p-1.5 rounded-lg bg-[#181B2E] hover:bg-[#20253D] text-[#9D9BB6] hover:text-[#F5F3FF] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto text-xs font-mono">
              
              {/* 1. WHAT HAPPENED */}
              <div className="p-4 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-2">
                <div className="text-[10px] text-[#9D9BB6] uppercase font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#B8A7FF]" />
                  <span>1. WHAT HAPPENED (INCIDENT METADATA)</span>
                </div>
                <div className="text-base font-bold text-[#F5F3FF] font-sans">
                  {inspectMemory.title}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-[#9D9BB6]">Category:</span> <span className="text-slate-200">{inspectMemory.category || 'General'}</span>
                  </div>
                  <div>
                    <span className="text-[#9D9BB6]">Severity:</span> <span className="text-slate-200 uppercase">{inspectMemory.severity || 'Medium'}</span>
                  </div>
                  <div>
                    <span className="text-[#9D9BB6]">MITRE:</span> <span className="text-purple-300">{inspectMemory.mitre_technique || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[#9D9BB6]">Detector:</span> <span className="text-slate-200">{inspectMemory.detector_id || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* 2. WHAT WAS OBSERVED */}
              <div className="p-4 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-3">
                <div className="text-[10px] text-[#9D9BB6] uppercase font-bold flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-[#C8FF35]" />
                  <span>2. WHAT WAS OBSERVED (TELEMETRY & CONTEXT SIGNALS)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-[#111321] border border-[#B8A7FF]/10">
                    <div className="text-[10px] text-[#9D9BB6]">HOST</div>
                    <div className="text-slate-200 font-bold truncate mt-0.5">{inspectMemory.host || 'Not available in retained data'}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#111321] border border-[#B8A7FF]/10">
                    <div className="text-[10px] text-[#9D9BB6]">USER / IDENTITY</div>
                    <div className="text-slate-200 font-bold truncate mt-0.5">{inspectMemory.user || 'Not available in retained data'}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#111321] border border-[#B8A7FF]/10">
                    <div className="text-[10px] text-[#9D9BB6]">SOURCE IP</div>
                    <div className="text-slate-200 font-bold truncate mt-0.5">{inspectMemory.src_ip || 'N/A'}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#111321] border border-[#B8A7FF]/10">
                    <div className="text-[10px] text-[#9D9BB6]">DESTINATION</div>
                    <div className="text-slate-200 font-bold truncate mt-0.5">{inspectMemory.dst || 'N/A'}</div>
                  </div>
                </div>

                {/* Key Details dictionary */}
                {inspectMemory.details && Object.keys(inspectMemory.details).length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] text-[#9D9BB6]">KEY DETAILS RECORDED:</div>
                    <div className="p-2.5 rounded-lg bg-[#111321] border border-[#B8A7FF]/10 space-y-1">
                      {Object.entries(inspectMemory.details).map(([k, v]) => (
                        <div key={k} className="text-[11px] text-slate-300">
                          <span className="text-[#C8FF35]">{k}:</span> {String(v)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Context Signals dictionary */}
                {inspectMemory.context && Object.keys(inspectMemory.context).length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] text-[#9D9BB6]">RELEVANT CONTEXT SIGNALS:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(inspectMemory.context).map(([k, v]) => (
                        <span key={k} className="px-2 py-1 rounded bg-[#111321] border border-[#B8A7FF]/15 text-[11px] text-slate-300">
                          <span className="text-[#B8A7FF]">{k}:</span> {String(v)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. WHAT THE ANALYST FOUND */}
              <div className="p-4 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-2">
                <div className="text-[10px] text-[#9D9BB6] uppercase font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#B8A7FF]" />
                    <span>3. WHAT THE ANALYST FOUND (INVESTIGATION REASONING)</span>
                  </span>
                  <span className="text-[#B8A7FF]">Analyst: {inspectMemory.analyst || 'SOC Analyst'}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans bg-[#111321] p-3 rounded-lg border border-[#B8A7FF]/10">
                  {inspectMemory.investigation_note || 'Not available in retained investigation data.'}
                </p>
              </div>

              {/* 4. HOW IT WAS RESOLVED */}
              <div className="p-4 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-2">
                <div className="text-[10px] text-[#9D9BB6] uppercase font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>4. HOW IT WAS RESOLVED</span>
                </div>
                <div className="text-xs text-slate-200 font-sans">
                  {inspectMemory.outcome || inspectMemory.verdict || 'Case disposition logged.'}
                </div>
              </div>

              {/* 5. WHAT HINDY LEARNED */}
              <div className="p-4 rounded-xl bg-gradient-to-b from-[#181226] to-[#090B16] border border-[#C8FF35]/30 space-y-2">
                <div className="text-[10px] text-[#C8FF35] uppercase font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C8FF35]" />
                  <span>5. WHAT HINDY LEARNED</span>
                </div>
                <p className="text-xs text-[#F5F3FF] leading-relaxed font-sans">
                  {inspectMemory.verdict === 'BenignPositive' || inspectMemory.verdict === 'Benign'
                    ? `Activity matching pattern "${inspectMemory.title}" on host ${inspectMemory.host || 'target host'} represents expected operational behavior when matching documented signals (e.g. authorized tickets, expected window, known devices). Context must be verified before suppressing alerts.`
                    : inspectMemory.verdict === 'TruePositive' || inspectMemory.verdict === 'Malicious'
                    ? `Activity matching pattern "${inspectMemory.title}" represents malicious or unauthorized behavior when signals deviate from expected operations (e.g. absence of authorized change ticket, unknown requester, untrusted destination). Must be escalated for tier-2 incident response.`
                    : `False positive detection pattern identified on ${inspectMemory.host || 'host'}. Baseline rules must consider detector sensitivity.`}
                </p>
              </div>

              {/* 6. CONNECTION TO INVESTIGATIONS */}
              <div className="p-4 rounded-xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-3">
                <div className="text-[10px] text-[#9D9BB6] uppercase font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    <span>6. USED IN REPLAY INVESTIGATIONS ({inspectMemory.related_investigations?.length || 0})</span>
                  </span>
                  <span className="text-[10px] text-[#B8A7FF]">Applied via Hindsight Recall</span>
                </div>

                {inspectMemory.related_investigations && inspectMemory.related_investigations.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[#9D9BB6] font-sans">
                      This retained experience was recalled by Hindy when analyzing the following active/replay alerts:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {inspectMemory.related_investigations.map((relId) => (
                        <button
                          key={relId}
                          onClick={() => {
                            if (onNavigateToInvestigation) {
                              setInspectMemory(null);
                              onNavigateToInvestigation(relId);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#111321] hover:bg-[#C8FF35] text-[#C8FF35] hover:text-[#090B16] border border-[#C8FF35]/30 hover:border-[#C8FF35] font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                        >
                          <span>{relId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[#9D9BB6] italic">
                    Not currently recalled in loaded replay batch, or serves as a foundational baseline memory.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#090B16] border-t border-[#B8A7FF]/15 flex items-center justify-between">
              <span className="text-[11px] text-[#9D9BB6] font-mono">
                "Remembers what the security team learned."
              </span>
              <button
                onClick={() => setInspectMemory(null)}
                className="px-4 py-2 rounded-xl bg-[#C8FF35] hover:bg-[#d6ff52] text-[#090B16] font-bold text-xs font-mono transition-all cursor-pointer"
              >
                Close Experience Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
