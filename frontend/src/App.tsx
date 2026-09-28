import { useState, useEffect } from 'react';
import type { AlertSummary, AlertDetail, AnalysisResult, HealthStatus, DecisionResponse, ReplayEntry, UserProfile } from './types';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './components/DashboardView';
import { InvestigationPage } from './components/InvestigationPage';
import { MemoryView } from './components/MemoryView';
import { Sidebar, type NavTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { PlaceholderView } from './components/PlaceholderView';
import { ReplayView } from './components/ReplayView';
import { EvaluationView } from './components/EvaluationView';
import { SettingsView } from './components/SettingsView';

const API_BASE = 'http://127.0.0.1:8000';

export function App() {
  // Session State
  const [token, setToken] = useState<string | null>(() => {
    return window.sessionStorage.getItem('hindy_auth_token') || null;
  });
  const [user, setUser] = useState<UserProfile | null>(() => {
    const raw = window.sessionStorage.getItem('hindy_user');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  });

  const isLoggedIn = Boolean(token && user);
  const analystName = user?.name || 'Priya Nair, SOC Analyst';
  const [activeNav, setActiveNav] = useState<NavTab>('dashboard');

  // Health & Reset
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetNotification, setResetNotification] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(() => window.localStorage.getItem('hindy-demo-mode') === 'true');

  // Alerts & Queue
  const [alerts, setAlerts] = useState<AlertSummary[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>('ALRT-00663');

  // Selected Alert Detail
  const [alertDetail, setAlertDetail] = useState<AlertDetail | null>(null);
  const [loadingAlertDetail, setLoadingAlertDetail] = useState(false);

  // Analysis State
  const [memoryAnalysis, setMemoryAnalysis] = useState<AnalysisResult | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [pendingReplayAnalysis, setPendingReplayAnalysis] = useState<AnalysisResult | null>(null);

  // Validate session token on mount
  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/api/auth/me?token=${encodeURIComponent(token)}`)
        .then((res) => {
          if (!res.ok) throw new Error('Session invalid');
          return res.json();
        })
        .then((userData: UserProfile) => {
          setUser(userData);
          window.sessionStorage.setItem('hindy_user', JSON.stringify(userData));
        })
        .catch(() => {
          // Invalidate expired session
          setToken(null);
          setUser(null);
          window.sessionStorage.removeItem('hindy_auth_token');
          window.sessionStorage.removeItem('hindy_user');
        });
    }
  }, [token]);

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

  useEffect(() => { window.localStorage.setItem('hindy-demo-mode', String(demoMode)); }, [demoMode]);

  // Fetch alerts when logged in
  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/alerts`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchAlerts();
    }
  }, [isLoggedIn]);

  // Fetch Alert Detail and load cached analysis if available
  useEffect(() => {
    if (!selectedAlertId) return;

    const fetchDetail = async () => {
      setLoadingAlertDetail(true);

      if (pendingReplayAnalysis?.alert_id === selectedAlertId) {
        setMemoryAnalysis(pendingReplayAnalysis);
      } else {
        setMemoryAnalysis(null);
      }

      try {
        const res = await fetch(`${API_BASE}/api/alerts/${selectedAlertId}`);
        if (res.ok) {
          const data = await res.json();
          setAlertDetail(data);
        }

        // Check if there is an existing recorded analysis for this alert in cache
        if (!pendingReplayAnalysis || pendingReplayAnalysis.alert_id !== selectedAlertId) {
          try {
            const cacheRes = await fetch(
              `${API_BASE}/api/analyze/${selectedAlertId}?mode=memory&cached_only=true`,
              { method: 'POST' }
            );
            if (cacheRes.ok) {
              const cacheData: AnalysisResult = await cacheRes.json();
              setMemoryAnalysis(cacheData);
            }
          } catch {
            // Not in cache, analyst can run analysis manually
          }
        }
      } catch (err) {
        console.error('Failed to fetch alert detail:', err);
      } finally {
        setLoadingAlertDetail(false);
      }
    };

    fetchDetail();
  }, [pendingReplayAnalysis, selectedAlertId]);

  // Handler: Login
  const handleLogin = (newUser: UserProfile, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    window.sessionStorage.setItem('hindy_auth_token', newToken);
    window.sessionStorage.setItem('hindy_user', JSON.stringify(newUser));
    setActiveNav('dashboard');
  };

  // Handler: Logout
  const handleLogout = async () => {
    if (token) {
      try {
        await fetch(`${API_BASE}/api/auth/logout?token=${encodeURIComponent(token)}`, { method: 'POST' });
      } catch {
        // Ignored
      }
    }
    setToken(null);
    setUser(null);
    window.sessionStorage.removeItem('hindy_auth_token');
    window.sessionStorage.removeItem('hindy_user');
    setActiveNav('dashboard');
  };

  // Handler: Update User Profile
  const handleUpdateUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    window.sessionStorage.setItem('hindy_user', JSON.stringify(updatedUser));
  };

  // Handler: Analyze with Hindy
  const handleAnalyze = async (bypassCache: boolean = false) => {
    if (!selectedAlertId) return;
    setLoadingAnalysis(true);

    try {
      const url = `${API_BASE}/api/analyze/${selectedAlertId}?mode=memory${bypassCache ? '&bypass_cache=true' : ''}${demoMode ? '&cached_only=true' : ''}`;
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

  // Handler: Decision confirmed
  const handleDecisionSuccess = (_resp: DecisionResponse) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === selectedAlertId ? { ...a, is_decided: true } : a))
    );
  };

  // Handler: Reset Demo Memory
  const handleResetDemo = async () => {
    setIsResetting(true);
    setResetNotification(null);
    try {
      const res = await fetch(`${API_BASE}/api/reset-demo${demoMode ? '?cached_only=true' : ''}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.detail || data.message || 'Reset failed.');
      }
      setResetNotification(data.message || 'Local demo memory reset.');
      fetchAlerts();

      setTimeout(() => {
        setResetNotification(null);
      }, 4000);
    } catch (err) {
      console.error('Reset demo error:', err);
      setResetNotification(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenReplayAlert = (entry: ReplayEntry) => {
    setPendingReplayAnalysis(entry.analysis);
    setSelectedAlertId(entry.alert_id);
    setActiveNav('investigation');
  };

  // Protected route guard: if not authenticated, render Login/Sign-Up portal
  if (!isLoggedIn) {
    return <LoginModal onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-screen bg-[#070b12] text-slate-200 overflow-hidden font-sans">
      {/* 1. Left Sidebar */}
      <Sidebar currentTab={activeNav} onSelectTab={setActiveNav} />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Header Bar (Rendered on non-Dashboard workspace tabs) */}
        {activeNav !== 'dashboard' && (
          <TopBar
            user={user}
            analystName={analystName}
            health={health}
            onResetDemo={handleResetDemo}
            isResetting={isResetting}
            resetNotification={resetNotification}
            demoMode={demoMode}
            onDemoModeChange={setDemoMode}
            onNavigateSettings={() => setActiveNav('settings')}
            onLogout={handleLogout}
          />
        )}

        {/* Workspace Body */}
        <div className="flex-1 min-h-0">
          {activeNav === 'dashboard' ? (
            <DashboardView
              alerts={alerts}
              health={health}
              user={user}
              analystName={analystName}
              demoMode={demoMode}
              onDemoModeChange={setDemoMode}
              onResetDemo={handleResetDemo}
              isResetting={isResetting}
              resetNotification={resetNotification}
              onNavigateToAlerts={(alertId) => {
                if (alertId) {
                  setSelectedAlertId(alertId);
                }
                setActiveNav('investigation');
              }}
              onNavigateSettings={() => setActiveNav('settings')}
              onLogout={handleLogout}
            />
          ) : activeNav === 'investigation' ? (
            <InvestigationPage
              alert={alertDetail}
              summary={alerts.find(a => a.id === selectedAlertId)}
              loadingAlert={loadingAlertDetail}
              loadingAnalysis={loadingAnalysis}
              analysis={memoryAnalysis}
              onAnalyze={() => handleAnalyze(false)}
              onBackToDashboard={() => setActiveNav('dashboard')}
              onNavigateToMemory={() => setActiveNav('memory')}
              cachedOnly={demoMode}
              onDecisionSuccess={handleDecisionSuccess}
            />
          ) : activeNav === 'memory' ? (
            <MemoryView
              onNavigateToInvestigation={(alertId) => {
                setSelectedAlertId(alertId);
                setActiveNav('investigation');
              }}
              onNavigateToActiveInvestigation={() => {
                setActiveNav('investigation');
              }}
            />
          ) : activeNav === 'replay' ? (
            <ReplayView
              onOpenAlert={handleOpenReplayAlert}
              onNavigateToMemory={(_memoryId) => {
                setActiveNav('memory');
              }}
            />
          ) : activeNav === 'evaluation' ? (
            <EvaluationView />
          ) : activeNav === 'settings' ? (
            <SettingsView
              user={user}
              token={token}
              onUpdateUser={handleUpdateUser}
            />
          ) : (
            <PlaceholderView tab={activeNav} onBackToAlerts={() => setActiveNav('dashboard')} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
