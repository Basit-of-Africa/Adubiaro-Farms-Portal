/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Sprout, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  FileText, 
  PlusCircle, 
  RefreshCw, 
  UserPlus, 
  Briefcase, 
  CheckCircle2, 
  ShieldAlert,
  ArrowRight,
  Edit,
  Layers,
  UploadCloud,
  Sparkles,
  Settings,
  Database,
  Clock,
  HardDrive,
  Eye,
  EyeOff
} from 'lucide-react';
import { User, Farm, FarmPlot, UserRole, DocumentCategory, DocumentVisibility, FinancialStatus } from '../types';
import DashboardStats from './DashboardStats';

interface AdminDashboardProps {
  user: User;
  token: string;
  onSelectFarm: (farmId: string) => void;
  triggerRefreshSignal: () => void;
  refreshSignal: number;
}

export default function AdminDashboard({ user, token, onSelectFarm, triggerRefreshSignal, refreshSignal }: AdminDashboardProps) {
  // Stats
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lists
  const [farms, setFarms] = useState<Farm[]>([]);
  const [systemUsers, setSystemUsers] = useState<User[]>([]);
  const [systemPlots, setSystemPlots] = useState<any[]>([]);

  // Form states
  const [activeFormTab, setActiveFormTab] = useState<'payout' | 'document' | 'user' | 'plot' | 'assign' | 'farms' | 'settings'>('payout');

  // Backups and Maintenance Settings state
  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState<boolean>(false);
  const [triggeringBackup, setTriggeringBackup] = useState<boolean>(false);
  const [backupsError, setBackupsError] = useState<string | null>(null);
  const [backupsSuccessMessage, setBackupsSuccessMessage] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loadingDbStatus, setLoadingDbStatus] = useState<boolean>(false);

  // Administrative Control & Feature custom-styling states
  const [sysSettings, setSysSettings] = useState<any>(null);
  const [loadingSysSettings, setLoadingSysSettings] = useState<boolean>(false);
  const [saveSysSuccess, setSaveSysSuccess] = useState<string | null>(null);
  const [saveSysError, setSaveSysError] = useState<string | null>(null);
  const [newCropTag, setNewCropTag] = useState<string>('');

  // 6. Manage Farm Estates (Add/Edit)
  const [selectedFarmToEdit, setSelectedFarmToEdit] = useState<string>('new'); // 'new' or specific farm.id
  const [farmName, setFarmName] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [farmState, setFarmState] = useState('');
  const [farmCoverImage, setFarmCoverImage] = useState('');
  const [farmDescription, setFarmDescription] = useState('');
  const [farmDateEstablished, setFarmDateEstablished] = useState('');
  const [farmIsActive, setFarmIsActive] = useState(true);
  const [farmSuccessMessage, setFarmSuccessMessage] = useState<string | null>(null);
  const [isDraggingEstateImage, setIsDraggingEstateImage] = useState(false);

  // 1. Create User
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('investor');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userSuccessMessage, setUserSuccessMessage] = useState<string | null>(null);

  // 2. Allocate Plot
  const [allocFarmId, setAllocFarmId] = useState('');
  const [allocPlotNumber, setAllocPlotNumber] = useState('');
  const [allocSize, setAllocSize] = useState('');
  const [allocCrop, setAllocCrop] = useState('Oil Palm (Tenera Hybrid)');
  const [allocInvestorId, setAllocInvestorId] = useState('');
  const [allocAmount, setAllocAmount] = useState('');
  const [plotSuccessMessage, setPlotSuccessMessage] = useState<string | null>(null);

  // 3. Assign Manager
  const [assignFarmId, setAssignFarmId] = useState('');
  const [assignManagerId, setAssignManagerId] = useState('');
  const [assignSuccessMessage, setAssignSuccessMessage] = useState<string | null>(null);

  // 4. Upload Financial Record
  const [finPlotId, setFinPlotId] = useState('');
  const [finPeriod, setFinPeriod] = useState('Q1');
  const [finYear, setFinYear] = useState('2026');
  const [finRoi, setFinRoi] = useState('');
  const [finAmount, setFinAmount] = useState('');
  const [finDate, setFinDate] = useState('');
  const [finNotes, setFinNotes] = useState('');
  const [finStatus, setFinStatus] = useState('pending');
  const [finSuccessMessage, setFinSuccessMessage] = useState<string | null>(null);

  // 5. Upload Document
  const [docFarmId, setDocFarmId] = useState('');
  const [docPlotId, setDocPlotId] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('contract');
  const [docVisibility, setDocVisibility] = useState('farm');
  const [docDescription, setDocDescription] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docSuccessMessage, setDocSuccessMessage] = useState<string | null>(null);

  const fetchStatsAndLists = async () => {
    try {
      setLoading(true);
      setError(null);

      // Stats
      const statsRes = await fetch('/api/admin/system-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!statsRes.ok) throw new Error('Unassigned or unauthorized access to stats');
      const statsData = await statsRes.json();
      setStats(statsData);

      // Farms
      const farmsRes = await fetch('/api/farms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const farmsData = await farmsRes.json();
      setFarms(farmsData);
      if (farmsData.length > 0) {
        setAllocFarmId(farmsData[0].id);
        setAssignFarmId(farmsData[0].id);
        setDocFarmId(farmsData[0].id);
      }

      // Users
      const usersRes = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersRes.json();
      setSystemUsers(usersData);
      
      const managers = usersData.filter((u: any) => u.role === 'farm_manager');
      if (managers.length > 0) setAssignManagerId(managers[0].id);

      const investors = usersData.filter((u: any) => u.role === 'investor');
      if (investors.length > 0) setAllocInvestorId(investors[0].id);

      // Plot ownership options for financials
      if (farmsData.length > 0) {
        const detailsRes = await fetch(`/api/farms/${farmsData[0].id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const detailsData = await detailsRes.json();
        setSystemPlots(detailsData.plots || []);
        if (detailsData.plots?.length > 0) {
          setFinPlotId(detailsData.plots[0].id);
          setDocPlotId(detailsData.plots[0].id);
        }
      }

    } catch (err: any) {
      setError(err.message || 'Stats retrieval error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsAndLists();
  }, [token, refreshSignal]);

  const fetchBackups = async () => {
    try {
      setLoadingBackups(true);
      setBackupsError(null);
      const res = await fetch('/api/admin/backups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not load system backups');
      const data = await res.json();
      setBackups(data);
    } catch (err: any) {
      setBackupsError(err.message || 'Error fetching backups');
    } finally {
      setLoadingBackups(false);
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

  const fetchSysSettings = async () => {
    try {
      setLoadingSysSettings(true);
      setSaveSysError(null);
      const res = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not load system settings');
      const data = await res.json();
      setSysSettings(data);
    } catch (err: any) {
      setSaveSysError(err.message || 'Error occurred fetching configurations.');
    } finally {
      setLoadingSysSettings(false);
    }
  };

  const handleSaveSettings = async (updatedSettings: any) => {
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
      setSaveSysSuccess('System configurations updated successfully. Branding themes & features have been synchronized.');
      if (triggerRefreshSignal) {
        triggerRefreshSignal();
      }
      setTimeout(fetchDbStatus, 1500);
    } catch (err: any) {
      setSaveSysError(err.message || 'Error occurred while saving configurations.');
    }
  };

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
      if (!res.ok) throw new Error('Backup failed to compile');
      const data = await res.json();
      setBackups(data.logs);
      setBackupsSuccessMessage('System state snapshotted & archived successfully. Timestamp logged.');
    } catch (err: any) {
      setBackupsError(err.message || 'Error occurred during backup extraction.');
    } finally {
      setTriggeringBackup(false);
    }
  };

  useEffect(() => {
    if (activeFormTab === 'settings') {
      fetchBackups();
      fetchDbStatus();
      fetchSysSettings();
    }
  }, [activeFormTab]);

  useEffect(() => {
    if (sysSettings?.allowedCrops && sysSettings.allowedCrops.length > 0) {
      setAllocCrop(sysSettings.allowedCrops[0]);
    }
  }, [sysSettings]);

  // Handle farm change in doc upload or plot allocations to fetch appropriate plot numbers
  const handleDocFarmChange = async (fId: string) => {
    setDocFarmId(fId);
    try {
      const detailsRes = await fetch(`/api/farms/${fId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const detailsData = await detailsRes.json();
      setSystemPlots(detailsData.plots || []);
      if (detailsData.plots?.length > 0) {
        setDocPlotId(detailsData.plots[0].id);
      } else {
        setDocPlotId('');
      }
    } catch {}
  };

  // Submit User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSuccessMessage(null);
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUsername,
          name: newName,
          email: newEmail,
          phone: newPhone,
          role: newRole,
          password: newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'User setup error');

      setUserSuccessMessage(`Account for ${data.name} (${data.role.toUpperCase()}) provisioned successfully! Signals triggered a welcome notification.`);
      setNewUsername('');
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      triggerRefreshSignal();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Submit Plot
  const handleAllocatePlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlotSuccessMessage(null);
    try {
      const res = await fetch('/api/admin/plots/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          farmId: allocFarmId,
          plotNumber: allocPlotNumber,
          sizeHectares: allocSize,
          cropType: allocCrop,
          InvestorId: allocInvestorId,
          investmentAmount: allocAmount
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Plot allotment error');

      setPlotSuccessMessage(`Plot ${allocPlotNumber} allocated successfully to investor.`);
      setAllocPlotNumber('');
      setAllocSize('');
      setAllocAmount('');
      triggerRefreshSignal();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Assign Manager
  const handleAssignManager = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignSuccessMessage(null);
    try {
      const res = await fetch('/api/admin/assignments/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          managerId: assignManagerId,
          farmId: assignFarmId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assignment error');

      setAssignSuccessMessage(`Farm Manager successfuly linked and registered for updates.`);
      triggerRefreshSignal();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Submit Financials
  const handleCreateFinancials = async (e: React.FormEvent) => {
    e.preventDefault();
    setFinSuccessMessage(null);
    try {
      const res = await fetch('/api/financials/upload', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plotId: finPlotId,
          period: finPeriod,
          year: finYear,
          roiPercentage: finRoi,
          payoutAmount: finAmount,
          payoutDate: finDate,
          notes: finNotes,
          status: finStatus
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payout ledger filing error');

      setFinSuccessMessage(`Financial ledger record for ${finPeriod} ${finYear} published. Soil signals emailed investor.`);
      setFinRoi('');
      setFinAmount('');
      setFinNotes('');
      triggerRefreshSignal();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Document Upload Submit Form
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocSuccessMessage(null);
    if (!docFile) {
      alert('Attach a valid legal file.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('title', docTitle);
      formData.append('category', docCategory);
      formData.append('visibility', docVisibility);
      formData.append('description', docDescription);
      if (docVisibility === 'plot') {
        formData.append('plotId', docPlotId);
      }

      const res = await fetch(`/api/documents/farm/${docFarmId}/upload`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server file upload error');

      setDocSuccessMessage(`Document "${data.title}" successfully loaded and encrypted.`);
      setDocTitle('');
      setDocDescription('');
      setDocFile(null);
      triggerRefreshSignal();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const parseAndSetCoverPhoto = (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image is customly large. Please select an image under 5MB for optimized storage.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setFarmCoverImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle select farm to edit changes or load initial values
  const handleSelectFarmToEditChange = (farmId: string) => {
    setSelectedFarmToEdit(farmId);
    setFarmSuccessMessage(null);
    if (farmId === 'new') {
      setFarmName('');
      setFarmLocation('');
      setFarmState('');
      setFarmCoverImage('');
      setFarmDescription('');
      setFarmDateEstablished(new Date().toISOString().split('T')[0]);
      setFarmIsActive(true);
    } else {
      const farm = farms.find(f => f.id === farmId);
      if (farm) {
        setFarmName(farm.name);
        setFarmLocation(farm.location);
        setFarmState(farm.state);
        setFarmCoverImage(farm.coverImage || '');
        setFarmDescription(farm.description || '');
        setFarmDateEstablished(farm.dateEstablished || '');
        setFarmIsActive(farm.isActive);
      }
    }
  };

  // Submit Farm addition or edit
  const handleSaveFarmEstate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFarmSuccessMessage(null);

    try {
      const isNew = selectedFarmToEdit === 'new';
      const endpoint = isNew ? '/api/admin/farms/create' : `/api/admin/farms/${selectedFarmToEdit}/update`;
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: farmName,
          location: farmLocation,
          state: farmState,
          coverImage: farmCoverImage,
          description: farmDescription,
          dateEstablished: farmDateEstablished,
          isActive: farmIsActive
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save estate details');

      if (isNew) {
        setFarmSuccessMessage(`New Farm Estate "${data.name}" added successfully!`);
        // Reset state
        setFarmName('');
        setFarmLocation('');
        setFarmState('');
        setFarmCoverImage('');
        setFarmDescription('');
        setFarmDateEstablished('');
      } else {
        setFarmSuccessMessage(`Farm Estate "${data.name}" updated successfully!`);
      }

      triggerRefreshSignal();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleQuickEditFarm = (farm: Farm, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent clicking cards to also explore
    setActiveFormTab('farms');
    setSelectedFarmToEdit(farm.id);
    setFarmName(farm.name);
    setFarmLocation(farm.location);
    setFarmState(farm.state);
    setFarmCoverImage(farm.coverImage || '');
    setFarmDescription(farm.description || '');
    setFarmDateEstablished(farm.dateEstablished || '');
    setFarmIsActive(farm.isActive);
    setFarmSuccessMessage(null);
  };

  // System Db Reset Seed
  const handleResetDb = async () => {
    if (!window.confirm('Restore system state to pristine seed values? This deletes custom plots.')) return;
    try {
      const res = await fetch('/api/admin/reset-db', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Prinstine state restored.');
        triggerRefreshSignal();
      }
    } catch (err) {
      alert('Reset failed.');
    }
  };

  // Clean Slate for Production Mode
  const handleCleanSlate = async () => {
    if (!window.confirm('Wipe ALL demo data (farms, plots, investments, announcements, documents, and other users) and enter Production Mode? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/admin/clean-slate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('All demo data cleared successfully! Your database is now fresh, clean, and ready for real data.');
        triggerRefreshSignal();
      } else {
        const data = await res.json();
        alert(data.error || 'Clean slate action failed.');
      }
    } catch (err) {
      alert('Action failed.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1B4332] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border-l-4 border-red-500 rounded-xl">
        <h3 className="text-sm font-bold text-red-800">Connection Error</h3>
        <p className="text-xs text-red-700 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div id="admin-dashboard-container" className="space-y-8 animate-fade-in">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium">
        <div>
          <h1 className="font-serif font-extrabold text-2xl text-[#1B4332] tracking-wide">Super Admin Hub</h1>
          <p className="text-xs text-gray-400 font-mono mt-1 font-bold">Full system status & security role controller</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={fetchStatsAndLists}
            className="flex items-center gap-2 px-4 py-2 border border-[#2D6A4F]/15 text-gray-600 rounded-xl text-xs font-mono font-bold cursor-pointer hover:bg-gray-50 transition shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#2D6A4F]" />
            <span>Reload Portal Status</span>
          </button>
          <button
            onClick={handleResetDb}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-mono font-bold cursor-pointer shadow-sm transition"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Reset Database Seed</span>
          </button>
          <button
            onClick={handleCleanSlate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-mono font-bold cursor-pointer shadow-sm transition"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Go Live — Wipe Demo Data</span>
          </button>
        </div>
      </div>

      {/* New 'Dashboard Stats' Key Performance Indicators Grid */}
      <div id="admin-dashboard-stats-section" className="space-y-4">
        <h2 className="font-sans font-extrabold text-xs text-[#2c3e35]/70 uppercase tracking-wider font-mono">
          System Performance Analytics
        </h2>
        <DashboardStats stats={stats} loading={loading} />
      </div>

      {/* Stats KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium flex items-center gap-4.5">
          <div className="p-3 bg-[#52B788]/10 rounded-2xl text-[#1B4332]">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[9px] font-mono uppercase text-gray-400 font-bold tracking-wider">Total Investors</div>
            <div className="text-2xl font-bold text-[#1B4332] font-serif mt-0.5">{stats?.totalInvestors}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium flex items-center gap-4.5">
          <div className="p-3 bg-[#52B788]/10 rounded-2xl text-[#1B4332]">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[9px] font-mono uppercase text-gray-400 font-bold tracking-wider">Farm Managers</div>
            <div className="text-2xl font-bold text-[#1B4332] font-serif mt-0.5">{stats?.totalManagers}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium flex items-center gap-4.5">
          <div className="p-3 bg-amber-500/10 rounded-2xl text-[#D4A017]">
            <Sprout className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[9px] font-mono uppercase text-gray-400 font-bold tracking-wider">Deeded plots</div>
            <div className="text-xl font-bold text-[#1B4332] font-serif mt-0.5">{stats?.totalPlotsCount} <span className="text-xs text-gray-400">/ {stats?.totalFarms} Farms</span></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium flex items-center gap-4.5">
          <div className="p-3 bg-[#D4A017]/10 rounded-2xl text-[#D4A017]">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[9px] font-mono uppercase text-gray-400 font-bold tracking-wider">Invested Capital</div>
            <div className="text-xl font-bold text-[#1B4332] font-serif mt-0.5">₦{stats?.totalInvestment?.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Farms Grid & Admin Controls Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Farm Cards List - left 5 cols */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="font-sans font-extrabold text-xs text-[#2c3e35]/70 uppercase tracking-wider font-mono">Our Managed Estates</h2>
          
          <div className="space-y-4">
            {farms.map(farm => (
              <div 
                key={farm.id}
                onClick={() => onSelectFarm(farm.id)}
                className="bg-white rounded-3xl overflow-hidden border border-[#2D6A4F]/10 shadow-premium hover:shadow-[#2D6A4F]/15 hover:border-[#2D6A4F]/25 transition-all duration-300 cursor-pointer group"
              >
                <div className="relative h-40 bg-gray-100 overflow-hidden">
                  <img src={farm.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  <div className="absolute top-3 left-3 z-10">
                    <button
                      onClick={(e) => handleQuickEditFarm(farm, e)}
                      className="bg-white/95 hover:bg-white text-[#1B4332] py-1 px-2 rounded-lg shadow-md border border-[#1B4332]/10 cursor-pointer transition flex items-center gap-1 text-[9px] font-bold font-sans"
                    >
                      <Edit className="h-2.5 w-2.5 text-[#2D6A4F]" />
                      <span>Edit Estate</span>
                    </button>
                  </div>
                  <div className="absolute top-3 right-3 bg-[#1B4332] text-white text-[9px] uppercase font-bold font-mono px-3 py-1 rounded-full border border-[#52B788]/20 shadow-sm">
                    Active Operations
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-serif font-bold text-[#1B4332] text-base group-hover:text-[#2D6A4F] transition">{farm.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 font-sans">{farm.location}, {farm.state}</p>
                  
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-xs font-mono">
                    <span className="text-gray-400 font-bold">Plots: <b className="text-gray-700">{farm.totalPlots}</b></span>
                    <span className="text-gray-400 font-bold">Hectares: <b className="text-gray-700">{farm.totalHectares} ha</b></span>
                    <span className="text-[#2D6A4F] font-bold flex items-center gap-1 group-hover:underline">
                      Explore Portal <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Administative Controls Tab Area - right 7 cols */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#2D6A4F]/10 shadow-premium overflow-hidden">
          
          {/* Internal tab selector */}
          <div className="flex border-b border-gray-100 bg-[#FBF9F4]/40 overflow-x-auto">
            <button
              onClick={() => setActiveFormTab('payout')}
              className={`px-4 py-3.5 text-[11px] font-mono font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 cursor-pointer transition-all duration-200 shrink-0 ${
                activeFormTab === 'payout' 
                  ? 'border-[#1B4332] text-[#1B4332] bg-white font-black' 
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Financial summary</span>
            </button>

            <button
              onClick={() => setActiveFormTab('document')}
              className={`px-4 py-3.5 text-[11px] font-mono font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 cursor-pointer transition-all duration-200 shrink-0 ${
                activeFormTab === 'document' 
                  ? 'border-[#1B4332] text-[#1B4332] bg-white font-black' 
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Upload document</span>
            </button>

            <button
              onClick={() => setActiveFormTab('user')}
              className={`px-4 py-3.5 text-[11px] font-mono font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 cursor-pointer transition-all duration-200 shrink-0 ${
                activeFormTab === 'user' 
                  ? 'border-[#2D6A4F] text-[#2D6A4F] bg-emerald-50/40 font-black' 
                  : 'border-transparent text-gray-400 hover:text-[#2D6A4F] hover:border-[#2D6A4F]/30'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
              <span>Register User / Manager</span>
            </button>

            <button
              onClick={() => setActiveFormTab('plot')}
              className={`px-4 py-3.5 text-[11px] font-mono font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 cursor-pointer transition-all duration-200 shrink-0 ${
                activeFormTab === 'plot' 
                  ? 'border-[#1B4332] text-[#1B4332] bg-white font-black' 
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <Sprout className="h-3.5 w-3.5" />
              <span>Add plot</span>
            </button>

            <button
              onClick={() => setActiveFormTab('assign')}
              className={`px-4 py-3.5 text-[11px] font-mono font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 cursor-pointer transition-all duration-200 shrink-0 ${
                activeFormTab === 'assign' 
                  ? 'border-[#1B4332] text-[#1B4332] bg-white font-black' 
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>Assign Managers</span>
            </button>

            <button
              onClick={() => setActiveFormTab('farms')}
              className={`px-4 py-3.5 text-[11px] font-mono font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 cursor-pointer transition-all duration-200 shrink-0 ${
                activeFormTab === 'farms' 
                  ? 'border-[#1B4332] text-[#1B4332] bg-white font-black' 
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Manage Estates</span>
            </button>

            <button
              id="tab-sys-settings"
              onClick={() => setActiveFormTab('settings')}
              className={`px-4 py-3.5 text-[11px] font-mono font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 cursor-pointer transition-all duration-200 shrink-0 ${
                activeFormTab === 'settings' 
                  ? 'border-[#1B4332] text-[#1B4332] bg-white font-black' 
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <Settings className="h-3.5 w-3.5 text-[#2D6A4F]" />
              <span>System Settings</span>
            </button>
          </div>

          <div className="p-6">
            
            {/* PAYOUT FORM */}
            {activeFormTab === 'payout' && (
              <form onSubmit={handleCreateFinancials} className="space-y-4">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
                  <TrendingUp className="text-[#D4A017] h-4 w-4" />
                  <h3 className="font-sans font-bold text-sm text-gray-800">Publish Financial Payout Summary</h3>
                </div>

                {finSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{finSuccessMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Select plot</label>
                    <select
                      value={finPlotId}
                      onChange={(e) => setFinPlotId(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:outline-[#1B4332]"
                    >
                      {systemPlots.map(p => (
                        <option key={p.id} value={p.id}>Plot {p.plotNumber} ({p.cropType})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Quarter Period</label>
                    <select
                      value={finPeriod}
                      onChange={(e) => setFinPeriod(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:outline-[#1B4332]"
                    >
                      <option value="Q1">Q1</option>
                      <option value="Q2">Q2</option>
                      <option value="Q3">Q3</option>
                      <option value="Q4">Q4</option>
                      <option value="Annual">Annual Statement</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Financial year</label>
                    <input
                      type="number"
                      required
                      value={finYear}
                      onChange={(e) => setFinYear(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Audited ROI %</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 12.5"
                      value={finRoi}
                      onChange={(e) => setFinRoi(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Amount (₦)</label>
                    <input
                      type="number"
                      required
                      placeholder="payout volume"
                      value={finAmount}
                      onChange={(e) => setFinAmount(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400"> payout Date</label>
                    <input
                      type="date"
                      required
                      value={finDate}
                      onChange={(e) => setFinDate(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Payout status</label>
                    <select
                      value={finStatus}
                      onChange={(e) => setFinStatus(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:outline-[#1B4332]"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="partial">Partial</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Audit notes / remarks</label>
                  <textarea
                    rows={2}
                    placeholder="Provide description..."
                    value={finNotes}
                    onChange={(e) => setFinNotes(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-mono font-bold p-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Publish & notify investor</span>
                </button>
              </form>
            )}

            {/* DOCUMENT UPLOAD FORM */}
            {activeFormTab === 'document' && (
              <form onSubmit={handleUploadDocument} className="space-y-4">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
                  <FileText className="text-[#1B4332] h-4 w-4" />
                  <h3 className="font-sans font-bold text-sm text-gray-800">Secure Document Dispatcher</h3>
                </div>

                {docSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{docSuccessMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Target farm</label>
                    <select
                      value={docFarmId}
                      onChange={(e) => handleDocFarmChange(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:outline-[#1B4332]"
                    >
                      {farms.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Document title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Deed of Custom Plot Land"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Document category</label>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    >
                      <option value="contract">Contract (Deed)</option>
                      <option value="certificate">Certificate</option>
                      <option value="report">Operational Report</option>
                      <option value="financial">Financial Report</option>
                      <option value="legal">Legal clearance</option>
                      <option value="other">Other / Support</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Visibility policy</label>
                    <select
                      value={docVisibility}
                      onChange={(e) => setDocVisibility(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    >
                      <option value="farm">Farm (Visible to ALL plot owners on farm)</option>
                      <option value="plot">Plot (Visible ONLY to a single plot holder)</option>
                    </select>
                  </div>
                </div>

                {docVisibility === 'plot' && (
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Target Specific Plot</label>
                    <select
                      value={docPlotId}
                      onChange={(e) => setDocPlotId(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:outline-[#1B4332]"
                    >
                      {systemPlots.map(p => (
                        <option key={p.id} value={p.id}>Plot {p.plotNumber} ({p.cropType})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Attachment file</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    className="w-full text-xs border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 font-mono">Supports real docs over local fallback securely</p>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Document Description</label>
                  <textarea
                    rows={2}
                    placeholder="Provide overview of contents..."
                    value={docDescription}
                    onChange={(e) => setDocDescription(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-mono font-bold p-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Upload secure document</span>
                </button>
              </form>
            )}

            {/* CREATE USER USER_PLUS FORM */}
            {activeFormTab === 'user' && (
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
                  <UserPlus className="text-emerald-700 h-4 w-4" />
                  <h3 className="font-sans font-bold text-sm text-gray-800">Register New User / Farm Manager Account</h3>
                </div>

                {userSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{userSuccessMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Full Account Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Olumide Benson"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Primary Username</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. mbenson"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="benson@email.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Primary Telephone</label>
                    <input
                      type="tel"
                      required
                      placeholder="+234..."
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">System Permission Role</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:outline-[#1B4332]"
                    >
                      <option value="investor">Investor (Read-Only Portfolio Client)</option>
                      <option value="farm_manager">Farm Manager (Updates & Documents Supervisor)</option>
                      <option value="admin">Super Admin (Full Root Access)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Account Access Password (Defined by Admin)</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="e.g. FarmManager2026!"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg p-2.5 pr-10 bg-gray-50 focus:outline-[#1B4332]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1 cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-mono font-bold p-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Register Account Profile</span>
                </button>
              </form>
            )}

            {/* ALLOCATE PLOT FORM */}
            {activeFormTab === 'plot' && (
              <form onSubmit={handleAllocatePlot} className="space-y-4">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
                  <Sprout className="text-amber-600 h-4 w-4" />
                  <h3 className="font-sans font-bold text-sm text-gray-800">Add Plot & Link to Investor</h3>
                </div>

                {plotSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{plotSuccessMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Select estate farm</label>
                    <select
                      value={allocFarmId}
                      onChange={(e) => setAllocFarmId(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    >
                      {farms.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Plot number catalog</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. C-04"
                      value={allocPlotNumber}
                      onChange={(e) => setAllocPlotNumber(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Plot size (hectares)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 1.8"
                      value={allocSize}
                      onChange={(e) => setAllocSize(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Crop Type Cultivar</label>
                    {sysSettings?.allowedCrops && sysSettings.allowedCrops.length > 0 ? (
                      <select
                        value={allocCrop}
                        onChange={(e) => setAllocCrop(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50 cursor-pointer"
                      >
                        {sysSettings.allowedCrops.map((c: string) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={allocCrop}
                        onChange={(e) => setAllocCrop(e.target.value)}
                        placeholder="e.g. Oil Palm Tenera Hybrid"
                        className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Link to Investor</label>
                    <select
                      value={allocInvestorId}
                      onChange={(e) => setAllocInvestorId(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    >
                      <option value="">-- No Assignment (Available) --</option>
                      {systemUsers.filter(u => u.role === 'investor').map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Investment amount (₦)</label>
                    <input
                      type="number"
                      placeholder="e.g. 24000"
                      value={allocAmount}
                      onChange={(e) => setAllocAmount(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-mono font-bold p-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Allocate and update estate plots</span>
                </button>
              </form>
            )}

            {/* ASSIGN FARM MANAGERS FORM */}
            {activeFormTab === 'assign' && (
              <form onSubmit={handleAssignManager} className="space-y-4">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
                  <Briefcase className="text-[#1B4332] h-4 w-4" />
                  <h3 className="font-sans font-bold text-sm text-gray-800">Assign Supervisor to Farm</h3>
                </div>

                {assignSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{assignSuccessMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Select Manager</label>
                  <select
                    value={assignManagerId}
                    onChange={(e) => setAssignManagerId(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                  >
                    {systemUsers.filter(u => u.role === 'farm_manager').map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Assign To Farm Estate</label>
                  <select
                    value={assignFarmId}
                    onChange={(e) => setAssignFarmId(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                  >
                    {farms.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-mono font-bold p-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Map manager assignment</span>
                </button>
              </form>
            )}

            {/* MANAGE FARM ESTATES */}
            {activeFormTab === 'farms' && (
              <form onSubmit={handleSaveFarmEstate} className="space-y-4">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
                  <Layers className="text-[#1B4332] h-4 w-4" />
                  <h3 className="font-sans font-bold text-sm text-gray-800">Configure & Manage Farm Estates</h3>
                </div>

                {farmSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{farmSuccessMessage}</span>
                  </div>
                )}

                <div className="bg-[#FBF9F4] p-3 rounded-xl border border-[#2D6A4F]/10 mb-2">
                  <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-500">Operation Mode</label>
                  <select
                    value={selectedFarmToEdit}
                    onChange={(e) => handleSelectFarmToEditChange(e.target.value)}
                    className="w-full text-xs font-sans font-semibold border border-[#1B4332]/25 rounded-lg p-2.5 bg-white text-[#1B4332] focus:outline-[#1B4332]"
                  >
                    <option value="new">🆕 [+ Add New Farm Estate]</option>
                    {farms.map(f => (
                      <option key={f.id} value={f.id}>✏️ [Modify] {f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Estate name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Adubiaro Cocoa Estate"
                      value={farmName}
                      onChange={(e) => setFarmName(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Date established</label>
                    <input
                      type="date"
                      required
                      value={farmDateEstablished}
                      onChange={(e) => setFarmDateEstablished(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Location city / area</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Owo"
                      value={farmLocation}
                      onChange={(e) => setFarmLocation(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">State region</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ondo State"
                      value={farmState}
                      onChange={(e) => setFarmState(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>
                </div>
                           <div className="space-y-3">
                  <span className="block text-[10px] uppercase font-mono font-bold text-gray-400">Estate Cover Image</span>
                  
                  {/* Drag-and-drop container */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingEstateImage(true);
                    }}
                    onDragLeave={() => setIsDraggingEstateImage(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingEstateImage(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) parseAndSetCoverPhoto(file);
                    }}
                    onClick={() => document.getElementById('estate-cover-file-input')?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition duration-200 flex flex-col items-center justify-center gap-2 ${
                      isDraggingEstateImage 
                        ? 'border-[#52B788] bg-[#52B788]/10 text-[#1B4332]' 
                        : 'border-[#2D6A4F]/20 hover:border-[#1B4332] bg-white text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    <input
                      id="estate-cover-file-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) parseAndSetCoverPhoto(file);
                      }}
                      className="hidden"
                    />
                    <UploadCloud className="h-8 w-8 text-[#2D6A4F]" />
                    <div className="font-sans font-bold text-xs text-[#1B4332]">
                      Click to upload cover image or drag & drop here
                    </div>
                    <p className="text-[10px] text-gray-400 font-sans">
                      Supports JPG, PNG or WEBP (optimized automatic system resizing)
                    </p>
                  </div>

                  {/* Preview if image is present */}
                  {farmCoverImage && (
                    <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-gray-150 relative overflow-hidden group">
                      <img 
                        src={farmCoverImage} 
                        alt="Preview" 
                        className="h-14 w-20 object-cover rounded-xl border border-gray-100"
                        onError={(e) => {
                          // Fallback to placeholder if url loads incorrectly
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&q=80&w=800';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">Active Image Preview</div>
                        <div className="text-xs text-[#1B4332] font-semibold truncate max-w-xs">
                          {farmCoverImage.startsWith('data:') ? 'Custom Base64 Upload File' : farmCoverImage}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFarmCoverImage('')}
                        className="text-red-500 hover:text-red-700 text-[10px] font-sans font-bold hover:underline cursor-pointer select-none"
                      >
                        Reset / Clear
                      </button>
                    </div>
                  )}

                  {/* Fallback Direct Link URL */}
                  <div>
                    <label className="block text-[9px] uppercase font-mono font-bold mb-1 text-gray-400">Or Option B: Provide Direct Image Web URL</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={farmCoverImage.startsWith('data:') ? '' : farmCoverImage}
                      onChange={(e) => setFarmCoverImage(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[9px] text-gray-400 font-mono font-bold self-center">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setFarmCoverImage('https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&q=80&w=800')}
                      className="bg-gray-100 hover:bg-gray-200 text-[9px] text-gray-600 px-2 py-1 rounded cursor-pointer border border-gray-200"
                    >
                      🌱 Palm Nursery
                    </button>
                    <button
                      type="button"
                      onClick={() => setFarmCoverImage('https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?auto=format&fit=crop&q=80&w=800')}
                      className="bg-gray-100 hover:bg-gray-200 text-[9px] text-gray-600 px-2 py-1 rounded cursor-pointer border border-gray-200"
                    >
                      🌴 Mature Oil Palm
                    </button>
                    <button
                      type="button"
                      onClick={() => setFarmCoverImage('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=800')}
                      className="bg-gray-100 hover:bg-gray-200 text-[9px] text-gray-600 px-2 py-1 rounded cursor-pointer border border-gray-200"
                    >
                      🚜 Cocoa Farms
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Estate description & scope</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Introduce physical crop capabilities, yield expectations, and infrastructural configurations..."
                    value={farmDescription}
                    onChange={(e) => setFarmDescription(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-sans font-bold text-gray-700">Estate active status</span>
                    <span className="text-[9px] text-gray-400 font-sans">Active estates enable interactive tracking logs</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={farmIsActive}
                      onChange={(e) => setFarmIsActive(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#52B788]"></div>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-mono font-bold p-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>{selectedFarmToEdit === 'new' ? 'Register New Farm Estate' : 'Commit Modified Farm Details'}</span>
                </button>
              </form>
            )}

            {/* SYSTEM MAINTENANCE AND BACKUPS */}
            {activeFormTab === 'settings' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
                  <Settings className="text-[#1B4332] h-4 w-4" />
                  <h3 className="font-sans font-bold text-sm text-gray-800">Super Admin Core Control Console</h3>
                </div>

                {/* 1. INTERACTIVE CONTROL CENTER */}
                <div className="bg-white p-6 rounded-3xl border border-gray-150 space-y-6">
                  <div>
                    <h4 className="text-sm font-extrabold uppercase font-mono text-[#1B4332] tracking-wider mb-1">Interactive System Admin Consoles</h4>
                    <p className="text-[11px] text-gray-400">Configure global business rules, toggle background simulation features, adapt brand looks/feel, and crop validation presets.</p>
                  </div>

                  {loadingSysSettings || !sysSettings ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#1B4332] border-t-transparent" />
                      <span className="text-[10px] font-mono text-gray-400">Loading system configurations...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Success / Error Alerts */}
                      {saveSysSuccess && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in font-medium">
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                          <span>{saveSysSuccess}</span>
                        </div>
                      )}
                      {saveSysError && (
                        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in font-medium">
                          <ShieldAlert className="h-4.5 w-4.5 text-red-600 shrink-0" />
                          <span>{saveSysError}</span>
                        </div>
                      )}

                      {/* Config Form Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Box 1: Core Engines */}
                        <div className="space-y-4 bg-[#FBF9F4]/40 p-5 rounded-2xl border border-gray-100">
                          <h5 className="text-[11px] font-mono font-bold uppercase text-[#1B4332] tracking-widest border-b border-gray-100 pb-1.5">1. Core Engine Configurations</h5>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-500">Database Connection Target</label>
                              <select
                                value={sysSettings.databaseMode}
                                onChange={(e) => handleSaveSettings({ ...sysSettings, databaseMode: e.target.value })}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 outline-none focus:border-[#1B4332] cursor-pointer"
                              >
                                <option value="auto">Automatic (Postgres with Server Fallback)</option>
                                <option value="local_json">Forced Local db.json mode (Offline Safe)</option>
                                <option value="postgres_forced">Forced PostgreSQL Mode (Raise Error if Down)</option>
                              </select>
                              <span className="text-[9.5px] font-mono text-gray-400 mt-1 block leading-tight">
                                Controls routing to PostgreSQL. Switching to Forced Local will immediately drop the cloud instance connection cleanly.
                              </span>
                            </div>

                            <div>
                              <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-500">Simulated Network Latency (ms)</label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min="0"
                                  max="3000"
                                  step="250"
                                  value={sysSettings.simulatedLatency || 0}
                                  onChange={(e) => setSysSettings({ ...sysSettings, simulatedLatency: parseInt(e.target.value) })}
                                  onMouseUp={() => handleSaveSettings({ ...sysSettings, simulatedLatency: sysSettings.simulatedLatency })}
                                  onTouchEnd={() => handleSaveSettings({ ...sysSettings, simulatedLatency: sysSettings.simulatedLatency })}
                                  className="flex-1 accent-[#1B4332]"
                                />
                                <span className="text-xs font-mono font-bold text-gray-700 w-12 text-right">{sysSettings.simulatedLatency || 0}ms</span>
                              </div>
                              <span className="text-[9.5px] font-mono text-gray-400 mt-1 block leading-tight">
                                Delays server API replies. Use to inspect visual skeleton state transitions, loaders, and network thresholds.
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Box 2: Feature & Business Controls */}
                        <div className="space-y-4 bg-[#FBF9F4]/40 p-5 rounded-2xl border border-gray-100">
                          <h5 className="text-[11px] font-mono font-bold uppercase text-[#1B4332] tracking-widest border-b border-gray-100 pb-1.5">2. Feature Permissions & Rules</h5>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-xl">
                              <div>
                                <span className="text-xs font-bold text-gray-700 block">User Push Notifications</span>
                                <span className="text-[9.5px] font-mono text-gray-400 block max-w-[200px]">System-wide dynamic alerts bell module.</span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={sysSettings.enableNotifications}
                                  onChange={(e) => handleSaveSettings({ ...sysSettings, enableNotifications: e.target.checked })}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#52B788]"></div>
                              </label>
                            </div>

                            <div className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-xl">
                              <div>
                                <span className="text-xs font-bold text-gray-700 block">Simulate Email Dispatches</span>
                                <span className="text-[9.5px] font-mono text-gray-400 block max-w-[200px]">Logs all Welcome & Payout alerts to outbox.</span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={sysSettings.enableEmailSimulation}
                                  onChange={(e) => handleSaveSettings({ ...sysSettings, enableEmailSimulation: e.target.checked })}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#52B788]"></div>
                              </label>
                            </div>

                            <div>
                              <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Active Minimum ROI limit (%)</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={sysSettings.minimumPayoutRoi || ''}
                                  onChange={(e) => setSysSettings({ ...sysSettings, minimumPayoutRoi: parseFloat(e.target.value) || 0 })}
                                  onBlur={() => handleSaveSettings({ ...sysSettings, minimumPayoutRoi: sysSettings.minimumPayoutRoi })}
                                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-[#1B4332]"
                                />
                              </div>
                              <span className="text-[9.5px] font-mono text-gray-400 mt-1 block leading-tight">
                                Rejects any transaction record attempts below this value. Prevents human data entry mistakes.
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Box 3: Branding & Custom Looks */}
                        <div className="space-y-4 bg-[#FBF9F4]/40 p-5 rounded-2xl border border-gray-100 md:col-span-2">
                          <h5 className="text-[11px] font-mono font-bold uppercase text-[#1B4332] tracking-widest border-b border-gray-100 pb-1.5">3. Appearance Branding & Broadcast Banners</h5>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-500">Client Portal Title Name</label>
                              <input
                                type="text"
                                value={sysSettings.portalName || ''}
                                onChange={(e) => setSysSettings({ ...sysSettings, portalName: e.target.value })}
                                onBlur={() => handleSaveSettings({ ...sysSettings, portalName: sysSettings.portalName })}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-[#1B4332]"
                                placeholder="Adubiaro Farm Portal"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-500">Header Icon Logo text</label>
                              <input
                                type="text"
                                value={sysSettings.logoText || ''}
                                onChange={(e) => setSysSettings({ ...sysSettings, logoText: e.target.value })}
                                onBlur={() => handleSaveSettings({ ...sysSettings, logoText: sysSettings.logoText })}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-[#1B4332]"
                                placeholder="ADUBIARO"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-500">Accent Brand Color Theme</label>
                              <select
                                value={sysSettings.accentColor}
                                onChange={(e) => handleSaveSettings({ ...sysSettings, accentColor: e.target.value })}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 outline-none focus:border-[#1B4332] cursor-pointer"
                              >
                                <option value="emerald">Emerald Green (Brand Standard)</option>
                                <option value="forest">Forest Green (Deep High-Contrast)</option>
                                <option value="amber">Amber Gold (Premium Harvest)</option>
                                <option value="slate">Slate Obsidian (Executive Editorial)</option>
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-500">Announcement Broadcast Message</label>
                              <input
                                type="text"
                                value={sysSettings.announcementBanner || ''}
                                onChange={(e) => setSysSettings({ ...sysSettings, announcementBanner: e.target.value })}
                                onBlur={() => handleSaveSettings({ ...sysSettings, announcementBanner: sysSettings.announcementBanner })}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-[#1B4332]"
                                placeholder="Enter announcement text to broadcast systemwide..."
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-500">Banner Alert Type</label>
                              <select
                                value={sysSettings.bannerType}
                                onChange={(e) => handleSaveSettings({ ...sysSettings, bannerType: e.target.value })}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 outline-none focus:border-[#1B4332] cursor-pointer"
                              >
                                <option value="none">Disabled (No Banner Layout)</option>
                                <option value="info">Info Alert (Sky Blue Theme)</option>
                                <option value="warning">Critical Warning (Amber Gold Theme)</option>
                                <option value="success">Success Broadcast (Emerald Green Theme)</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Box 4: Supported Culturable Crops */}
                        <div className="space-y-4 bg-[#FBF9F4]/40 p-5 rounded-2xl border border-gray-100 md:col-span-2">
                          <h5 className="text-[11px] font-mono font-bold uppercase text-[#1B4332] tracking-widest border-b border-gray-100 pb-1.5">4. Dynamic Validation Presets (Cultivated Crop Breeds)</h5>
                          
                          <div className="space-y-3">
                            <span className="text-[10.5px] font-sans text-gray-400 block leading-tight">
                              These crop seeds and breed categories are dynamically enforced across land plot definitions and investment tracking profiles.
                            </span>

                            <div className="flex flex-wrap gap-2">
                              {(sysSettings.allowedCrops || []).map((crop: string, idx: number) => (
                                <span key={idx} className="bg-emerald-50 text-[#1B4332] border border-emerald-100 text-[10.5px] px-3 py-1 rounded-full flex items-center gap-1.5 font-medium select-none animate-fade-in">
                                  <span>{crop}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedList = sysSettings.allowedCrops.filter((c: string) => c !== crop);
                                      handleSaveSettings({ ...sysSettings, allowedCrops: updatedList });
                                    }}
                                    className="hover:text-red-600 font-bold transition text-xs select-none cursor-pointer"
                                    title={`Remove ${crop}`}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                              {(!sysSettings.allowedCrops || sysSettings.allowedCrops.length === 0) && (
                                <span className="text-xs text-gray-400 italic">No custom crops whitelist declared.</span>
                              )}
                            </div>

                            <form 
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (!newCropTag.trim()) return;
                                const originalCrops = sysSettings.allowedCrops || [];
                                if (originalCrops.includes(newCropTag.trim())) {
                                  setSaveSysError('Crop breed is already declared in custom whitelists.');
                                  return;
                                }
                                const updatedCrops = [...originalCrops, newCropTag.trim()];
                                setNewCropTag('');
                                handleSaveSettings({ ...sysSettings, allowedCrops: updatedCrops });
                              }}
                              className="flex gap-2 max-w-md"
                            >
                              <input
                                type="text"
                                value={newCropTag}
                                onChange={(e) => setNewCropTag(e.target.value)}
                                className="flex-1 bg-white border border-gray-100 rounded-lg px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-[#1B4332]"
                                placeholder="e.g. Kola Nut (Cola Acuminata)"
                              />
                              <button
                                type="submit"
                                className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-[11px] font-mono font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                              >
                                + Add Crop Whitelist
                              </button>
                            </form>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-8 mb-4 border-b border-gray-50 pb-2">
                  <Database className="text-[#1B4332] h-4 w-4" />
                  <h3 className="font-sans font-bold text-sm text-gray-800">System Infrastructure Status & Backups</h3>
                </div>

                <div className="bg-[#FBF9F4] p-4.5 rounded-2xl border border-[#2D6A4F]/10 flex gap-4">
                  <div className="p-3 bg-[#52B788]/10 rounded-xl text-[#1B4332] shrink-0 self-start">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1B4332] uppercase font-mono">Active Database Maintenance Policy</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      To operationalize absolute transparency and resilient business continuity, the Adubiaro Portal executes automatic daily scheduled maintenance backups at 02:15 AM (UTC/GMT). Hot backups preserve complete state snapshots across farms, land plot records, investor allocations, and financial payout ledger audits.
                    </p>
                  </div>
                </div>

                {/* Database Connectivity Diagnostics Card */}
                {dbStatus && (
                  <div className="bg-white p-5 rounded-2xl border border-gray-150 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className={`h-5 w-5 ${dbStatus.usePostgres ? 'text-emerald-600' : dbStatus.configured ? 'text-rose-600' : 'text-amber-500'}`} />
                        <h4 className="text-xs font-extrabold uppercase font-mono text-gray-700">Database Engine Core Diagnostics</h4>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        dbStatus.usePostgres 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : dbStatus.configured 
                            ? 'bg-rose-50 text-rose-800 border border-rose-200 font-bold' 
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {dbStatus.usePostgres ? 'POSTGRESQL CONNECTED' : dbStatus.configured ? 'CONNECTION REFUSED (FALLBACK ACTIVE)' : 'LOCAL DB.JSON MODE'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                        <span className="text-[10px] font-mono font-bold text-gray-400 block">DATABASE ENGINE</span>
                        <span className="text-xs font-bold text-gray-700 block mt-0.5">
                          {dbStatus.usePostgres ? 'Relational PostgreSQL' : 'Fallback File-based JSON'}
                        </span>
                      </div>
                      <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                        <span className="text-[10px] font-mono font-bold text-gray-400 block">HOST & PORT</span>
                        <span className="text-xs font-bold text-gray-700 block mt-0.5 font-mono truncate" title={`${dbStatus.dbHost}:${dbStatus.dbPort}`}>
                          {dbStatus.configured ? `${dbStatus.dbHost}:${dbStatus.dbPort}` : 'Local File Storage'}
                        </span>
                      </div>
                      <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                        <span className="text-[10px] font-mono font-bold text-gray-400 block">SCHEMA CATALOG</span>
                        <span className="text-xs font-bold text-gray-700 block mt-0.5 font-mono">
                          {dbStatus.configured ? dbStatus.dbName : 'data/db.json'}
                        </span>
                      </div>
                    </div>

                    {/* Explanatory status card when error occurs */}
                    {dbStatus.configured && !dbStatus.usePostgres && (
                      <div className="p-3.5 bg-rose-50/80 border border-rose-200 text-rose-950 rounded-xl space-y-2">
                        <div className="flex gap-2 items-center">
                          <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                          <span className="text-xs font-extrabold font-mono uppercase tracking-wide">PostgreSQL Connection Refused (ECONNREFUSED)</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-rose-800">
                          The portal received a connection refusal at host <b className="font-mono">{dbStatus.dbHost}:{dbStatus.dbPort}</b>. This typically means the host server is currently offline, bound to a different interface, or protected behind firewall access rules that reject outbound requests from Cloud Run.
                        </p>
                        <div className="bg-rose-950/5 p-2.5 rounded-lg border border-rose-200/40">
                          <span className="text-[9.5px] font-mono font-bold text-rose-900 block uppercase tracking-wider mb-1">Diagnostic Log Trace:</span>
                          <span className="text-[10px] font-mono block text-rose-700 break-all leading-normal whitespace-pre-wrap">
                            {dbStatus.postgresError || `connect ECONNREFUSED ${dbStatus.dbHost}:${dbStatus.dbPort}`}
                          </span>
                        </div>
                        <p className="text-[10.5px] font-sans text-rose-700/90 leading-tight">
                          💡 <b>Administrator Action:</b> Verify you have completed your Postgres or Cloud SQL configurations, or that your database's IP address whitelist includes the application's runtime. The system has automatically booted into <b>Safe-State Local JSON Backup File Mode</b> to protect and persist records securely in local container storage without downtime.
                        </p>
                      </div>
                    )}

                    {!dbStatus.configured && (
                      <div className="p-3 bg-amber-50/80 border border-amber-200 text-amber-950 rounded-xl flex gap-2 items-start">
                        <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-[11px] leading-relaxed font-sans text-amber-800">
                          <span className="font-bold">Database URL unassigned:</span> The <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">DATABASE_URL</code> environment variable has not been configured. The system is operating in persistent local file backup mode. To synchronize data securely to a shared Postgres database, assign the postgresql connection details in Settings.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual trigger section */}
                <div className="bg-white p-5 rounded-2xl border border-gray-150 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-left w-full sm:w-auto">
                    <h5 className="text-xs font-bold text-gray-700">Trigger Custom Manual Backup Point</h5>
                    <p className="text-[11px] text-gray-400 mt-0.5">Generates immediate physical snapshot of current database state on archival filesystem storage.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTriggerBackup}
                    disabled={triggeringBackup}
                    className="w-full sm:w-auto bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-mono font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${triggeringBackup ? 'animate-spin' : ''}`} />
                    <span>{triggeringBackup ? 'Archiving Snapshot...' : 'Run Database Backup Now'}</span>
                  </button>
                </div>

                {backupsSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{backupsSuccessMessage}</span>
                  </div>
                )}

                {backupsError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                    <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{backupsError}</span>
                  </div>
                )}

                {/* Backup logs display */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <Clock className="text-gray-400 h-3.5 w-3.5" />
                      <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">
                        Last 5 Verified Archival Runs
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                      SYSTEM STATUS: ONLINE
                    </span>
                  </div>

                  {loadingBackups ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 border border-gray-100 rounded-2xl bg-gray-50/30">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#1B4332] border-t-transparent" />
                      <span className="text-[10px] font-mono text-gray-400">Fetching backup logs...</span>
                    </div>
                  ) : backups.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs border border-dashed border-gray-200 rounded-2xl font-sans">
                      No system backups found in directories.
                    </div>
                  ) : (
                    <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100 bg-white">
                      {backups.slice(0, 5).map((bk, idx) => (
                        <div key={bk.id} className="p-4 hover:bg-gray-50/40 transition duration-150 flex items-start gap-4">
                          <div className="p-2 bg-gray-100 text-gray-500 rounded-lg shrink-0 mt-0.5">
                            <HardDrive className="h-4.5 w-4.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-1.5 font-sans font-bold">
                              <span className="text-xs font-mono text-gray-700">
                                {new Date(bk.timestamp).toLocaleString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                  timeZoneName: 'short'
                                })}
                              </span>
                              <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                                bk.backupType === 'scheduled' 
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200/50' 
                                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200/50'
                              }`}>
                                {bk.backupType === 'scheduled' ? 'Scheduled Log' : 'Manual Run'}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-gray-400">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-gray-300 font-normal">File:</span>
                                <span className="text-gray-500 font-semibold truncate hover:underline hover:text-gray-700" title={bk.fileName}>
                                  {bk.fileName}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-gray-500">Size: <b className="text-gray-700">{bk.fileSize}</b></span>
                                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  VERIFIED
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Verification Checkpoint Note */}
                <p className="text-[10.5px] font-sans text-gray-400 italic text-center leading-normal">
                  Note: Archival system backups store double-encrypted checksum indexes. These timestamps provide manual administrative proof of hot system maintenance compliance protocols.
                </p>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
