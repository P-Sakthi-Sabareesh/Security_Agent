import React, { useState } from 'react';
import { Clipboard, FileText } from 'lucide-react';
import type { AnalysisResult, AlertDetail, IncidentSummaryResponse } from '../types';

interface IncidentSummaryPanelProps { alert: AlertDetail; analysis: AnalysisResult; cachedOnly: boolean; }
const API_BASE = '';

export const IncidentSummaryPanel: React.FC<IncidentSummaryPanelProps> = ({ alert, analysis, cachedOnly }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/incident-summary/${alert.alert_id}${cachedOnly ? '?cached_only=true' : ''}`);
      if (!response.ok) throw new Error((await response.json()).detail || 'Incident summary unavailable.');
      const data: IncidentSummaryResponse = await response.json();
      setSummary(data.summary);
    } catch (fetchError) { setError(fetchError instanceof Error ? fetchError.message : 'Incident summary unavailable.'); }
  };

  const copy = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
  };

  if (!['yellow', 'red'].includes(analysis.state)) return null;
  return <section className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-3">
    <div className="flex flex-wrap justify-between items-center gap-2"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-cyan-400" /><h3 className="text-xs uppercase tracking-wider font-semibold text-slate-200">Incident summary</h3></div><button onClick={generate} className="px-3 py-1.5 rounded bg-cyan-700 hover:bg-cyan-600 text-xs font-semibold text-white">Generate incident summary</button></div>
    {error && <p className="text-xs text-rose-300">{error}</p>}
    {summary && <><textarea readOnly value={summary} rows={12} className="w-full p-3 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono" /><button onClick={copy} className="px-3 py-1.5 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 flex items-center gap-1.5"><Clipboard className="w-3.5 h-3.5" />{copied ? 'Copied' : 'Copy summary'}</button></>}
  </section>;
};
