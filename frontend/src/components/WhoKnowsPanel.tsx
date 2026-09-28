import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import type { AlertDetail, WhoKnowsResponse } from '../types';

interface WhoKnowsPanelProps { alert: AlertDetail; }
const API_BASE = '';

export const WhoKnowsPanel: React.FC<WhoKnowsPanelProps> = ({ alert }) => {
  const [data, setData] = useState<WhoKnowsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/who-knows/${alert.alert_id}`)
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).detail || 'Similar-history lookup unavailable.');
        return response.json();
      })
      .then((response: WhoKnowsResponse) => {
        if (!cancelled) {
          setData(response);
          setError(null);
        }
      })
      .catch((fetchError: Error) => {
        if (!cancelled) setError(fetchError.message);
      });
    return () => { cancelled = true; };
  }, [alert.alert_id]);

  return <section className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-3">
    <div className="flex items-center gap-2"><Users className="w-4 h-4 text-cyan-400" /><h3 className="text-xs uppercase tracking-wider font-semibold text-slate-200">Who knows this?</h3></div>
    <p className="text-[11px] text-slate-400">Historical cases with the same title and host.</p>
    {error && <p className="text-xs text-rose-300">{error}</p>}
    {!data && !error && <p className="text-xs text-slate-500">Loading similar historical cases…</p>}
    {data?.analysts.length === 0 && <p className="text-xs text-slate-500">No similar historical cases</p>}
    {data?.analysts.map((item) => <div key={item.analyst} className="grid grid-cols-[minmax(0,1fr)_40px_140px] gap-2 text-xs border-t border-slate-800 pt-2"><span className="truncate text-slate-200">{item.analyst}</span><span className="text-cyan-300 text-right">{item.count}</span><span className="font-mono text-right text-slate-400">{item.last_case_date || 'No date recorded'}</span></div>)}
  </section>;
};
