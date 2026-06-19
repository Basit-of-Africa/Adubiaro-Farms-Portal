/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Plus, 
  X, 
  TrendingUp, 
  UserPlus, 
  FileUp, 
  Sprout, 
  RefreshCw, 
  CreditCard,
  Settings,
  ChevronRight,
  Upload,
  Send,
  Users,
  AlertTriangle
} from 'lucide-react';
import { User, UserRole, Farm, FarmPlot } from '../types';

interface QuickActionsProps {
  user: User;
  token: string;
  onTabChange: (tab: string) => void;
  onRefresh: () => void;
}

export default function QuickActions({ user, token, onTabChange, onRefresh }: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'payout' | 'user' | 'document' | 'update' | null>(null);
  
  // Dynamic Option Fetch Lists
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmLoading, setFarmLoading] = useState(false);
  const [plots, setPlots] = useState<FarmPlot[]>([]);
  const [plotsLoading, setPlotsLoading] = useState(false);
  const [investors, setInvestors] = useState<User[]>([]);
  const [investorsLoading, setInvestorsLoading] = useState(false);

  // --- ACTION FIELDS ---
  // Payout Form
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [selectedPlotId, setSelectedPlotId] = useState('');
  const [payoutPeriod, setPayoutPeriod] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual'>('Q1');
  const [payoutYear, setPayoutYear] = useState<number>(new Date().getFullYear());
  const [payoutRoi, setPayoutRoi] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [payoutStatus, setPayoutStatus] = useState('paid');
  const [payoutDate, setPayoutDate] = useState(new Date().toISOString().split('T')[0]);

  // User Form
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'investor' | 'farm_manager' | 'admin'>('investor');

  // Document Form
  const [docFarmId, setDocFarmId] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('report');
  const [docDesc, setDocDesc] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  // Manager Update Form
  const [updateFarmId, setUpdateFarmId] = useState('');
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateType, setUpdateType] = useState('general');
  const [updateBody, setUpdateBody] = useState('');
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [updateCaption, setUpdateCaption] = useState('');
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [selectedInvestorIds, setSelectedInvestorIds] = useState<string[]>([]);
  const [farmInvestors, setFarmInvestors] = useState<User[]>([]);

  // Response Signals
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  // References
  const menuRef = useRef<HTMLDivElement>(null);

  // Autoclose menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Farms whenever user is Admin or Manager
  const fetchFarmsList = async () => {
    if (user.role === UserRole.INVESTOR) return;
    try {
      setFarmLoading(true);
      const res = await fetch('/api/farms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFarms(data);
        if (data.length > 0) {
          setSelectedFarmId(data[0].id);
          setDocFarmId(data[0].id);
          setUpdateFarmId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load farms list:', err);
    } finally {
      setFarmLoading(false);
    }
  };

  // Fetch Plots for selected Payout Farm
  const fetchPlotsForFarm = async (farmId: string) => {
    if (!farmId) return;
    try {
      setPlotsLoading(true);
      const res = await fetch(`/api/farms/${farmId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const farmPlots = data.plots || [];
        setPlots(farmPlots);
        if (farmPlots.length > 0) {
          setSelectedPlotId(farmPlots[0].id);
        } else {
          setSelectedPlotId('');
        }
      }
    } catch (err) {
      console.error('Failed to load farm plots:', err);
    } finally {
      setPlotsLoading(false);
    }
  };

  // Fetch Farm Specific Investors
  const fetchInvestorsForFarm = async (farmId: string) => {
    if (!farmId) return;
    try {
      setInvestorsLoading(true);
      const res = await fetch(`/api/farms/${farmId}/investors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFarmInvestors(data);
      }
    } catch (err) {
      console.error('Failed to load farm investors:', err);
    } finally {
      setInvestorsLoading(false);
    }
  };

  // Effect to load farm list
  useEffect(() => {
    if (activeModal) {
      fetchFarmsList();
    }
  }, [activeModal]);

  // Effect to load plots / investors on selection changes
  useEffect(() => {
    if (activeModal === 'payout' && selectedFarmId) {
      fetchPlotsForFarm(selectedFarmId);
    }
  }, [selectedFarmId, activeModal]);

  useEffect(() => {
    if (activeModal === 'update' && updateFarmId) {
      fetchInvestorsForFarm(updateFarmId);
      setSelectedInvestorIds([]);
    }
  }, [updateFarmId, activeModal]);

  // Submissions Handles
  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlotId) {
      setErrorText('Please select an active plot!');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorText(null);
      setSuccessText(null);
      const res = await fetch('/api/financials/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plotId: selectedPlotId,
          period: payoutPeriod,
          year: payoutYear,
          roiPercentage: Number(payoutRoi),
          payoutAmount: Number(payoutAmount),
          payoutDate: payoutDate,
          notes: payoutNotes,
          status: payoutStatus
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to file payout ledger');
      
      setSuccessText(`Ledger payment of $${Number(payoutAmount).toLocaleString()} registered! Notification dispatched.`);
      setPayoutRoi('');
      setPayoutAmount('');
      setPayoutNotes('');
      onRefresh();
    } catch (err: any) {
      setErrorText(err.message || 'System error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorText(null);
      setSuccessText(null);
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
      if (!res.ok) throw new Error(data.error || 'Setup profile failed');

      setSuccessText(`System account for "${data.name}" (Role: ${newRole}) successfully configured!`);
      setNewUsername('');
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      onRefresh();
    } catch (err: any) {
      setErrorText(err.message || 'System error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFarmId) {
      setErrorText('Select a target farm estate first.');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorText(null);
      setSuccessText(null);

      const formData = new FormData();
      formData.append('title', docTitle);
      formData.append('category', docCategory);
      formData.append('description', docDesc);
      if (docFile) {
        formData.append('file', docFile);
      }

      const res = await fetch(`/api/documents/farm/${docFarmId}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Document registry failed');

      setSuccessText(`Deed document "${data.title}" successfully dispatched to farm investors!`);
      setDocTitle('');
      setDocDesc('');
      setDocFile(null);
      onRefresh();
    } catch (err: any) {
      setErrorText(err.message || 'File upload failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateFarmId) {
      setErrorText('Target farm estate not detected.');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorText(null);
      setSuccessText(null);

      const formData = new FormData();
      formData.append('title', updateTitle);
      formData.append('updateType', updateType);
      formData.append('body', updateBody);
      if (updateFile) {
        formData.append('image', updateFile);
      }
      formData.append('caption', updateCaption);
      formData.append('isPublished', 'true');
      if (isPersonalized && selectedInvestorIds.length > 0) {
        formData.append('targetInvestorIds', JSON.stringify(selectedInvestorIds));
      }

      const res = await fetch(`/api/updates/farm/${updateFarmId}/new`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chronicle commit failed');

      setSuccessText('Chronicle update published! Land update alert dispatched to email outbox.');
      setUpdateTitle('');
      setUpdateBody('');
      setUpdateFile(null);
      setUpdateCaption('');
      setSelectedInvestorIds([]);
      setIsPersonalized(false);
      onRefresh();
    } catch (err: any) {
      setErrorText(err.message || 'Failed to dispatch chronicle update');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabShortcut = (tabId: string) => {
    onTabChange(tabId);
    setIsOpen(false);
  };

  const handleManualRefresh = () => {
    onRefresh();
    setIsOpen(false);
    // Flash a temporary notification in the portal
    const notification = document.createElement('div');
    notification.className = "fixed bottom-24 right-8 bg-[#1B4332] text-white px-5 py-3 rounded-2xl shadow-premium text-xs font-semibold z-50 flex items-center gap-2 border border-[#52B788]/20 animate-bounce";
    notification.innerHTML = `<svg class="animate-spin h-3.5 w-3.5 text-[#52B788]" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Re-aligning farm nodes...`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  };

  const toggleInvestorCheckbox = (invId: string) => {
    if (selectedInvestorIds.includes(invId)) {
      setSelectedInvestorIds(selectedInvestorIds.filter(id => id !== invId));
    } else {
      setSelectedInvestorIds([...selectedInvestorIds, invId]);
    }
  };

  return (
    <>
      {/* Floating Menu Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40" ref={menuRef}>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              className="absolute bottom-16 right-0 w-72 bg-white rounded-3xl border border-[#2D6A4F]/10 shadow-premium overflow-hidden p-3 space-y-1 mb-2"
            >
              <div className="px-3 py-2 border-b border-gray-50 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold">Quick Actions</span>
                <span className="bg-[#52B788]/15 text-[#1B4332] text-[9.5px] px-2 py-0.5 rounded-full font-bold uppercase">
                  {user.role.replace('_', ' ')}
                </span>
              </div>

              <div className="py-1.5 space-y-1 max-h-[320px] overflow-y-auto">
                {/* --- ADMINISTRATOR ACTIONS --- */}
                {user.role === UserRole.ADMIN && (
                  <>
                    <button
                      onClick={() => { setActiveModal('payout'); setIsOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-stone-50 flex items-center justify-between text-xs text-gray-700 cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700 group-hover:bg-emerald-100 transition">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Log Payout</p>
                          <p className="text-[10px] text-gray-400 font-normal">File structured financial record</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </button>

                    <button
                      onClick={() => { setActiveModal('user'); setIsOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-stone-50 flex items-center justify-between text-xs text-gray-700 cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-700 group-hover:bg-blue-100 transition">
                          <UserPlus className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Add Investor</p>
                          <p className="text-[10px] text-gray-400 font-normal">Provision profile key auth</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </button>

                    <button
                      onClick={() => { setActiveModal('document'); setIsOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-stone-50 flex items-center justify-between text-xs text-gray-700 cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-700 group-hover:bg-amber-100 transition">
                          <FileUp className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Upload Deed/File</p>
                          <p className="text-[10px] text-gray-400 font-normal">Dispatch secure contractual file</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </button>
                  </>
                )}

                {/* --- FARM MANAGER ACTIONS --- */}
                {user.role === UserRole.FARM_MANAGER && (
                  <>
                    <button
                      onClick={() => { setActiveModal('update'); setIsOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-stone-50 flex items-center justify-between text-xs text-gray-700 cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700 group-hover:bg-emerald-100 transition">
                          <Sprout className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Publish Chronicle</p>
                          <p className="text-[10px] text-gray-400 font-normal">Broadcast soil development updates</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </button>

                    <button
                      onClick={() => { setActiveModal('document'); setIsOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-stone-50 flex items-center justify-between text-xs text-gray-700 cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-700 group-hover:bg-amber-100 transition">
                          <FileUp className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Upload Report</p>
                          <p className="text-[10px] text-gray-400 font-normal">Push operational documents</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </button>
                  </>
                )}

                {/* --- INVESTOR ACTIONS --- */}
                {user.role === UserRole.INVESTOR && (
                  <>
                    <button
                      onClick={() => handleTabShortcut('financials')}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-stone-50 flex items-center justify-between text-xs text-gray-700 cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700 group-hover:bg-emerald-100 transition">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">View Live Ledger</p>
                          <p className="text-[10px] text-gray-400 font-normal">Audit total capitalization and ROI</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </button>

                    <button
                      onClick={() => handleTabShortcut('settings')}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-stone-50 flex items-center justify-between text-xs text-gray-700 cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-stone-50 rounded-lg text-stone-700 group-hover:bg-stone-100 transition">
                          <Settings className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Verify Profile Security</p>
                          <p className="text-[10px] text-gray-400 font-normal">Audit phone, authentication key</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </button>
                  </>
                )}

                {/* --- SHARED SYSTEM SHORTCUTS --- */}
                <button
                  onClick={handleManualRefresh}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-stone-50 flex items-center justify-between text-xs text-gray-700 cursor-pointer transition group border-t border-gray-150 pt-3 mt-1.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[#FBF9F4] rounded-lg text-[#1B4332] group-hover:bg-stone-100 transition">
                      <RefreshCw className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Re-Align Farm Nodes</p>
                      <p className="text-[10px] text-gray-400 font-normal">Synchronize latest telemetry</p>
                    </div>
                  </div>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full bg-[#1B4332] hover:bg-[#2D6A4F] text-[#52B788] hover:text-white shadow-premium flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-95 border border-[#52B788]/20 group relative overflow-hidden`}
          aria-label="Quick action menu"
          id="btn-quick-actions"
        >
          {/* Subtle glowing ring */}
          <div className="absolute inset-0 bg-radial from-[#52B788]/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="h-6 w-6 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="sparkles"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center"
              >
                <Sparkles className="h-6 w-6 font-bold" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* --- FORM OVERLAY MODALS --- */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-gray-150 shadow-premium w-full max-w-xl overflow-hidden my-8"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-[#FBF9F4]/70">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-[#1B4332]/10 rounded-2xl flex items-center justify-center text-[#1B4332]">
                    {activeModal === 'payout' && <TrendingUp className="h-5 w-5" />}
                    {activeModal === 'user' && <UserPlus className="h-5 w-5" />}
                    {activeModal === 'document' && <FileUp className="h-5 w-5" />}
                    {activeModal === 'update' && <Sprout className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-gray-800 text-base leading-tight">
                      {activeModal === 'payout' && 'Log Structured Payout'}
                      {activeModal === 'user' && 'Provision Investor profile'}
                      {activeModal === 'document' && 'Dispatch Deed/Contract'}
                      {activeModal === 'update' && 'Publish Field Chronicle'}
                    </h3>
                    <p className="text-[10.5px] text-gray-400 font-mono font-medium mt-0.5">
                      {activeModal === 'payout' && 'FILE REVENUE RECOGNITION AUDIT'}
                      {activeModal === 'user' && 'SYSTEM KEY-CREDENTIAL AUTHORIZATION'}
                      {activeModal === 'document' && 'CONTRACTUAL LEGAL AGREEMENTS DISPATCH'}
                      {activeModal === 'update' && 'CHRONIOLE RADIAL TELEMETRY FEED'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setActiveModal(null); setErrorText(null); setSuccessText(null); }}
                  className="p-1.5 rounded-xl hover:bg-stone-100 text-gray-400 hover:text-gray-600 transition cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Status alerts */}
              {successText && (
                <div className="p-4 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-xs flex items-start gap-2.5 font-sans leading-relaxed">
                  <div className="w-5 h-5 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center flex-shrink-0 font-bold">✓</div>
                  <div>{successText}</div>
                </div>
              )}

              {errorText && (
                <div className="p-4 bg-rose-50 border-b border-rose-100 text-rose-800 text-xs flex items-start gap-2.5 font-sans leading-relaxed">
                  <AlertTriangle className="h-5 w-5 text-rose-700 flex-shrink-0" />
                  <div>{errorText}</div>
                </div>
              )}

              {/* Modal Body Forms */}
              <div className="p-6 overflow-y-auto max-h-[70vh] md:max-h-[calc(100vh-220px)]">
                
                {/* 1. PAYOUT FORM */}
                {activeModal === 'payout' && (
                  <form onSubmit={handlePayoutSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Target Estate</label>
                        <select
                          value={selectedFarmId}
                          onChange={(e) => setSelectedFarmId(e.target.value)}
                          className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-bold"
                          required
                        >
                          <option value="">-- Choose Farm Estate --</option>
                          {farms.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Specific Land Plot</label>
                        <select
                          value={selectedPlotId}
                          onChange={(e) => setSelectedPlotId(e.target.value)}
                          className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-bold font-mono"
                          required
                          disabled={plotsLoading || !selectedFarmId}
                        >
                          <option value="">{plotsLoading ? 'Pulling land plots...' : '-- Choose Plot --'}</option>
                          {plots.map(p => (
                            <option key={p.id} value={p.id}>Plot {p.plotNumber} ({p.cropType})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Financial period</label>
                        <select
                          value={payoutPeriod}
                          onChange={(e) => setPayoutPeriod(e.target.value as any)}
                          className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-bold"
                          required
                        >
                          <option value="Q1">Q1 Quarter</option>
                          <option value="Q2">Q2 Quarter</option>
                          <option value="Q3">Q3 Quarter</option>
                          <option value="Q4">Q4 Quarter</option>
                          <option value="annual">Annual Fiscal</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Calendar Year</label>
                        <input
                          type="number"
                          value={payoutYear}
                          onChange={(e) => setPayoutYear(Number(e.target.value))}
                          className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-bold font-mono"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">payout Date</label>
                        <input
                          type="date"
                          value={payoutDate}
                          onChange={(e) => setPayoutDate(e.target.value)}
                          className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-bold font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Return ROI Percentage (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g., 14.5"
                          value={payoutRoi}
                          onChange={(e) => setPayoutRoi(e.target.value)}
                          className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-bold font-mono"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Payout Volume Amount ($)</label>
                        <input
                          type="number"
                          placeholder="e.g., 2500"
                          value={payoutAmount}
                          onChange={(e) => setPayoutAmount(e.target.value)}
                          className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-bold font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Payout status</label>
                      <div className="flex gap-4">
                        {['paid', 'pending', 'partial', 'overdue'].map(status => (
                          <label key={status} className="flex items-center gap-2 text-xs font-mono font-bold text-gray-600 capitalize cursor-pointer">
                            <input
                              type="radio"
                              name="payout_status"
                              checked={payoutStatus === status}
                              onChange={() => setPayoutStatus(status)}
                              className="accent-[#1B4332]"
                            />
                            {status}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Notes / details</label>
                      <textarea
                        rows={3}
                        placeholder="Provide details about yield quality, rainfall parameters, or administrative records."
                        value={payoutNotes}
                        onChange={(e) => setPayoutNotes(e.target.value)}
                        className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-sans"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-[#1B4332] text-[#52B788] hover:text-white rounded-xl text-xs font-bold uppercase hover:bg-[#2D6A4F] transition flex items-center justify-center gap-2 cursor-pointer shadow-sm border border-[#52B788]/20"
                    >
                      {isSubmitting ? 'Filing payout record...' : 'File Payout Record'}
                      <TrendingUp className="h-4 w-4" />
                    </button>
                  </form>
                )}

                {/* 2. USER/INVESTOR PROFILE FORM */}
                {activeModal === 'user' && (
                  <form onSubmit={handleUserSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Unique Username ID *</label>
                        <input
                          type="text"
                          placeholder="e.g., adeyemi20"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-bold font-mono"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Full Legal Name *</label>
                        <input
                          type="text"
                          placeholder="e.g., Prince Adeyemi"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-bold"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Electronic Mail Address *</label>
                        <input
                          type="email"
                          placeholder="e.g., adeyemi@example.com"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-semibold"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Telephone Contact number</label>
                        <input
                          type="tel"
                          placeholder="+234..."
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-semibold font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">System Authorization level *</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as any)}
                        className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-bold"
                        required
                      >
                        <option value="investor">Deeded Estate Investor</option>
                        <option value="farm_manager">Operational Farm Manager</option>
                        <option value="admin">Portal Administrator</option>
                      </select>
                    </div>

                    <div className="p-3 bg-[#FBF9F4] rounded-2xl border text-[11px] leading-relaxed text-gray-500 font-sans">
                      💡 Note: Provisioning generates safe static credential access keys (<b className="font-bold text-gray-800">Password: {newUsername && newUsername.length > 3 ? newUsername.charAt(0).toUpperCase() + newUsername.slice(1) + '@1234' : 'Username@1234'}</b>) enabling user dashboard audits immediately.
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-[#1B4332] text-[#52B788] hover:text-white rounded-xl text-xs font-bold uppercase hover:bg-[#2D6A4F] transition flex items-center justify-center gap-2 cursor-pointer shadow-sm border border-[#52B788]/20"
                    >
                      {isSubmitting ? 'Registering user...' : 'Provision Portal Account'}
                      <UserPlus className="h-4 w-4" />
                    </button>
                  </form>
                )}

                {/* 3. DOCUMENT UPLOAD FORM */}
                {activeModal === 'document' && (
                  <form onSubmit={handleDocumentSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Select Target Estate *</label>
                      <select
                        value={docFarmId}
                        onChange={(e) => setDocFarmId(e.target.value)}
                        className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-bold"
                        required
                      >
                        <option value="">-- Choose Farm Estate --</option>
                        {farms.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Contract / Document Title *</label>
                        <input
                          type="text"
                          placeholder="e.g., Deeded Certificate of Occupancy"
                          value={docTitle}
                          onChange={(e) => setDocTitle(e.target.value)}
                          className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-bold"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Document Category *</label>
                        <select
                          value={docCategory}
                          onChange={(e) => setDocCategory(e.target.value)}
                          className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-bold"
                          required
                        >
                          <option value="contract">Legal Agreement / Contract</option>
                          <option value="certificate">Ownership Deed / Certificate</option>
                          <option value="report">Soil Yield report</option>
                          <option value="financial">Audit File / Financial</option>
                          <option value="legal">Operational Charter</option>
                          <option value="other">General document</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Description / Metadata</label>
                      <textarea
                        rows={2}
                        placeholder="Provide details about the document contents or legal verification keys."
                        value={docDesc}
                        onChange={(e) => setDocDesc(e.target.value)}
                        className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Attach File Document *</label>
                      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 bg-[#FBF9F4] hover:bg-stone-50 transition text-center relative">
                        <input
                          type="file"
                          onChange={(e) => setDocFile(e.target.files ? e.target.files[0] : null)}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                          required
                        />
                        <Upload className="h-6 w-6 text-[#1B4332] mx-auto mb-2 opacity-60" />
                        <p className="text-xs font-bold text-gray-700">
                          {docFile ? docFile.name : 'Click or Drag document file to attach'}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono mt-1">PDF, PNG, JPG or DOCX up to 10MB</p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-[#1B4332] text-[#52B788] hover:text-white rounded-xl text-xs font-bold uppercase hover:bg-[#2D6A4F] transition flex items-center justify-center gap-2 cursor-pointer shadow-sm border border-[#52B788]/20"
                    >
                      {isSubmitting ? 'Uploading document...' : 'Dispatch Secure Document'}
                      <FileUp className="h-4 w-4" />
                    </button>
                  </form>
                )}

                {/* 4. CHRONICLE UPDATE FORM */}
                {activeModal === 'update' && (
                  <form onSubmit={handleUpdateSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Target Farm Estate *</label>
                      <select
                        value={updateFarmId}
                        onChange={(e) => setUpdateFarmId(e.target.value)}
                        className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-bold"
                        required
                      >
                        <option value="">-- Choose Farm Estate --</option>
                        {farms.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Chronicle title *</label>
                        <input
                          type="text"
                          placeholder="e.g., Wet season planting completed"
                          value={updateTitle}
                          onChange={(e) => setUpdateTitle(e.target.value)}
                          className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-bold"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Update classification *</label>
                        <select
                          value={updateType}
                          onChange={(e) => setUpdateType(e.target.value)}
                          className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-bold"
                          required
                        >
                          <option value="general">General announcement</option>
                          <option value="planting">Sprouting / Planting Node</option>
                          <option value="growth">Leaf Area Canopy growth</option>
                          <option value="harvest">Yield Harvest</option>
                          <option value="maintenance">Pest / Soil maintenance</option>
                          <option value="weather">Meteorological / Weather</option>
                          <option value="milestone">Milestone achievement</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Update description / body *</label>
                      <textarea
                        rows={3}
                        placeholder="Document observations regarding weather patterns, canopy indexes, water levels, or harvest weights."
                        value={updateBody}
                        onChange={(e) => setUpdateBody(e.target.value)}
                        className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-sans"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Add Canopy Photo (Optional)</label>
                        <div className="border border-dashed border-gray-200 rounded-xl p-3 bg-[#FBF9F4] text-center relative select-none">
                          <input
                            type="file"
                            onChange={(e) => setUpdateFile(e.target.files ? e.target.files[0] : null)}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                          />
                          <Upload className="h-4.5 w-4.5 text-[#1B4332] mx-auto mb-1 opacity-60" />
                          <p className="text-[11px] font-bold text-gray-600">
                            {updateFile ? updateFile.name : 'Select JPG or PNG'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1">Photo caption</label>
                        <input
                          type="text"
                          placeholder="e.g., Healthy crop canopy growth"
                          value={updateCaption}
                          onChange={(e) => setUpdateCaption(e.target.value)}
                          className="w-full bg-[#FBF9F4] p-3 text-xs rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#1B4332]/20 font-semibold"
                          disabled={!updateFile}
                        />
                      </div>
                    </div>

                    {/* Target Personalization Toggle */}
                    <div className="p-3.5 bg-[#FBF9F4] rounded-2xl border border-gray-150 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-800">Target Specific Investors</p>
                          <p className="text-[10px] text-gray-400 font-normal">Only visible to chosen crop holders</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isPersonalized}
                          onChange={(e) => setIsPersonalized(e.target.checked)}
                          className="h-4.5 w-4.5 accent-[#1B4332] cursor-pointer"
                        />
                      </div>

                      {isPersonalized && (
                        <div className="border-t border-gray-200 pt-2.5 space-y-1.5">
                          <label className="block text-[9.5px] font-mono font-bold uppercase text-gray-400 mb-1">Select target active investors</label>
                          <div className="max-h-[100px] overflow-y-auto space-y-1 pl-1">
                            {investorsLoading ? (
                              <p className="text-[10px] text-gray-400 font-mono">Fetching profiles...</p>
                            ) : farmInvestors.length === 0 ? (
                              <p className="text-[10px] text-gray-400 font-sans">No registered investors assigned to this farm.</p>
                            ) : (
                              farmInvestors.map(inv => (
                                <label key={inv.id} className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={selectedInvestorIds.includes(inv.id)}
                                    onChange={() => toggleInvestorCheckbox(inv.id)}
                                    className="accent-[#1B4332]"
                                  />
                                  <span>{inv.name} ({inv.email})</span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-[#1B4332] text-[#52B788] hover:text-white rounded-xl text-xs font-bold uppercase hover:bg-[#2D6A4F] transition flex items-center justify-center gap-2 cursor-pointer shadow-sm border border-[#52B788]/20"
                    >
                      {isSubmitting ? 'Posting chronicle update...' : 'Publish Chronicle Update'}
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
