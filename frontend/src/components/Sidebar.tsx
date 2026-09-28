import React from 'react';
import { HindyAvatar } from './HindyAvatar';
import { Bell, Database, RotateCcw, BarChart3, ShieldCheck } from 'lucide-react';

export type NavTab = 'alerts' | 'memory' | 'replay' | 'evaluation';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navItems = [
    { id: 'alerts' as NavTab, label: 'Alerts', icon: Bell, badge: 'Active' },
    { id: 'memory' as NavTab, label: 'Memory', icon: Database },
    { id: 'replay' as NavTab, label: 'Replay', icon: RotateCcw },
    { id: 'evaluation' as NavTab, label: 'Evaluation', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-[#070A10] border-r border-slate-800/80 flex flex-col flex-shrink-0 h-screen select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800/80">
        <HindyAvatar size={34} glow={true} />
        <div>
          <div className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            Hindy
            <span className="text-[10px] font-mono bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-800/50">
              v1.0
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">SOC Memory Agent</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-6 space-y-1.5">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          SOC Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-cyan-400' : 'text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Tagline */}
      <div className="p-4 border-t border-slate-800/80 bg-[#0B0F17]/50">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-300">Memory Engine</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed italic">
          "Remembers everything. Verifies before trusting."
        </p>
      </div>
    </aside>
  );
};
