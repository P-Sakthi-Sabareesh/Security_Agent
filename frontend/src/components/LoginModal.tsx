import React, { useState, useEffect } from 'react';
import { HindyAvatar } from './HindyAvatar';
import { Shield, KeyRound, User, Activity } from 'lucide-react';
import type { HealthStatus } from '../types';

interface LoginModalProps {
  onLogin: (analystName: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin }) => {
  const [analystId, setAnalystId] = useState('analyst.priya');
  const [password, setPassword] = useState('demo');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/health')
      .then((res) => res.json())
      .then((data: HealthStatus) => {
        setHealth(data);
        setIsCheckingHealth(false);
      })
      .catch((err) => {
        console.warn('Health check error:', err);
        setHealth(null);
        setIsCheckingHealth(false);
      });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin('Priya Nair, SOC Analyst');
  };

  const isMemoryOnline = health?.memory_core_online === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070A10]/90 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-[#0F172A] shadow-2xl shadow-cyan-950/40 p-8">
        {/* Glow ambient circle */}
        <div className="absolute -top-20 -left-20 w-44 h-44 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-44 h-44 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <HindyAvatar size={64} glow={true} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Hindy</h1>
          <p className="text-sm text-slate-400">Remember what your security team learned.</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Analyst ID
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={analystId}
                onChange={(e) => setAnalystId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#070A10] border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors font-mono"
                placeholder="analyst.name"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative flex items-center">
              <KeyRound className="absolute left-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#070A10] border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors font-mono"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-6 py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/30 hover:shadow-cyan-700/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            ENTER SOC WORKSPACE
          </button>
        </form>

        {/* Memory Core Status Footer */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs">
          {isCheckingHealth ? (
            <span className="text-slate-500 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 animate-spin" />
              Connecting...
            </span>
          ) : isMemoryOnline ? (
            <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
              ● Memory Core Online
            </span>
          ) : (
            <span className="text-slate-500 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-500" />
              Connecting...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
