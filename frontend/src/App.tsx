import { useState, useEffect } from 'react';
import type { AlertSummary, AlertDetail, AnalysisResult, HealthStatus, DecisionResponse, DemoPair } from './types';
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

  // Health & Reset
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetNotification, setResetNotification] = useState<string | null>(null);

  // Demo Pair
  const [demoPair, setDemoPair] = useState<DemoPair | null>(null);

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

  // Learning Pair Specific Baseline Analysis for ALRT-00687
  const [beforeLearningAnalysis, setBeforeLearningAnalysis] = useState<AnalysisResult | null>(null);

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

  // Fetch Demo Pair metadata
  useEffect(() => {
    fetch(`${API_BASE}/api/demo-pair`)
      .then((res) => res.json())
      .then((data: DemoPair) => setDemoPair(data))
      .catch(() => setDemoPair(null));
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
  const handleAnalyze = async (bypassCache: boolean = false) => {
    if (!selectedAlertId) return;
    setLoadingAnalysis(true);

    try {
      const url = `${API_BASE}/api/analyze/${selectedAlertId}?mode=memory${bypassCache ? '&bypass_cache=true' : ''}`;
      const res = await fetch(url, { method: 'POST' });

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

  // Handler: Decision confirmed
  const handleDecisionSuccess = (_resp: DecisionResponse) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === selectedAlertId ? { ...a, is_decided: true } : a))
    );
  };

  // Handler: Escalate to Tier 2 (Demo UI status only)
  const handleEscalate = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, is_escalated: true } : a))
    );
  };

  // Handler: Reset Demo Memory
  const handleResetDemo = async () => {
    setIsResetting(true);
    setResetNotification(null);
    try {
      await fetch(`${API_BASE}/api/reset-demo`, { method: 'POST' });
      setResetNotification('Local demo memory reset.');
      setBeforeLearningAnalysis(null);
      fetchAlerts();

      setTimeout(() => {
        setResetNotification(null);
      }, 4000);
    } catch (err) {
      console.error('Reset demo error:', err);
      setResetNotification('Reset failed.');
    } finally {
      setIsResetting(false);
    }
  };

  // Handler: Navigate to next similar alert in learning pair (ALRT-00687)
  const handleNavigateNextSimilar = async () => {
    const secondId = demoPair?.second_alert_id || 'ALRT-00687';

    // 1. Capture baseline for before panel if not already captured
    if (!beforeLearningAnalysis) {
      // Pre-learning baseline was state: yellow, best_match ALRT-00137
      setBeforeLearningAnalysis({
        alert_id: secondId,
        memory_used: true,
        state: 'yellow',
        recommended_action: 'Perform manual verification',
        reasons: ['Context differences detected with historical baseline ALRT-00137'],
        explanation: 'Baseline investigation without live human override memory.',
        safety_overrides: [],
        recalled_cases: [],
        best_match_id: 'ALRT-00137',
        best_match: {
          alert_id: 'ALRT-00137',
          title: 'Multiple failed sign-in attempts',
          category: 'CredentialAccess',
          severity: 'Low',
          host: 'LT-0037',
          user: 'anjali.singh',
          verdict: 'FalsePositive',
          outcome: 'Closed - benign user behavior',
          investigation_note: 'User typo in password.',
          analyst: 'A03 Manoj Singh',
          matches: ['single_account', 'source_country_normal', 'then_success'],
          differences: [
            { signal: 'user', past: 'anjali.singh', current: 'deepa.joshi', is_key_signal: false },
            { signal: 'host', past: 'LT-0037', current: 'LT-0056', is_key_signal: false },
          ],
          key_difference_count: 0,
          total_difference_count: 2,
        },
        llm_result: {
          state: 'yellow',
          reasons: ['Context differences detected with baseline'],
          recalled_case_ids: ['ALRT-00137'],
          recommended_action: 'Manual review',
          explanation: 'Baseline investigation without live human override memory.',
        },
        models_tried: ['openai/gpt-oss-120b'],
      });
    }

    // 2. Select ALRT-00687
    setSelectedAlertId(secondId);

    // 3. Poll recall for live memory ALRT-00602-live (timeout 30s)
    setLoadingAnalysis(true);
    const startTime = Date.now();
    let pollCount = 0;

    const pollRecall = async () => {
      pollCount++;
      try {
        const res = await fetch(`${API_BASE}/api/analyze/${secondId}?mode=memory&bypass_cache=true`, {
          method: 'POST',
        });
        if (res.ok) {
          const result: AnalysisResult = await res.json();
          const hasLiveRecall = result.recalled_cases?.some((c) => c.alert_id === 'ALRT-00602-live') ||
                                result.best_match_id === 'ALRT-00602-live';

          if (hasLiveRecall || (Date.now() - startTime > 30000)) {
            setMemoryAnalysis(result);
            setLoadingAnalysis(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Polling recall error:', err);
      }

      if (Date.now() - startTime < 30000) {
        setTimeout(pollRecall, 3000);
      } else {
        setLoadingAnalysis(false);
      }
    };

    setTimeout(pollRecall, 1000);
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

  const currentAlertInQueue = alerts.find((a) => a.id === selectedAlertId);
  const isCurrentDecided = currentAlertInQueue?.is_decided ?? false;
  const isCurrentEscalated = currentAlertInQueue?.is_escalated ?? false;

  const isFirstLearningPair = selectedAlertId === (demoPair?.first_alert_id || 'ALRT-00602');
  const isSecondLearningPair = selectedAlertId === (demoPair?.second_alert_id || 'ALRT-00687');

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
          onResetDemo={handleResetDemo}
          isResetting={isResetting}
          resetNotification={resetNotification}
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
                  onAnalyze={() => handleAnalyze(false)}
                  onToggleNoMemory={handleToggleNoMemory}
                  showNoMemory={showNoMemory}
                  highlightedSection={highlightedSection}
                  isDecided={isCurrentDecided}
                  isEscalated={isCurrentEscalated}
                  isFirstLearningPair={isFirstLearningPair}
                  isSecondLearningPair={isSecondLearningPair}
                  beforeLearningAnalysis={beforeLearningAnalysis}
                  onDecisionSuccess={handleDecisionSuccess}
                  onEscalate={handleEscalate}
                  onNavigateNextSimilar={isFirstLearningPair ? handleNavigateNextSimilar : undefined}
                />
              </div>

              {/* Right Column: Hindy Agent Panel */}
              <div className="col-span-12 md:col-span-3 lg:col-span-3 h-full overflow-hidden">
                <HindyPanel
                  alertId={selectedAlertId}
                  hasAnalysis={memoryAnalysis !== null}
                  analysis={memoryAnalysis}
                  onAction={handleHindyPanelAction}
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
