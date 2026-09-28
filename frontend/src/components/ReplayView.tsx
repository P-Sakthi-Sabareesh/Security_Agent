import React, { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import type { ReplayCache, ReplayEntry } from '../types';

interface ReplayViewProps {
  onOpenAlert: (entry: ReplayEntry) => void;
}

const API_BASE = 'http://127.0.0.1:8000';
const speedOptions = [1, 2, 5];

const stateLabel = (state: ReplayEntry['state']) => ({
  green: 'Low risk, quick-confirm',
  yellow: 'Review required',
  red: 'High risk',
}[state]);

export const ReplayView: React.FC<ReplayViewProps> = ({ onOpenAlert }) => {
  const [cache, setCache] = useState<ReplayCache | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE}/api/replay-cache`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).detail || 'Replay cache unavailable.');
        return res.json();
      })
      .then((data: ReplayCache) => setCache(data))
      .catch((fetchError: Error) => setError(fetchError.message));
  }, []);

  useEffect(() => {
    if (!isPlaying || !cache || visibleCount >= cache.entries.length) return;
    const timer = window.setTimeout(() => {
      setVisibleCount((count) => Math.min(count + 1, cache.entries.length));
    }, 1000 / speed);
    return () => window.clearTimeout(timer);
  }, [cache, isPlaying, speed, visibleCount]);

  const streamed = useMemo(
    () => cache?.entries.slice(0, visibleCount) ?? [],
    [cache, visibleCount],
  );
  const counters = useMemo(() => streamed.reduce((acc, entry) => {
    acc.processed += 1;
    acc[entry.state] += 1;
    if (entry.recalled_case_ids.length > 0) acc.recalled += 1;
    return acc;
  }, { processed: 0, recalled: 0, green: 0, yellow: 0, red: 0 }), [streamed]);

  const byDay = useMemo(() => {
    const days = new Map<string, { green: number; yellow: number; red: number }>();
    streamed.forEach((entry) => {
      const day = entry.timestamp.slice(0, 10);
      const values = days.get(day) ?? { green: 0, yellow: 0, red: 0 };
      values[entry.state] += 1;
      days.set(day, values);
    });
    return [...days.entries()];
  }, [streamed]);

  if (error) return <div className="p-6 text-sm text-rose-300">{error}</div>;
  if (!cache) return <div className="p-6 text-sm text-slate-400">Loading recorded replay…</div>;

  return (
    <main className="h-full overflow-y-auto p-4 md:p-6 space-y-5 bg-[#070b12]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-100">Replay days 21-30</h1>
          <p className="text-xs text-slate-400 mt-1">{cache.recorded_count} of {cache.total_replay_alerts} replay alerts recorded</p>
        </div>
        <span className="px-2 py-1 rounded border border-cyan-700/60 bg-cyan-950/50 text-cyan-300 text-xs font-mono">Recorded agent run</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setIsPlaying((playing) => !playing)} className="px-3 py-2 rounded bg-cyan-700 hover:bg-cyan-600 text-xs font-semibold text-white flex items-center gap-1.5">
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </button>
        <button onClick={() => { setIsPlaying(false); setVisibleCount(0); }} className="px-3 py-2 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 flex items-center gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
        <span className="ml-1 text-xs text-slate-400">Speed</span>
        {speedOptions.map((option) => <button key={option} onClick={() => setSpeed(option)} className={`px-2.5 py-1.5 rounded text-xs border ${speed === option ? 'border-cyan-500 bg-cyan-950 text-cyan-200' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>{option}x</button>)}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
        {[
          ['Alerts processed', counters.processed, 'text-slate-200'], ['Memory recalled', counters.recalled, 'text-cyan-300'],
          ['Green', counters.green, 'text-emerald-300'], ['Yellow', counters.yellow, 'text-amber-300'], ['Red', counters.red, 'text-rose-300'],
        ].map(([label, value, color]) => <div key={String(label)} className="p-3 rounded-lg border border-slate-800 bg-slate-900/70"><div className="text-slate-500">{label}</div><div className={`text-lg font-mono font-bold mt-1 ${color}`}>{value}</div></div>)}
      </div>
      <p className="text-xs text-slate-400">Memory reused: {counters.recalled} alerts where at least one past case was recalled.</p>

      <section className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 space-y-3">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-300">Recorded state counts by replay day</h2>
        {byDay.length === 0 ? <p className="text-xs text-slate-500">Start playback to display recorded daily counts.</p> : byDay.map(([day, counts]) => {
          const total = counts.green + counts.yellow + counts.red;
          return <div key={day} className="flex items-center gap-3 text-xs"><span className="w-20 font-mono text-slate-400">{day}</span><div className="flex h-3 flex-1 overflow-hidden rounded bg-slate-950">{(['green', 'yellow', 'red'] as const).map((state) => counts[state] > 0 && <span key={state} className={{ green: 'bg-emerald-500', yellow: 'bg-amber-500', red: 'bg-rose-500' }[state]} style={{ width: `${(counts[state] / total) * 100}%` }} />)}</div><span className="w-8 text-right text-slate-300">{total}</span></div>;
        })}
        {cache.recorded_count < cache.total_replay_alerts && <p className="text-[11px] text-slate-500">This recorded set is partial and may contain a higher share of suspicious alerts than a typical day.</p>}
      </section>

      <section className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="grid grid-cols-[72px_92px_minmax(150px,1fr)_100px_110px] gap-2 p-3 bg-slate-900 text-[10px] uppercase tracking-wider text-slate-500 min-w-[650px]">
          <span>Time</span><span>Alert</span><span>Title</span><span>Memory</span><span>State</span>
        </div>
        <div className="overflow-x-auto">
          {streamed.map((entry) => <button key={entry.alert_id} onClick={() => onOpenAlert(entry)} className="w-full min-w-[650px] grid grid-cols-[72px_92px_minmax(150px,1fr)_100px_110px] gap-2 p-3 text-left border-t border-slate-800 hover:bg-slate-900/80 text-xs">
            <span className="font-mono text-slate-400">{entry.timestamp.slice(11, 16)}</span><span className="font-mono text-cyan-300">{entry.alert_id}</span><span className="truncate text-slate-200">{entry.title}</span><span className="text-slate-400">{entry.recalled_case_ids.length ? `Memory recalled · ${entry.matches_count} / ${entry.matches_count + entry.differences_count} signals match` : 'No recall'}</span><span className={{ green: 'text-emerald-300', yellow: 'text-amber-300', red: 'text-rose-300' }[entry.state]}>{stateLabel(entry.state)}</span>
          </button>)}
        </div>
      </section>
    </main>
  );
};
