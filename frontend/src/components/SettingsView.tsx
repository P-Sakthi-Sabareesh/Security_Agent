import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  Award, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Lock
} from 'lucide-react';
import type { UserProfile } from '../types';

const API_BASE = 'http://127.0.0.1:8000';

interface SettingsViewProps {
  user: UserProfile | null;
  token: string | null;
  onUpdateUser: (updatedUser: UserProfile) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, token, onUpdateUser }) => {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'SOC Analyst');
  const [level, setLevel] = useState(user?.level || 'Tier-2 Analyst');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state when user prop changes
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setLevel(user.level);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Full Name cannot be empty.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/profile${token ? `?token=${encodeURIComponent(token)}` : ''}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), role, level }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update profile.');
      }

      if (data.user) {
        onUpdateUser(data.user);
        setSuccessMsg('Profile information updated successfully.');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#05070E] text-[#F5F3FF] overflow-y-auto select-text font-sans">
      {/* Header */}
      <div className="p-6 md:px-8 border-b border-[#B8A7FF]/15 bg-gradient-to-b from-[#090B16] to-[#05070E]/80 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#C8FF35]/15 text-[#C8FF35] border border-[#C8FF35]/30 uppercase tracking-wider">
            User Workspace
          </span>
          <span className="text-xs font-mono text-[#9D9BB6]">ID: {user?.id || 'usr-active'}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F5F3FF]">SETTINGS</h1>
        <p className="text-sm text-[#9D9BB6] mt-0.5">
          Manage your personal SOC analyst profile, contact information, and operational credentials.
        </p>
      </div>

      <div className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto w-full">
        {/* Notifications */}
        {successMsg && (
          <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 text-sm flex items-center gap-3 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <div>
              <div className="font-semibold">Changes Saved</div>
              <div className="text-xs text-emerald-300/80">{successMsg}</div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/20 text-rose-300 text-sm flex items-center gap-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <div>
              <div className="font-semibold">Update Error</div>
              <div className="text-xs text-rose-300/80">{errorMsg}</div>
            </div>
          </div>
        )}

        {/* Profile Card Form */}
        <div className="p-6 rounded-2xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 pb-4 border-b border-[#B8A7FF]/10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1F2338] to-[#0E101D] border border-[#C8FF35]/30 flex items-center justify-center text-[#C8FF35] shadow-[0_0_15px_rgba(200,255,53,0.15)] font-bold font-mono text-lg">
              {name ? name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F5F3FF]">PROFILE / PERSONAL INFORMATION</h2>
              <p className="text-xs text-[#9D9BB6]">
                Identity details displayed across investigations, decisions, and system audits.
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#9D9BB6] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#C8FF35]" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Nair"
                  className="w-full px-3.5 py-2.5 bg-[#0F1122] border border-[#B8A7FF]/20 rounded-xl text-sm text-[#F5F3FF] placeholder-[#9D9BB6]/40 focus:outline-none focus:border-[#C8FF35]/60 focus:ring-1 focus:ring-[#C8FF35]/40 transition-all font-sans"
                  required
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#9D9BB6] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#B8A7FF]" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. priya.nair@example.com"
                  className="w-full px-3.5 py-2.5 bg-[#0F1122] border border-[#B8A7FF]/20 rounded-xl text-sm text-[#F5F3FF] placeholder-[#9D9BB6]/40 focus:outline-none focus:border-[#C8FF35]/60 focus:ring-1 focus:ring-[#C8FF35]/40 transition-all font-sans"
                  required
                />
              </div>

              {/* SOC Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#9D9BB6] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#C8FF35]" />
                  Operational Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0F1122] border border-[#B8A7FF]/20 rounded-xl text-sm text-[#F5F3FF] focus:outline-none focus:border-[#C8FF35]/60 focus:ring-1 focus:ring-[#C8FF35]/40 transition-all font-sans"
                >
                  <option value="SOC Lead Tier-3">SOC Lead Tier-3</option>
                  <option value="SOC Analyst">SOC Analyst</option>
                  <option value="Security Incident Responder">Security Incident Responder</option>
                  <option value="Threat Intelligence Specialist">Threat Intelligence Specialist</option>
                  <option value="SOC Tier-1 Triage">SOC Tier-1 Triage</option>
                </select>
              </div>

              {/* Analyst Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#9D9BB6] flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#B8A7FF]" />
                  Analyst Tier / Clearance
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0F1122] border border-[#B8A7FF]/20 rounded-xl text-sm text-[#F5F3FF] focus:outline-none focus:border-[#C8FF35]/60 focus:ring-1 focus:ring-[#C8FF35]/40 transition-all font-sans"
                >
                  <option value="Tier-3 Analyst">Tier-3 Analyst (Senior Lead)</option>
                  <option value="Tier-2 Analyst">Tier-2 Analyst (Investigation)</option>
                  <option value="Tier-1 Analyst">Tier-1 Analyst (Triage)</option>
                </select>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 flex items-center justify-between border-t border-[#B8A7FF]/10">
              <div className="text-xs font-mono text-[#9D9BB6]">
                Username: <span className="text-[#F5F3FF]">{user?.username || 'N/A'}</span>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#C8FF35] hover:bg-[#b8f025] text-[#090B16] text-xs font-mono font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(200,255,53,0.25)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* System & Session Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Security & Access Box */}
          <div className="p-5 rounded-2xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#F5F3FF]">
              <Lock className="w-4 h-4 text-[#C8FF35]" />
              AUTHENTICATION & SESSION
            </div>
            <p className="text-[#9D9BB6] leading-relaxed">
              Sessions are cryptographically verified and bound to your active SOC workstation token. Password hashes are stored using PBKDF2-HMAC-SHA256.
            </p>
            <div className="pt-2 border-t border-[#B8A7FF]/10 space-y-1.5 text-[11px] font-mono text-[#9D9BB6]">
              <div className="flex justify-between">
                <span>Session Status:</span>
                <span className="text-emerald-400 font-bold">Active & Authenticated</span>
              </div>
              <div className="flex justify-between">
                <span>Memory Authorization:</span>
                <span className="text-[#C8FF35]">Granted (Bank: soc-memory)</span>
              </div>
            </div>
          </div>

          {/* Connected Agent Box */}
          <div className="p-5 rounded-2xl bg-[#090B16] border border-[#B8A7FF]/15 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#F5F3FF]">
              <Cpu className="w-4 h-4 text-[#B8A7FF]" />
              EXPERIENCE ENGINE CORE
            </div>
            <p className="text-[#9D9BB6] leading-relaxed">
              When you submit investigation decisions or analyst overrides, HINDY records them under your authenticated identity (<strong>{user?.name || 'Analyst'}</strong>).
            </p>
            <div className="pt-2 border-t border-[#B8A7FF]/10 space-y-1.5 text-[11px] font-mono text-[#9D9BB6]">
              <div className="flex justify-between">
                <span>Agent Architecture:</span>
                <span className="text-[#F5F3FF]">HINDY v2.4 (Hindsight Core)</span>
              </div>
              <div className="flex justify-between">
                <span>Learning Feedback:</span>
                <span className="text-[#B8A7FF]">Automatic on Analyst Decision</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
