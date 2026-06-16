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
  ArrowRight
} from 'lucide-react';
import { User, Farm, FarmPlot, UserRole, DocumentCategory, DocumentVisibility, FinancialStatus } from '../types';

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
  const [activeFormTab, setActiveFormTab] = useState<'payout' | 'document' | 'user' | 'plot' | 'assign'>('payout');

  // 1. Create User
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('investor');
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
          role: newRole
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'User setup error');

      setUserSuccessMessage(`Investor account ${data.name} provisioned successfully! Signals triggered a welcome notification.`);
      setNewUsername('');
      setNewName('');
      setNewEmail('');
      setNewPhone('');
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
        <div className="flex gap-3">
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
        </div>
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
            <div className="text-xl font-bold text-[#1B4332] font-serif mt-0.5">${stats?.totalInvestment?.toLocaleString()}</div>
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
                  ? 'border-[#1B4332] text-[#1B4332] bg-white font-black' 
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Create investor</span>
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

                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-3 gap-4">
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
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Amount ($)</label>
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

                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
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
                  <UserPlus className="text-emerald-600 h-4 w-4" />
                  <h3 className="font-sans font-bold text-sm text-gray-800">Register New Investor Client</h3>
                </div>

                {userSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{userSuccessMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Full client name</label>
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
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Primary username</label>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Email address</label>
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
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Primary telephone</label>
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

                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">System Permission Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:outline-[#1B4332]"
                  >
                    <option value="investor">Investor (Read-Only Portfolio client)</option>
                    <option value="farm_manager">Farm Manager (Updates & documents supervisor)</option>
                    <option value="admin">Super Admin (Full root access)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-mono font-bold p-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Register client profile</span>
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

                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
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
                    <input
                      type="text"
                      value={allocCrop}
                      onChange={(e) => setAllocCrop(e.target.value)}
                      placeholder="e.g. Oil Palm Tenera Hybrid"
                      className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400">Investment amount ($)</label>
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

          </div>
        </div>

      </div>
    </div>
  );
}
