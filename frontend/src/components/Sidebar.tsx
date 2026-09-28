import React from 'react';
import { HindyAvatar, HindySidebarBot } from './HindyAvatar';
import { 
  LayoutDashboard, 
  ShieldAlert, 
  Database, 
  RotateCcw, 
  BarChart3, 
  ShieldCheck,
  ChevronDown,
  Settings as SettingsIcon
} from 'lucide-react';

export type NavTab = 'dashboard' | 'investigation' | 'memory' | 'replay' | 'evaluation' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const isInvestigationSectionActive = currentTab === 'investigation' || currentTab === 'memory';

  return (
    <aside className="w-64 bg-[#090B16] border-r border-[#B8A7FF]/15 flex flex-col flex-shrink-0 h-screen select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-[#B8A7FF]/15">
        <HindyAvatar size={34} glow={true} />
        <div>
          <div className="text-base font-bold tracking-tight text-[#F5F3FF] flex items-center gap-1.5">
            Hindy
            <span className="text-[10px] font-mono bg-[#C8FF35]/15 text-[#C8FF35] px-1.5 py-0.5 rounded border border-[#C8FF35]/30">
              v2.4
            </span>
          </div>
          <div className="text-[11px] text-[#9D9BB6] font-mono">SOC MEMORY AGENT</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-5 space-y-2 overflow-y-auto">
        <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#9D9BB6]/70 font-mono">
          SOC Workspace
        </div>

        {/* 1. Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            currentTab === 'dashboard'
              ? 'bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30 shadow-[0_0_15px_rgba(200,255,53,0.15)] font-semibold'
              : 'text-[#9D9BB6] hover:text-[#F5F3FF] hover:bg-[#111321] border border-transparent'
          }`}
        >
          <div className="flex items-center gap-3">
            <LayoutDashboard className={`w-4 h-4 ${currentTab === 'dashboard' ? 'text-[#C8FF35]' : 'text-[#9D9BB6]'}`} />
            <span>Dashboard</span>
          </div>
        </button>

        {/* 2. Investigations Section */}
        <div className="space-y-1">
          {/* Main Investigations Button (Clickable -> 'investigation') */}
          <button
            onClick={() => onSelectTab('investigation')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              currentTab === 'investigation'
                ? 'bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30 shadow-[0_0_15px_rgba(200,255,53,0.15)] font-semibold'
                : isInvestigationSectionActive
                ? 'text-[#F5F3FF] bg-[#111321]/60 border border-[#B8A7FF]/20'
                : 'text-[#9D9BB6] hover:text-[#F5F3FF] hover:bg-[#111321] border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className={`w-4 h-4 ${isInvestigationSectionActive ? 'text-[#C8FF35]' : 'text-[#9D9BB6]'}`} />
              <span>Investigations</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#9D9BB6]/70" />
          </button>

          {/* Sub-item under Investigations: Memory */}
          <div className="pl-4 pr-1 py-0.5 space-y-1 border-l-2 border-[#B8A7FF]/20 ml-5">
            <button
              onClick={() => onSelectTab('memory')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                currentTab === 'memory'
                  ? 'bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30 font-semibold shadow-sm'
                  : 'text-[#9D9BB6] hover:text-[#F5F3FF] hover:bg-[#111321] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <Database className={`w-3.5 h-3.5 ${currentTab === 'memory' ? 'text-[#C8FF35]' : 'text-[#9D9BB6]'}`} />
                <span>Memory</span>
              </div>
            </button>
          </div>
        </div>

        {/* 3. Replay */}
        <button
          onClick={() => onSelectTab('replay')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            currentTab === 'replay'
              ? 'bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30 shadow-[0_0_15px_rgba(200,255,53,0.15)] font-semibold'
              : 'text-[#9D9BB6] hover:text-[#F5F3FF] hover:bg-[#111321] border border-transparent'
          }`}
        >
          <div className="flex items-center gap-3">
            <RotateCcw className={`w-4 h-4 ${currentTab === 'replay' ? 'text-[#C8FF35]' : 'text-[#9D9BB6]'}`} />
            <span>Replay</span>
          </div>
        </button>

        {/* 4. Evaluation */}
        <button
          onClick={() => onSelectTab('evaluation')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            currentTab === 'evaluation'
              ? 'bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30 shadow-[0_0_15px_rgba(200,255,53,0.15)] font-semibold'
              : 'text-[#9D9BB6] hover:text-[#F5F3FF] hover:bg-[#111321] border border-transparent'
          }`}
        >
          <div className="flex items-center gap-3">
            <BarChart3 className={`w-4 h-4 ${currentTab === 'evaluation' ? 'text-[#C8FF35]' : 'text-[#9D9BB6]'}`} />
            <span>Evaluation</span>
          </div>
        </button>

        {/* 5. Settings */}
        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            currentTab === 'settings'
              ? 'bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30 shadow-[0_0_15px_rgba(200,255,53,0.15)] font-semibold'
              : 'text-[#9D9BB6] hover:text-[#F5F3FF] hover:bg-[#111321] border border-transparent'
          }`}
        >
          <div className="flex items-center gap-3">
            <SettingsIcon className={`w-4 h-4 ${currentTab === 'settings' ? 'text-[#C8FF35]' : 'text-[#9D9BB6]'}`} />
            <span>Settings</span>
          </div>
        </button>
      </div>

      {/* Footer 3D Hindy & Memory Engine */}
      <div className="px-4 py-3 border-t border-[#B8A7FF]/15 bg-[#070A10]/95 flex flex-col items-center">
        <HindySidebarBot />
        <div className="flex items-center gap-2 text-xs text-[#9D9BB6] mb-1 justify-center mt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C8FF35]" />
          <span className="font-semibold text-[#F5F3FF]">Memory Engine</span>
        </div>
        <p className="text-[10.5px] text-[#9D9BB6]/90 leading-relaxed italic font-sans text-center">
          "Remembers everything. Verifies before trusting."
        </p>
      </div>
    </aside>
  );
};


