/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Database, 
  Users, 
  Palette, 
  CheckCircle2, 
  ShieldAlert, 
  RefreshCw, 
  Play, 
  Plus, 
  Trash2, 
  UserPlus, 
  ChevronRight,
  Shield,
  Sliders,
  Check,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Megaphone,
  HardDrive,
  Clock,
  Briefcase
} from 'lucide-react';
import { User, UserRole, SystemSettings } from '../types';

interface SettingsViewProps {
  user: User;
  token: string;
  triggerRefreshSignal?: () => void;
  refreshSignal?: number;
}

type SettingsTab = 'config' | 'backups' | 'roles' | 'branding';

export default function SettingsView({ user, token, triggerRefreshSignal, refreshSignal }: SettingsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<SettingsTab>('config');

  // --- Theme / Settings State ---
  const [sysSettings, setSysSettings] = useState<SystemSettings | null>(null);
  const [loadingSysSettings, setLoadingSysSettings] = useState<boolean>(false);
  const [saveSysSuccess, setSaveSysSuccess] = useState<string | null>(null);
  const [saveSysError, setSaveSysError] = useState<string | null>(null);
  const [newCropTag, setNewCropTag] = useState<string>('');

  // --- Backup States ---
  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState<boolean>(false);
  const [backupsError, setBackupsError] = useState<string | null>(null);
  const [backupsSuccessMessage, setBackupsSuccessMessage] = useState<string | null>(null);
  const [triggeringBackup, setTriggeringBackup] = useState<boolean>(false);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loadingDbStatus, setLoadingDbStatus] = useState<boolean>(false);

  // --- Role / Users States ---
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [showAddUserForm, setShowAddUserForm] = useState<boolean>(false);
  const [newUserSuccess, setNewUserSuccess] = useState<string | null>(null);

  // New User Form Fields
  const [newUsername, setNewUsername] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPhone, setNewUserPhone] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.INVESTOR);
  const [creatingUser, setCreatingUser] = useState<boolean>(false);

  // --- Fetch Operations ---
  const fetchSysSettings = async () => {
    try {
      setLoadingSysSettings(true);
      setSaveSysError(null);
      const res = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not fetch system settings configuration');
      const data = await res.json();
      setSysSettings(data);
    } catch (err: any) {
      setSaveSysError(err.message || 'Error occurred fetching configurations.');
    } finally {
      setLoadingSysSettings(false);
    }
  };

  const fetchDbStatus = async () => {
    try {
      setLoadingDbStatus(true);
      const res = await fetch('/api/admin/db-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.warn('Failed to load DB status:', err);
    } finally {
      setLoadingDbStatus(false);
    }
  };

  const fetchBackups = async () => {
    try {
      setLoadingBackups(true);
      setBackupsError(null);
      const res = await fetch('/api/admin/backups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not load system backups directory');
      const data = await res.json();
      setBackups(data);
    } catch (err: any) {
      setBackupsError(err.message || 'Error fetching system backups');
    } finally {
      setLoadingBackups(false);
    }
  };

  const fetchUsersList = async () => {
    try {
      setLoadingUsers(true);
      setUsersError(null);
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not load registered systems credentials');
      const data = await res.json();
      setUsersList(data);
    } catch (err: any) {
      setUsersError(err.message || 'Error loading system accounts list');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchSysSettings();
    fetchDbStatus();
    fetchBackups();
    fetchUsersList();
  }, [token, refreshSignal]);

  // Save Settings handler
  const handleSaveSettings = async (updatedSettings: SystemSettings) => {
    try {
      setSaveSysSuccess(null);
      setSaveSysError(null);
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedSettings)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update system settings');
      }
      const data = await res.json();
      setSysSettings(data);
      setSaveSysSuccess('Global settings updated and synchronized successfully across the system.');
      if (triggerRefreshSignal) {
        triggerRefreshSignal();
      }
      // Re-trigger DB status lookups in case DB mode was adjusted on the fly
      setTimeout(fetchDbStatus, 1000);
    } catch (err: any) {
      setSaveSysError(err.message || 'Error occurred while saving settings.');
    }
  };

  // Triggers manual system backup snapshot
  const handleTriggerBackup = async () => {
    if (triggeringBackup) return;
    try {
      setTriggeringBackup(true);
      setBackupsError(null);
      setBackupsSuccessMessage(null);
      const res = await fetch('/api/admin/backups/create', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Backup creation failed in processing engine');
      const data = await res.json();
      setBackups(data.logs || []);
      setBackupsSuccessMessage('System database snapshot archived successfully. Reference timestamp recorded.');
      fetchDbStatus();
    } catch (err: any) {
      setBackupsError(err.message || 'Error executing DB snapshot compilation.');
    } finally {
      setTriggeringBackup(false);
    }
  };

  // Register New User Handler
  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim() || !newUserEmail.trim()) {
      setUsersError('Please supply all required profile configuration fields.');
      return;
    }

    try {
      setCreatingUser(true);
      setUsersError(null);
      setNewUserSuccess(null);

      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          name: newFullName.trim(),
          email: newUserEmail.trim(),
          phone: newUserPhone.trim(),
          role: newUserRole
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate user credential profile');
      }

      await res.json();
      setNewUserSuccess(`User "${newFullName}" provisioned successfully. Temporary credentials dispatched to notifications list.`);
      
      // Reset Fields
      setNewUsername('');
      setNewFullName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserRole(UserRole.INVESTOR);
      setShowAddUserForm(false);
      
      // Refresh User List
      fetchUsersList();
      if (triggerRefreshSignal) triggerRefreshSignal();
    } catch (err: any) {
      setUsersError(err.message || 'Failed to complete role credential registration.');
    } finally {
      setCreatingUser(false);
    }
  };

  // Clear Alert Messages
  useEffect(() => {
    if (saveSysSuccess) {
      const timer = setTimeout(() => setSaveSysSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [saveSysSuccess]);

  useEffect(() => {
    if (backupsSuccessMessage) {
      const timer = setTimeout(() => setBackupsSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [backupsSuccessMessage]);

  useEffect(() => {
    if (newUserSuccess) {
      const timer = setTimeout(() => setNewUserSuccess(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [newUserSuccess]);

  return (
    <div id="settings-view" className="space-y-8 animate-fade-in">
      
      {/* Title & Description Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#1B4332]" />
            <span className="text-[10px] font-mono font-bold text-[#2D6A4F]/70 uppercase tracking-widest">
              Core Administrative Workspace
            </span>
          </div>
          <h1 className="font-serif font-extrabold text-[#1B4332] text-2xl sm:text-3xl mt-1">
            Super Admin Control Center
          </h1>
          <p className="text-xs text-[#2c3e35]/70 mt-1 max-w-2xl">
            Configure global business rules, view live infrastructure logs, configure system credentials, and personalize look-and-feel branding modules dynamically.
          </p>
        </div>

        {/* DB Connection Status Overview Card */}
        <div className="bg-white border border-[#2D6A4F]/10 rounded-2xl px-4.5 py-3 shadow-premium flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${dbStatus?.configured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
          <div className="text-left font-sans">
            <p className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wider leading-none">Database Mode</p>
            <p className="text-xs font-bold text-gray-700 mt-1 leading-none">
              {dbStatus?.connectionType === 'PostgreSQL' ? 'Active Cloud PostgreSQL' : 'Offline JSON db.json'}
            </p>
          </div>
        </div>
      </div>

      {sysSettings && sysSettings.announcementBanner && sysSettings.bannerType !== 'none' && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-start gap-3 select-none">
          <Megaphone className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-emerald-900 leading-none">Active Systemwide Announcement banner</h4>
            <p className="text-[11px] text-emerald-800 mt-1 leading-normal">
              "{sysSettings.announcementBanner}" ({sysSettings.bannerType.toUpperCase()} status layout).
            </p>
          </div>
        </div>
      )}

      {/* Primary Sub-Tabbed Menu Bar */}
      <div className="flex flex-wrap border-b border-gray-150 gap-1 pb-px bg-white/40 p-1.5 rounded-2xl border border-gray-100">
        <button
          id="btn-subtab-config"
          onClick={() => setActiveSubTab('config')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-sans transition-all duration-300 cursor-pointer ${
            activeSubTab === 'config'
              ? 'bg-[#1B4332] text-white shadow-md'
              : 'text-[#2c3e35]/70 hover:bg-white/60 hover:text-[#1B4332]'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>System Configurations</span>
        </button>

        <button
          id="btn-subtab-backups"
          onClick={() => setActiveSubTab('backups')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-sans transition-all duration-300 cursor-pointer ${
            activeSubTab === 'backups'
              ? 'bg-[#1B4332] text-white shadow-md'
              : 'text-[#2c3e35]/70 hover:bg-white/60 hover:text-[#1B4332]'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Infrastructure & Backups</span>
        </button>

        <button
          id="btn-subtab-roles"
          onClick={() => setActiveSubTab('roles')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-sans transition-all duration-300 cursor-pointer ${
            activeSubTab === 'roles'
              ? 'bg-[#1B4332] text-white shadow-md'
              : 'text-[#2c3e35]/70 hover:bg-white/60 hover:text-[#1B4332]'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Role Management</span>
        </button>

        <button
          id="btn-subtab-branding"
          onClick={() => setActiveSubTab('branding')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-sans transition-all duration-300 cursor-pointer ${
            activeSubTab === 'branding'
              ? 'bg-[#1B4332] text-white shadow-md'
              : 'text-[#2c3e35]/70 hover:bg-white/60 hover:text-[#1B4332]'
          }`}
        >
          <Palette className="h-4 w-4" />
          <span>UI Branding Settings</span>
        </button>
      </div>

      {/* Main Workspace Frame container */}
      <div className="bg-white rounded-3xl border border-[#2D6A4F]/10 p-6 sm:p-8 shadow-premium min-h-[400px]">

        {/* --- 1. SYSTEM CONFIGURATIONS TAB --- */}
        {activeSubTab === 'config' && (
          <div className="space-y-8 animate-fade-in">
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-base font-extrabold text-gray-800 font-sans">Business Logic & Engine Configurations</h3>
              <p className="text-[11.5px] text-gray-500 mt-1">Configure global transaction permissions, network simulations, and dynamic crop whitelists.</p>
            </div>

            {loadingSysSettings || !sysSettings ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <RefreshCw className="animate-spin text-[#1B4332] h-7 w-7" />
                <span className="text-xs font-mono text-gray-400">Fetching core parameters config...</span>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Save status alerts */}
                {saveSysSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5 animate-slide-up font-medium">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>{saveSysSuccess}</span>
                  </div>
                )}
                {saveSysError && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-2.5 animate-slide-up font-medium">
                    <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
                    <span>{saveSysError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Connection and Limits */}
                  <div className="space-y-6">
                    <div className="bg-[#FBF9F4]/70 rounded-2xl p-5 border border-gray-100 space-y-4">
                      <h4 className="text-xs font-bold font-mono uppercase text-[#1B4332] tracking-wider leading-none">Database Routing Constraints</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-gray-500 mb-1">Connection Strategy</label>
                          <select
                            value={sysSettings.databaseMode}
                            onChange={(e) => handleSaveSettings({ ...sysSettings, databaseMode: e.target.value as any })}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-700 outline-none focus:border-[#1B4332] cursor-pointer shadow-sm"
                          >
                            <option value="auto">Automatic Choice (Prefer Postgres with local backup)</option>
                            <option value="local_json">Enforced Local JSON DB Mode (Bypass Postgres)</option>
                            <option value="postgres_forced">Forced PostgreSQL Cloud Mode (Error if unavailable)</option>
                          </select>
                          <p className="text-[9.5px] font-mono text-gray-400 mt-1.5 leading-tight">
                            "Automatic Choice" dynamically checks cloud connection. "Enforced Local JSON" decouples the app safely for testing offline caches in sandboxed developer containers.
                          </p>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-gray-500 mb-1">Active Payout ROI Guard (%)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={sysSettings.minimumPayoutRoi || ''}
                              onChange={(e) => setSysSettings({ ...sysSettings, minimumPayoutRoi: parseFloat(e.target.value) || 0 })}
                              onBlur={() => handleSaveSettings({ ...sysSettings, minimumPayoutRoi: sysSettings.minimumPayoutRoi })}
                              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 outline-none focus:border-[#1B4332] shadow-sm font-semibold"
                            />
                            <span className="text-xs font-mono font-bold text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">% ROI</span>
                          </div>
                          <p className="text-[9.5px] font-mono text-gray-400 mt-1.5 leading-tight">
                            Blocks upload or publishing of yield records whose return-on-investment percentage evaluates lower than this established floor. Prevents erroneous or invalid transactions.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#FBF9F4]/70 rounded-2xl p-5 border border-gray-100 space-y-4">
                      <h4 className="text-xs font-bold font-mono uppercase text-[#1B4332] tracking-wider leading-none">Simulation Controls</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] uppercase font-mono font-bold text-gray-500 mb-1">Simulated Latency Overhead (ms)</label>
                          <div className="flex items-center gap-4">
                            <input
                              type="range"
                              min="0"
                              max="3000"
                              step="250"
                              value={sysSettings.simulatedLatency || 0}
                              onChange={(e) => setSysSettings({ ...sysSettings, simulatedLatency: parseInt(e.target.value) })}
                              onMouseUp={() => handleSaveSettings({ ...sysSettings, simulatedLatency: sysSettings.simulatedLatency })}
                              onTouchEnd={() => handleSaveSettings({ ...sysSettings, simulatedLatency: sysSettings.simulatedLatency })}
                              className="flex-1 accent-[#1B4332] cursor-pointer"
                            />
                            <span className="text-xs font-mono font-extrabold text-[#1B4332] bg-white px-3 py-1.5 rounded-xl border border-gray-150 min-w-[70px] text-center shadow-inner">
                              {sysSettings.simulatedLatency || 0} ms
                            </span>
                          </div>
                          <p className="text-[9.5px] font-mono text-gray-400 mt-1.5 leading-tight">
                            Applies simulated server-side delay to secure API transactions. Use to review front-end loading states, skeleton overlays, and rendering performance under heavy server environments.
                          </p>
                        </div>

                        <div className="divide-y divide-gray-150 bg-white rounded-xl border border-gray-150 overflow-hidden shadow-sm">
                          <div className="flex items-center justify-between p-3">
                            <div className="text-left">
                              <span className="text-xs font-bold text-gray-700 block">Notifications Push Engine</span>
                              <span className="text-[9px] font-mono text-gray-400">Push status broadcasts to front-end bells.</span>
                            </div>
                            <button
                              id="btn-toggle-notifications"
                              type="button"
                              onClick={() => handleSaveSettings({ ...sysSettings, enableNotifications: !sysSettings.enableNotifications })}
                              className="cursor-pointer transition hover:scale-105 active:scale-95"
                            >
                              {sysSettings.enableNotifications ? (
                                <ToggleRight className="h-8 w-8 text-emerald-500" />
                              ) : (
                                <ToggleLeft className="h-8 w-8 text-gray-400" />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-3">
                            <div className="text-left">
                              <span className="text-xs font-bold text-gray-700 block">Dispatch Live Email Outboxes</span>
                              <span className="text-[9px] font-mono text-gray-400">Record mock email communication outputs in detail.</span>
                            </div>
                            <button
                              id="btn-toggle-emails"
                              type="button"
                              onClick={() => handleSaveSettings({ ...sysSettings, enableEmailSimulation: !sysSettings.enableEmailSimulation })}
                              className="cursor-pointer transition hover:scale-105 active:scale-95"
                            >
                              {sysSettings.enableEmailSimulation ? (
                                <ToggleRight className="h-8 w-8 text-emerald-500" />
                              ) : (
                                <ToggleLeft className="h-8 w-8 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Dynamic Validation Presets (Allowed Crops) */}
                  <div className="bg-[#FBF9F4]/70 rounded-2xl p-5 border border-gray-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold font-mono uppercase text-[#1B4332] tracking-wider leading-none">Crops & Breed Whitelists</h4>
                      <span className="text-[9.5px] font-mono font-bold bg-[#1B4332]/10 text-[#1B4332] px-2.5 py-1 rounded-full border border-[#1B4332]/10">
                        {sysSettings.allowedCrops?.length || 0} Cultivars
                      </span>
                    </div>

                    <p className="text-[10px] text-gray-500 leading-normal">
                      Specify the precise breed names and strain taxonomy categories validated across agricultural land plot definitions, payout metrics, and agricultural assets tracking profiles.
                    </p>

                    <div className="bg-white rounded-xl border border-gray-150 p-4 space-y-4 shadow-inner max-h-[220px] overflow-y-auto">
                      {sysSettings.allowedCrops && sysSettings.allowedCrops.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {sysSettings.allowedCrops.map((crop) => (
                            <div key={crop} className="flex justify-between items-center bg-gray-50 border border-gray-150 text-xs px-3 py-2 rounded-xl transition hover:border-[#1B4332]">
                              <span className="font-semibold text-gray-700 font-sans">{crop}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const list = sysSettings.allowedCrops.filter(c => c !== crop);
                                  handleSaveSettings({ ...sysSettings, allowedCrops: list });
                                }}
                                className="text-gray-400 hover:text-red-600 transition p-1.5 rounded-lg hover:bg-red-50 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                                title={`Remove ${crop}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center italic text-xs text-gray-400">
                          No crop breeds configured. All operations fallback to text fields.
                        </div>
                      )}
                    </div>

                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newCropTag.trim()) return;
                        const original = sysSettings.allowedCrops || [];
                        if (original.includes(newCropTag.trim())) {
                          setSaveSysError('That exact crop cultivar specification represents a redundant entry.');
                          return;
                        }
                        const updated = [...original, newCropTag.trim()];
                        setNewCropTag('');
                        handleSaveSettings({ ...sysSettings, allowedCrops: updated });
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={newCropTag}
                        onChange={(e) => setNewCropTag(e.target.value)}
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 outline-none focus:border-[#1B4332] shadow-sm font-sans"
                        placeholder="e.g. Cocoa (Criollo Hybrid)"
                      />
                      <button
                        type="submit"
                        className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add breed</span>
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- 2. INFRASTRUCTURE & BACKUPS TAB --- */}
        {activeSubTab === 'backups' && (
          <div className="space-y-8 animate-fade-in">
            <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-base font-extrabold text-gray-800 font-sans">System Infrastructure & Maintenance backups</h3>
                <p className="text-[11.5px] text-gray-500 mt-1">Review diagnostic connection limits and compile offline archive snaps of JSON/Postgres data tables structures.</p>
              </div>

              <button
                id="btn-create-backup-snap"
                onClick={handleTriggerBackup}
                disabled={triggeringBackup}
                className="bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-50 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-md shrink-0"
              >
                {triggeringBackup ? (
                  <RefreshCw className="animate-spin h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                <span>Snapshot DB state</span>
              </button>
            </div>

            {/* Backups Alerts notifications */}
            {backupsSuccessMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5 animate-slide-up font-medium animate-fade-in">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{backupsSuccessMessage}</span>
              </div>
            )}
            {backupsError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-2.5 animate-slide-up font-medium animate-fade-in">
                <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
                <span>{backupsError}</span>
              </div>
            )}

            {/* Infra Diagnostics Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="bg-[#FBF9F4]/50 border border-gray-150 p-5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9.5px] font-mono font-bold tracking-widest text-[#2D6A4F] uppercase">Data persistence</span>
                  <HardDrive className="h-4 w-4 text-[#2D6A4F]" />
                </div>
                <div className="text-left mt-2">
                  <p className="text-2xl font-serif font-extrabold text-[#1B4332]">
                    {dbStatus?.connectionType === 'PostgreSQL' ? 'PostgreSQL' : 'JSON (Local)'}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5 leading-tight">
                    {dbStatus?.connectionType === 'PostgreSQL' 
                      ? 'Executing schema queries on cloud database' 
                      : `Syncing state to server workspace DB files.`
                    }
                  </p>
                </div>
              </div>

              <div className="bg-[#FBF9F4]/50 border border-gray-150 p-5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9.5px] font-mono font-bold tracking-widest text-[#2D6A4F] uppercase">DB File Payload size</span>
                  <Database className="h-4 w-4 text-[#2D6A4F]" />
                </div>
                <div className="text-left mt-2">
                  <p className="text-2xl font-serif font-extrabold text-[#1B4332]">
                    {dbStatus?.fileSizeFormatted || '81.8 KB'}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5 leading-tight">
                    Size on disk of cached database files block templates.
                  </p>
                </div>
              </div>

              <div className="bg-[#FBF9F4]/50 border border-gray-150 p-5 rounded-2xl space-y-2 sm:col-span-2 lg:col-span-1">
                <div className="flex justify-between items-center">
                  <span className="text-[9.5px] font-mono font-bold tracking-widest text-[#2D6A4F] uppercase">Snapshot Archive log</span>
                  <Clock className="h-4 w-4 text-[#2D6A4F]" />
                </div>
                <div className="text-left mt-2">
                  <p className="text-2xl font-serif font-extrabold text-[#1B4332]">
                    {backups?.length || 0} Archived
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5 leading-tight">
                    Historical DB snapshots maintained on physical storage.
                  </p>
                </div>
              </div>

            </div>

            {/* Backups Logs Table */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold font-mono uppercase text-[#1B4332] tracking-wider leading-none">Archived snapshot log registries</h4>
              
              <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm">
                {loadingBackups ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <RefreshCw className="animate-spin text-[#1B4332] h-6 w-6" />
                    <span className="text-[10px] font-mono text-gray-400">Querying backup directory stream...</span>
                  </div>
                ) : backups && backups.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left col-span-1 border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-150 text-[10px] uppercase font-mono font-bold text-[#2D6A4F]/80">
                          <th className="px-5 py-3">Archive file reference</th>
                          <th className="px-5 py-3">Trigger action type</th>
                          <th className="px-5 py-3">Timestamp created</th>
                          <th className="px-5 py-3 text-right">Metrics checkup</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-sans">
                        {backups.map((bk, i) => (
                          <tr key={bk.id || i} className="hover:bg-[#FBF9F4]/30 transition duration-150">
                            <td className="px-5 py-3.5 font-mono font-bold text-[#1B4332] truncate max-w-[200px]">
                              {bk.fileName || `db-backup-${Date.now()}.json`}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-bold text-[9px] border uppercase ${
                                bk.backupType === 'manual'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}>
                                {bk.backupType || 'manual'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-gray-500 font-medium">
                              {bk.createdAt ? new Date(bk.createdAt).toLocaleString() : new Date().toLocaleString()}
                            </td>
                            <td className="px-5 py-3.5 text-right font-mono text-[10px] text-emerald-800 font-bold">
                              {bk.fileSizeFormatted || '79.2 KB'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-gray-400 italic">
                    Infrastructure log is currently empty. Trigger a manual state snapshot above to generate records.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* --- 3. ROLE MANAGEMENT TAB --- */}
        {activeSubTab === 'roles' && (
          <div className="space-y-8 animate-fade-in">
            <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-base font-extrabold text-gray-800 font-sans">Registered System Accounts & Roles</h3>
                <p className="text-[11.5px] text-gray-500 mt-1">Audit privileges access levels, create corporate users, and configure operational portals authorization mapping.</p>
              </div>

              <button
                id="btn-toggle-add-user-form"
                onClick={() => {
                  setShowAddUserForm(!showAddUserForm);
                  setUsersError(null);
                  setNewUserSuccess(null);
                }}
                className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-md shrink-0"
              >
                <UserPlus className="h-4 w-4" />
                <span>{showAddUserForm ? 'Collapse form' : 'Register core credential'}</span>
              </button>
            </div>

            {/* Error notifications */}
            {usersError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-2.5 animate-fade-in font-medium">
                <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
                <span>{usersError}</span>
              </div>
            )}

            {/* Success notifications */}
            {newUserSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5 animate-fade-in font-medium">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{newUserSuccess}</span>
              </div>
            )}

            {/* Slide-out Create User Form */}
            {showAddUserForm && (
              <div className="bg-[#FBF9F4]/50 border border-[#2D6A4F]/15 rounded-3xl p-6.5 space-y-6 animate-slide-down">
                <div>
                  <h4 className="text-xs font-bold font-mono uppercase text-[#1B4332] tracking-wider leading-none">Register System Account credential</h4>
                  <p className="text-[10.5px] text-gray-400 mt-1">Configure profile and system routing policies for new administrators, farm manager supervisors, or investor accounts.</p>
                </div>

                <form onSubmit={handleRegisterUser} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    
                    <div>
                      <label className="block text-[9.5px] font-mono font-bold uppercase text-gray-500 mb-1">Unique Username ID *</label>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-700 outline-none focus:border-[#1B4332] shadow-sm font-sans"
                        placeholder="e.g. ademola_estates"
                      />
                    </div>

                    <div>
                      <label className="block text-[9.5px] font-mono font-bold uppercase text-gray-500 mb-1">Full Legal Name *</label>
                      <input
                        type="text"
                        required
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-700 outline-none focus:border-[#1B4332] shadow-sm font-sans"
                        placeholder="e.g. Chief Ademola Johnson"
                      />
                    </div>

                    <div>
                      <label className="block text-[9.5px] font-mono font-bold uppercase text-gray-500 mb-1">Electronic Mail Address *</label>
                      <input
                        type="email"
                        required
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-700 outline-none focus:border-[#1B4332] shadow-sm font-sans"
                        placeholder="e.g. chief@ademolaestates.com"
                      />
                    </div>

                    <div>
                      <label className="block text-[9.5px] font-mono font-bold uppercase text-gray-500 mb-1">Telephone Contact number</label>
                      <input
                        type="tel"
                        value={newUserPhone}
                        onChange={(e) => setNewUserPhone(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-700 outline-none focus:border-[#1B4332] shadow-sm font-sans"
                        placeholder="e.g. +234 812 345 6789"
                      />
                    </div>

                    <div>
                      <label className="block text-[9.5px] font-mono font-bold uppercase text-gray-500 mb-1">System Authorization level *</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-700 outline-none focus:border-[#1B4332] shadow-sm font-sans cursor-pointer"
                      >
                        <option value={UserRole.ADMIN}>Super Admin (Total Core Access)</option>
                        <option value={UserRole.FARM_MANAGER}>Farm Manager Supervisor (No Financial Records)</option>
                        <option value={UserRole.INVESTOR}>Investor Client (Ledger & Progress access)</option>
                      </select>
                    </div>

                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      id="btn-cancel-add-user"
                      type="button"
                      onClick={() => setShowAddUserForm(false)}
                      className="px-4.5 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-white/95 border border-gray-200 cursor-pointer text-center"
                    >
                      Dismiss
                    </button>
                    <button
                      id="btn-submit-add-user"
                      type="submit"
                      disabled={creatingUser}
                      className="bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-50 text-white text-xs font-semibold px-5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow"
                    >
                      {creatingUser ? (
                        <RefreshCw className="animate-spin h-3.5 w-3.5" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>Register credential</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Users Accounts List */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold font-mono uppercase text-[#1B4332] tracking-wider leading-none">Registered credentials index</h4>
              
              <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm">
                {loadingUsers ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <RefreshCw className="animate-spin text-[#1B4332] h-6 w-6" />
                    <span className="text-[10px] font-mono text-gray-400">Inspecting credential store registries...</span>
                  </div>
                ) : usersList && usersList.length > 0 ? (
                  <div className="overflow-x-auto animate-fade-in">
                    <table className="w-full text-left col-span-1 border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-150 text-[10px] uppercase font-mono font-bold text-[#2D6A4F]/80">
                          <th className="px-5 py-3">Account identity</th>
                          <th className="px-5 py-3">System username</th>
                          <th className="px-5 py-3">Privileges group</th>
                          <th className="px-5 py-3">Contact details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-sans">
                        {usersList.map((usr) => (
                          <tr key={usr.id} className="hover:bg-[#FBF9F4]/30 transition duration-150">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8.5 w-8.5 bg-[#52B788]/10 rounded-full flex items-center justify-center font-bold text-[#1B4332]">
                                  {usr.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </div>
                                <div>
                                  <span className="font-extrabold text-gray-800 block text-xs">{usr.name}</span>
                                  <span className="text-[10px] text-gray-400 block font-mono">{usr.id}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 font-mono font-semibold text-[#1B4332]">
                              @{usr.username}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-bold text-[8.5px] border uppercase ${
                                usr.role === UserRole.ADMIN
                                  ? 'bg-red-50 text-red-800 border-red-200'
                                  : usr.role === UserRole.FARM_MANAGER
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {usr.role.split('_').join(' ')}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-medium text-gray-600">
                              <span className="block text-xs">{usr.email}</span>
                              {usr.phone && <span className="block text-[10px] text-gray-400 font-mono mt-0.5">{usr.phone}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-gray-400 italic">
                    Internal role index failed to yield elements.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* --- 4. UI BRANDING SETTINGS TAB --- */}
        {activeSubTab === 'branding' && (
          <div className="space-y-8 animate-fade-in">
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-base font-extrabold text-gray-800 font-sans">Visual Theming & Branding Modules</h3>
              <p className="text-[11.5px] text-gray-500 mt-1">Configure client-facing headers, icon branding keys, and dynamic alert broadcast ribbons.</p>
            </div>

            {loadingSysSettings || !sysSettings ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <RefreshCw className="animate-spin text-[#1B4332] h-7 w-7" />
                <span className="text-xs font-mono text-gray-400">Loading appearance attributes...</span>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Save status alerts */}
                {saveSysSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5 animate-slide-up font-medium">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>{saveSysSuccess}</span>
                  </div>
                )}
                {saveSysError && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-2.5 animate-slide-up font-medium">
                    <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
                    <span>{saveSysError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Visual parameters */}
                  <div className="space-y-6 lg:col-span-2">
                    <div className="bg-[#FBF9F4]/40 p-5 border border-gray-150 rounded-2xl space-y-5">
                      <h4 className="text-xs font-bold font-mono uppercase text-[#1B4332] tracking-wider leading-none">Global Appearance branding</h4>
                      
                      <div className="grid grid-col-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">Corporate Portal Name</label>
                          <input
                            type="text"
                            value={sysSettings.portalName || ''}
                            onChange={(e) => setSysSettings({ ...sysSettings, portalName: e.target.value })}
                            onBlur={() => handleSaveSettings({ ...sysSettings, portalName: sysSettings.portalName })}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-700 outline-none focus:border-[#1B4332] shadow-sm font-sans"
                            placeholder="Adubiaro Estates Portal"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">Sidebar Header logo brand *</label>
                          <input
                            type="text"
                            value={sysSettings.logoText || ''}
                            onChange={(e) => setSysSettings({ ...sysSettings, logoText: e.target.value })}
                            onBlur={() => handleSaveSettings({ ...sysSettings, logoText: sysSettings.logoText })}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-700 outline-none focus:border-[#1B4332] shadow-sm font-sans font-bold"
                            placeholder="ADUBIARO"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">Visual Accent layout color</label>
                          <select
                            value={sysSettings.accentColor}
                            onChange={(e) => handleSaveSettings({ ...sysSettings, accentColor: e.target.value })}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-700 outline-none focus:border-[#1B4332] shadow-sm cursor-pointer"
                          >
                            <option value="emerald">Emerald Meadow green (Classic standard)</option>
                            <option value="forest">High-Contrast Deep Forest (Botanical corporate)</option>
                            <option value="amber">Autumn Golden harvest (Organic premium)</option>
                            <option value="slate">Obsidian charcoal slate (Sleek minimalist)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#FBF9F4]/40 p-5 border border-gray-150 rounded-2xl space-y-4">
                      <h4 className="text-xs font-bold font-mono uppercase text-[#1B4332] tracking-wider leading-none">Portal Alert Broadcast Ribbons</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">Alert announcement message text</label>
                          <input
                            type="text"
                            value={sysSettings.announcementBanner || ''}
                            onChange={(e) => setSysSettings({ ...sysSettings, announcementBanner: e.target.value })}
                            onBlur={() => handleSaveSettings({ ...sysSettings, announcementBanner: sysSettings.announcementBanner })}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-700 outline-none focus:border-[#1B4332] shadow-sm font-sans"
                            placeholder="Type news text to broadcast at the very top of client pages..."
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">ribbon notification layout alert category</label>
                          <select
                            value={sysSettings.bannerType}
                            onChange={(e) => handleSaveSettings({ ...sysSettings, bannerType: e.target.value as any })}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-700 outline-none focus:border-[#1B4332] shadow-sm cursor-pointer"
                          >
                            <option value="none">Banner Disabled (Hidden layout frame)</option>
                            <option value="info">Sky Blue (General information & news updates)</option>
                            <option value="warning">Critical Gold warning (Maintenance advisories)</option>
                            <option value="success">Emerald Growth success (Yield & payout distribution notice)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: preview card */}
                  <div className="bg-gray-50 border border-gray-200 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-wider text-gray-400 uppercase leading-none">
                        <Sparkles className="h-3.5 w-3.5 text-gray-400" />
                        <span>Live theme preview framework</span>
                      </div>

                      <p className="text-[10px] text-gray-400 leading-normal">
                        Simulating active branding components rendered across dashboards, side bars headers and desktop frames templates.
                      </p>

                      {/* Mock Sidebar Header box */}
                      <div className="p-4 bg-gradient-to-b from-[#0F291E] via-[#143427] to-[#0E251B] text-white rounded-2xl shadow border border-[#2D6A4F]/20 select-none">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[#52B788]/20 rounded-xl">
                            <span className="block h-4 w-4 bg-[#52B788] rounded-full animate-pulse" />
                          </div>
                          <div>
                            <span className="font-serif font-black text-sm block tracking-wider leading-none text-white">
                              {sysSettings.logoText || 'ADUBIARO'}
                            </span>
                            <span className="text-[7.5px] uppercase tracking-widest text-[#52B788] block font-mono font-extrabold mt-1">
                              ESTATE INVESTOR PORTAL
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Mock Alert banner preview */}
                      {sysSettings.announcementBanner && sysSettings.bannerType !== 'none' ? (
                        <div className={`p-2.5 rounded-xl border text-[9.5px] font-medium flex items-center gap-1.5 leading-tight select-none ${
                          sysSettings.bannerType === 'info' 
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : sysSettings.bannerType === 'warning'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0 animate-pulse" />
                          <span className="truncate"><b>BROADCAST:</b> {sysSettings.announcementBanner}</span>
                        </div>
                      ) : (
                        <div className="py-4 border border-dashed border-gray-205 rounded-xl text-center text-[10px] text-gray-400 italic">
                          Alert Banner is set to hidden.
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-gray-200 text-center">
                      <span className="text-[9px] font-mono font-medium text-gray-400">
                        Accent Theme Tag: <b className="uppercase text-[#1B4332]">{sysSettings.accentColor || 'emerald'}</b>
                      </span>
                    </div>

                  </div>

                </div>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
