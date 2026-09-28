import { useState, useEffect } from 'react';
import type { AlertSummary, AlertDetail, AnalysisResult, HealthStatus } from './types';
import { LoginModal } from './components/LoginModal';
import { Sidebar, type NavTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AlertQueue } from './components/AlertQueue';
import { InvestigationView } from './components/InvestigationView';
import { HindyPanel } from './components/HindyPanel';
import { PlaceholderView } from './components/PlaceholderView';

const API_BASE = 'http://127.0.0.1:8000';

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [analystName, setAnalystName] = useState('Priya Nair, SOC Analyst');
  const [activeNav, setActiveNav] = useState<NavTab>('alerts');

  // Health
  const [health, setHealth] = useState<HealthStatus | null>(null);

  // Alerts & Queue
  const [alerts, setAlerts] = useState<AlertSummary[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>('ALRT-00663');

  // Selected Alert Detail
  const [alertDetail, setAlertDetail] = useState<AlertDetail | null>(null);
  const [loadingAlertDetail, setLoadingAlertDetail] = useState(false);

  // Analysis State
  const [memoryAnalysis, setMemoryAnalysis] = useState<AnalysisResult | null>(null);
  const [noMemoryAnalysis, setNoMemoryAnalysis] = useState<AnalysisResult | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingNoMemory, setLoadingNoMemory] = useState(false);
  const [showNoMemory, setShowNoMemory] = useState(false);

  // Highlighted section in InvestigationView
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

  // Fetch Health on mount and periodically
  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        setHealth(null);
      }
    } catch {
      setHealth(null);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch alerts when logged in
  const fetchAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const res = await fetch(`${API_BASE}/api/alerts`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchAlerts();
    }
  }, [isLoggedIn]);

  // Fetch Alert Detail when selectedAlertId changes
  useEffect(() => {
    if (!selectedAlertId) return;

    const fetchDetail = async () => {
      setLoadingAlertDetail(true);
      setMemoryAnalysis(null);
      setNoMemoryAnalysis(null);
      setShowNoMemory(false);

      try {
        const res = await fetch(`${API_BASE}/api/alerts/${selectedAlertId}`);
        if (res.ok) {
          const data = await res.json();
          setAlertDetail(data);
        }
      } catch (err) {
        console.error('Failed to fetch alert detail:', err);
      } finally {
        setLoadingAlertDetail(false);
      }
    };

    fetchDetail();
  }, [selectedAlertId]);

  // Handler: Analyze with Hindy
  const handleAnalyze = async () => {
    if (!selectedAlertId) return;
    setLoadingAnalysis(true);

    try {
      const res = await fetch(`${API_BASE}/api/analyze/${selectedAlertId}?mode=memory`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || 'Reasoning engine unavailable');
        return;
      }

      const data: AnalysisResult = await res.json();
      setMemoryAnalysis(data);

      // Update state dot in queue list
      setAlerts((prev) =>
        prev.map((a) => (a.id === selectedAlertId ? { ...a, cached_state: data.state } : a))
      );
    } catch (err) {
      console.error('Analysis error:', err);
      alert('Reasoning engine unavailable');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Handler: Toggle No-Memory Comparison
  const handleToggleNoMemory = async (enabled: boolean) => {
    setShowNoMemory(enabled);
    if (enabled && !noMemoryAnalysis && selectedAlertId) {
      setLoadingNoMemory(true);
      try {
        const res = await fetch(`${API_BASE}/api/analyze/${selectedAlertId}?mode=nomemory`, {
          method: 'POST',
        });
        if (res.ok) {
          const data = await res.json();
          setNoMemoryAnalysis(data);
        } else {
          setNoMemoryAnalysis(null);
        }
      } catch (err) {
        console.error('Failed to run no-memory analysis:', err);
        setNoMemoryAnalysis(null);
      } finally {
        setLoadingNoMemory(false);
      }
    }
  };

  // Handler: Hindy Panel quick buttons
  const handleHindyPanelAction = (action: 'reasoning' | 'differences' | 'previous') => {
    let targetId = '';
    if (action === 'reasoning') targetId = 'hindy-reasoning';
    if (action === 'differences') targetId = 'context-diff';
    if (action === 'previous') targetId = 'memory-trail';

    setHighlightedSection(targetId);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setTimeout(() => {
      setHighlightedSection(null);
    }, 2500);
  };

  if (!isLoggedIn) {
    return (
      <LoginModal
        onLogin={(analyst) => {
          setIsLoggedIn(true);
          setAnalystName(analyst);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#070b12] text-slate-200 overflow-hidden font-sans">
      {/* 1. Left Sidebar */}
      <Sidebar currentTab={activeNav} onSelectTab={setActiveNav} />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Header Bar */}
        <TopBar
          analystName={analystName}
          health={health}
        />

        {/* Workspace Body */}
        <div className="flex-1 min-h-0">
          {activeNav === 'alerts' ? (
            <div className="grid grid-cols-12 h-full">
              {/* Left Column: Alert Queue */}
              <div className="col-span-12 md:col-span-3 lg:col-span-3 h-full overflow-hidden">
                <AlertQueue
                  alerts={alerts}
                  selectedAlertId={selectedAlertId}
                  onSelectAlert={setSelectedAlertId}
                  loading={loadingAlerts}
                />
              </div>

              {/* Center Column: Investigation View */}
              <div className="col-span-12 md:col-span-6 lg:col-span-6 h-full overflow-hidden border-r border-slate-800/80">
                <InvestigationView
                  alert={alertDetail}
                  loadingAlert={loadingAlertDetail}
                  memoryAnalysis={memoryAnalysis}
                  noMemoryAnalysis={noMemoryAnalysis}
                  loadingAnalysis={loadingAnalysis}
                  loadingNoMemory={loadingNoMemory}
                  onAnalyze={handleAnalyze}
                  onToggleNoMemory={handleToggleNoMemory}
                  showNoMemory={showNoMemory}
                  highlightedSection={highlightedSection}
                />
              </div>

              {/* Right Column: Hindy Agent Panel */}
              <div className="col-span-12 md:col-span-3 lg:col-span-3 h-full overflow-hidden">
                <HindyPanel
                  onAction={handleHindyPanelAction}
                  hasAnalysis={memoryAnalysis !== null}
                />
              </div>
            </div>
          ) : (
            <PlaceholderView tab={activeNav} onBackToAlerts={() => setActiveNav('alerts')} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
