import React, { useEffect, useState } from 'react';
import type { EvaluationMetrics, EvaluationSummary } from '../types';

const API_BASE = 'http://127.0.0.1:8000';
const metrics = [
  ['Sample size', 'sample_size'], ['Failed / fallback', 'failed_or_fallback_count'], ['False greens', 'false_greens_count'], ['Attacks caught', 'attacks_caught'], ['Unnecessary escalations', 'unnecessary_escalations'], ['Human-review load', 'human_review_count'], ['Average time (s)', 'average_time_seconds'],
] as const;

export const EvaluationView: React.FC = () => {
  const [summaries, setSummaries] = useState<Record<string, EvaluationSummary>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all(['v1', 'v2', 'v2b'].map(async (version) => {
      const response = await fetch(`${API_BASE}/api/evaluation?version=${version}`);
      if (response.status === 404) return [version, null] as const;
      if (!response.ok) throw new Error((await response.json()).detail || 'Evaluation unavailable.');
      return [version, await response.json() as EvaluationSummary] as const;
    })).then((rows) => setSummaries(Object.fromEntries(rows.filter((row): row is readonly [string, EvaluationSummary] => row[1] !== null)))).catch((fetchError: Error) => setError(fetchError.message));
  }, []);

  if (error) return <div className="p-6 text-sm text-rose-300">{error}</div>;
  const v1 = summaries.v1;
  const v2 = summaries.v2;
  if (!v1 || !v2) return <div className="p-6 text-sm text-slate-400">Run scripts/evaluate.py first.</div>;
  const columns: Array<[string, EvaluationMetrics | undefined]> = [
    ['V1 memory', v1.metrics.v1_memory_mode], ['V1 no-memory', v1.metrics.v1_no_memory_mode], ['V2 memory', v2.metrics.v2_memory_mode], ['V2 no-memory', v2.metrics.v2_no_memory_mode],
  ];
  const scenarioRows = Object.keys(v2.metrics.v2_memory_mode?.scenario_breakdown ?? {});

  return <main className="h-full overflow-y-auto p-4 md:p-6 space-y-5 bg-[#070b12]">
    <div><h1 className="text-lg font-bold text-slate-100">Evaluation</h1><p className="text-xs text-slate-400 mt-1">Saved V1 and V2 evaluation summaries; no recomputation.</p></div>
    <section className="p-4 rounded-xl border border-amber-700/50 bg-amber-950/20 text-xs text-amber-100 space-y-2">
      <h2 className="font-semibold uppercase tracking-wider text-amber-300">How to read this</h2>
      <ol className="list-decimal pl-4 space-y-1 text-amber-100/90">
        <li>Measured on a synthetic dataset simulation, 94 replay alerts (10 attacks, 44 look-alikes, 40 benign, seed 42).</li>
        <li>V2 rules were designed after analysing V1 failures on the same sample. This is not a held-out test.</li>
        <li>V2 no-memory partly ran on smaller fallback models after the Groq quota ran out, so the memory vs no-memory comparison is confounded.</li>
        <li>Memory-mode had more unnecessary escalations on benign alerts (see table). The sample contains 57% dangerous alerts, so review load is not a real-world rate.</li>
      </ol>
    </section>
    <section className="rounded-xl border border-slate-800 overflow-x-auto"><table className="w-full min-w-[760px] text-xs"><thead className="bg-slate-900 text-slate-400"><tr><th className="p-3 text-left">Measure</th>{columns.map(([label]) => <th key={label} className="p-3 text-right">{label}</th>)}</tr></thead><tbody>{metrics.map(([label, key]) => <tr key={key} className="border-t border-slate-800"><td className="p-3 text-slate-300">{label}</td>{columns.map(([columnLabel, values]) => <td key={columnLabel} className="p-3 text-right font-mono text-slate-200">{key === 'failed_or_fallback_count' ? (values?.failed_or_fallback_count ?? ((values?.failures_count ?? 0) + (values?.fallback_rule_count ?? 0))) : values?.[key]}</td>)}</tr>)}</tbody></table></section>
    <section className="rounded-xl border border-slate-800 overflow-x-auto"><div className="p-4 border-b border-slate-800"><h2 className="text-xs uppercase tracking-wider font-semibold text-slate-300">V2 per-scenario breakdown</h2></div><table className="w-full min-w-[700px] text-xs"><thead className="bg-slate-900 text-slate-500"><tr><th className="p-3 text-left">Scenario</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Green</th><th className="p-3 text-right">Yellow</th><th className="p-3 text-right">Red</th><th className="p-3 text-right">Memory false greens</th><th className="p-3 text-right">No-memory false greens</th></tr></thead><tbody>{scenarioRows.map((scenario) => { const memory = v2.metrics.v2_memory_mode.scenario_breakdown[scenario]; const noMemory = v2.metrics.v2_no_memory_mode.scenario_breakdown[scenario]; return <tr key={scenario} className="border-t border-slate-800"><td className="p-3 text-slate-300">{scenario.replaceAll('_', ' ')}</td><td className="p-3 text-right">{memory.total}</td><td className="p-3 text-right text-emerald-300">{memory.green}</td><td className="p-3 text-right text-amber-300">{memory.yellow}</td><td className="p-3 text-right text-rose-300">{memory.red}</td><td className="p-3 text-right">{memory.false_greens}</td><td className="p-3 text-right">{noMemory?.false_greens ?? '—'}</td></tr>; })}</tbody></table></section>
  </main>;
};
