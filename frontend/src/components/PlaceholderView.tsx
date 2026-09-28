import React from 'react';
import { Database, RotateCcw, BarChart3, Construction } from 'lucide-react';
import type { NavTab } from './Sidebar';

interface PlaceholderViewProps {
  tab: NavTab;
  onBackToAlerts: () => void;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({ tab, onBackToAlerts }) => {
  const getTabInfo = () => {
    switch (tab) {
      case 'memory':
        return {
          title: 'Memory Bank Management',
          icon: Database,
          desc: 'Explore, inspect, and manage retained historical security investigation experiences across Hindsight Cloud.',
        };
      case 'replay':
        return {
          title: 'Alert Replay Simulation',
          icon: RotateCcw,
          desc: 'Simulate high-throughput automated alert pipelines and test real-time security decision streaming.',
        };
      case 'evaluation':
        return {
          title: 'Benchmark & Evaluation Suite',
          icon: BarChart3,
          desc: 'Side-by-side comparative accuracy benchmarks, false-green metrics, and baseline validation.',
        };
      default:
        return {
          title: 'Feature',
          icon: Construction,
          desc: 'This feature is part of the roadmap.',
        };
    }
  };

  const info = getTabInfo();
  const Icon = info.icon;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0B0F17] h-full">
      <div className="max-w-md p-8 rounded-2xl border border-slate-800 bg-[#0F172A]/80 shadow-2xl shadow-cyan-950/20 backdrop-blur-md">
        <div className="w-16 h-16 rounded-2xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center mx-auto mb-5 text-cyan-400 shadow-lg shadow-cyan-950/50">
          <Icon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{info.title}</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">{info.desc}</p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 mb-6">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Coming in the next build
        </div>
        <div>
          <button
            onClick={onBackToAlerts}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
          >
            ← Back to Active Alerts Queue
          </button>
        </div>
      </div>
    </div>
  );
};
