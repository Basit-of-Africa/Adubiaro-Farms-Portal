/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Calendar, 
  User, 
  FileText, 
  Send, 
  ChevronRight, 
  Inbox, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  XCircle, 
  Paperclip,
  Search,
  Users,
  CheckSquare,
  Square,
  Trash2,
  FileVideo,
  RefreshCw
} from 'lucide-react';
import { SimulatedEmail, User as UserType, UserRole } from '../types';

interface EmailOutboxProps {
  token: string;
  refreshSignal: number;
}

export default function EmailOutbox({ token, refreshSignal }: EmailOutboxProps) {
  const [emails, setEmails] = useState<SimulatedEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<SimulatedEmail | null>(null);
  const [loading, setLoading] = useState(true);

  // Broadcast related state variables
  const [activeTab, setActiveTab] = useState<'logs' | 'broadcast'>('logs');
  const [investors, setInvestors] = useState<UserType[]>([]);
  const [selectedInvestorIds, setSelectedInvestorIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [broadcastForm, setBroadcastForm] = useState({
    subject: '',
    body: ''
  });
  const [broadcastAttachment, setBroadcastAttachment] = useState<File | null>(null);
  const [broadcastAttachmentPreview, setBroadcastAttachmentPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/emails/outbox', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const val = await res.json();
        setEmails(val);
        if (val.length > 0) {
          setSelectedEmail(val[0]);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [token, refreshSignal]);

  // Fetch investors list
  const fetchInvestors = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data: UserType[] = await res.json();
        const investorUsers = data.filter(u => u.role === UserRole.INVESTOR);
        setInvestors(investorUsers);
      }
    } catch (err) {
      console.error('Failed to fetch investors list:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'broadcast') {
      fetchInvestors();
    }
  }, [activeTab, token]);

  const filteredInvestors = investors.filter(inv => {
    const q = searchQuery.toLowerCase();
    return inv.name.toLowerCase().includes(q) || inv.email.toLowerCase().includes(q);
  });

  const handleToggleInvestor = (id: string) => {
    if (selectedInvestorIds.includes(id)) {
      setSelectedInvestorIds(selectedInvestorIds.filter(x => x !== id));
    } else {
      setSelectedInvestorIds([...selectedInvestorIds, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    const visibleIds = filteredInvestors.map(inv => inv.id);
    setSelectedInvestorIds(Array.from(new Set([...selectedInvestorIds, ...visibleIds])));
  };

  const handleDeselectAllFiltered = () => {
    const visibleIds = filteredInvestors.map(inv => inv.id);
    setSelectedInvestorIds(selectedInvestorIds.filter(id => !visibleIds.includes(id)));
  };

  const handleFileChange = (file: File) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setBroadcastError("File size exceeds 50MB limit. Please choose a file smaller than 50MB.");
      return;
    }
    setBroadcastAttachment(file);
    const previewUrl = URL.createObjectURL(file);
    setBroadcastAttachmentPreview(previewUrl);
    setBroadcastError(null);
  };

  const handleRemoveAttachment = () => {
    setBroadcastAttachment(null);
    if (broadcastAttachmentPreview) {
      if (broadcastAttachmentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(broadcastAttachmentPreview);
      }
      setBroadcastAttachmentPreview(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedInvestorIds.length === 0) {
      setBroadcastError('Please select at least one recipient investor.');
      return;
    }
    if (!broadcastForm.subject || !broadcastForm.body) {
      setBroadcastError('Please provide both a subject and a body for the broadcast.');
      return;
    }

    setSendingBroadcast(true);
    setBroadcastError(null);
    setBroadcastSuccess(null);

    try {
      const formData = new FormData();
      formData.append('recipientIds', selectedInvestorIds.join(','));
      formData.append('subject', broadcastForm.subject);
      formData.append('body', broadcastForm.body);
      if (broadcastAttachment) {
        formData.append('attachment', broadcastAttachment);
      }

      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setBroadcastSuccess(`Broadcast successfully delivered to ${data.count} investor(s)!`);
        
        // Reset form
        setBroadcastForm({ subject: '', body: '' });
        setSelectedInvestorIds([]);
        setSearchQuery('');
        handleRemoveAttachment();
        
        // Refresh emails list so the logs show up
        fetchEmails();
        
        // Auto-switch to logs tab after a short delay
        setTimeout(() => {
          setActiveTab('logs');
          setBroadcastSuccess(null);
        }, 2500);
      } else {
        const errData = await res.json();
        setBroadcastError(errData.error || 'Failed to dispatch broadcast.');
      }
    } catch (err) {
      setBroadcastError('Network error: Unable to dispatch broadcast.');
    } finally {
      setSendingBroadcast(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1B4332] border-t-transparent animate-fade-in" />
      </div>
    );
  }

  return (
    <div id="email-outbox-stage" className="space-y-8 animate-fade-in">
      
      {/* Tab Switcher & Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="font-sans font-bold text-2xl text-gray-800 tracking-tight flex items-center gap-2">
            <span>Simulated Notification Portal</span>
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">Real-time outbox tracking and multiple-recipient administrative broadcasts</p>
        </div>

        <div className="flex items-center gap-2 border border-gray-100 bg-gray-50/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition duration-150 flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-white text-[#1B4332] shadow-sm border border-gray-200/50'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Logs & Streams</span>
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition duration-150 flex items-center gap-1.5 ${
              activeTab === 'broadcast'
                ? 'bg-white text-[#1B4332] shadow-sm border border-gray-200/50'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Send Broadcast</span>
          </button>
        </div>
      </div>

      {activeTab === 'broadcast' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 animate-fade-in">
          <div className="border-b border-gray-150 pb-4">
            <h3 className="font-sans font-bold text-lg text-gray-800 tracking-tight flex items-center gap-2">
              <Users className="h-5 w-5 text-[#2D6A4F]" />
              <span>Compose Investor Broadcast Notification</span>
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">Dispatches emails, files attachments, and creates direct message system notifications for all selected investors in real-time</p>
          </div>

          {broadcastSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-4 flex items-center gap-2.5 animate-fade-in">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="font-sans">
                <p className="font-bold">{broadcastSuccess}</p>
                <p className="text-[10px] text-emerald-600 mt-0.5 font-mono">Redirecting you to outbox logs to inspect dispatches...</p>
              </div>
            </div>
          )}

          {broadcastError && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-4 flex items-center gap-2.5 animate-fade-in">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <div className="font-sans">
                <p className="font-bold">Broadcast Failed</p>
                <p className="text-[10px] text-red-600 mt-0.5 font-mono">{broadcastError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSendBroadcast} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column - Recipient Selector (5 cols) */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono font-extrabold text-[#1B4332] uppercase tracking-wider">
                  Select Recipient Investors
                </label>
                <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200/50 px-2 py-0.5 rounded-full">
                  {selectedInvestorIds.length} Selected
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs font-sans placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#2D6A4F] focus:border-[#2D6A4F] bg-gray-50/50"
                />
              </div>

              {/* Selection Controls */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="flex-1 py-1.5 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-lg text-[10px] font-bold cursor-pointer transition duration-150"
                >
                  Select All Visible
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllFiltered}
                  className="flex-1 py-1.5 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-lg text-[10px] font-bold cursor-pointer transition duration-150"
                >
                  Clear Visible Selection
                </button>
              </div>

              {/* Checklist Container */}
              <div className="border border-gray-150 rounded-xl overflow-hidden flex flex-col h-[280px] bg-gray-50/30">
                {filteredInvestors.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400">
                    <Users className="h-8 w-8 mb-2 text-gray-300" />
                    <p className="text-xs font-medium">No matching investors found</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                    {filteredInvestors.map((investor) => {
                      const isChecked = selectedInvestorIds.includes(investor.id);
                      return (
                        <div
                          key={investor.id}
                          onClick={() => handleToggleInvestor(investor.id)}
                          className={`flex items-center gap-3 p-3 text-left cursor-pointer transition duration-150 hover:bg-gray-50 ${
                            isChecked ? 'bg-amber-50/10' : ''
                          }`}
                        >
                          <div className="shrink-0 text-gray-400">
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4 text-[#2D6A4F]" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-800 truncate">{investor.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono truncate">{investor.email}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Form Composer (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Subject */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-extrabold text-[#1B4332] uppercase tracking-wider">
                  Broadcast Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q2 Crop Yield Report & Payout Announcement"
                  value={broadcastForm.subject}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, subject: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-sans placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#2D6A4F] focus:border-[#2D6A4F]"
                  required
                />
              </div>

              {/* Message Body */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-extrabold text-[#1B4332] uppercase tracking-wider">
                  Message Body (HTML Supported)
                </label>
                <textarea
                  placeholder="Type your official announcement here. Safe linebreaks will be automatically rendered..."
                  rows={6}
                  value={broadcastForm.body}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, body: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-sans placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#2D6A4F] focus:border-[#2D6A4F] leading-relaxed resize-none"
                  required
                />
              </div>

              {/* Attachment Drag & Drop */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-extrabold text-[#1B4332] uppercase tracking-wider">
                  File Attachment (Optional Image or Video)
                </label>
                
                {broadcastAttachmentPreview ? (
                  <div className="relative border border-gray-200 rounded-2xl p-3 bg-gray-50 flex items-center gap-3">
                    {broadcastAttachment?.type.startsWith('video/') ? (
                      <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-[#2D6A4F] shrink-0 border">
                        <FileVideo className="h-5 w-5" />
                      </div>
                    ) : (
                      <img
                        src={broadcastAttachmentPreview}
                        alt="Attachment preview"
                        className="h-12 w-12 object-cover rounded-xl border shrink-0 bg-white"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">{broadcastAttachment?.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        {(broadcastAttachment ? (broadcastAttachment.size / (1024 * 1024)).toFixed(2) : '0')} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      className="p-1.5 hover:bg-gray-200 rounded-lg text-red-500 cursor-pointer transition duration-150"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('broadcast-attachment-input')?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-[#2D6A4F] bg-[#2D6A4F]/5'
                        : 'border-gray-250 hover:border-[#2D6A4F] bg-gray-50 hover:bg-white'
                    }`}
                  >
                    <input
                      type="file"
                      id="broadcast-attachment-input"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileChange(e.target.files[0]);
                        }
                      }}
                    />
                    <Paperclip className="h-5 w-5 mx-auto text-gray-400 mb-1.5" />
                    <p className="text-xs font-bold text-gray-700">
                      Drag & drop an image or video, or browse
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Supports PNG, JPG, WEBP, MP4, MOV up to 50MB
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setBroadcastForm({ subject: '', body: '' });
                    setSelectedInvestorIds([]);
                    setSearchQuery('');
                    handleRemoveAttachment();
                    setActiveTab('logs');
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-50 transition duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingBroadcast}
                  className="px-5 py-2 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm flex items-center gap-2 transition duration-150 disabled:opacity-50"
                >
                  {sendingBroadcast ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Sending Broadcast...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Dispatch Broadcast ({selectedInvestorIds.length})</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/40 text-[11px] leading-relaxed text-amber-800 flex gap-2">
            <Sparkles className="h-4.5 w-4.5 shrink-0 text-[#D4A017]" />
            <span>
              <b>System Note:</b> Modifying databases (e.g. creating user, posting updates, uploading docs, filing financials) fires signals that automatically record and dispatch standard HTML/Text emails recorded below. If SMTP configurations are parsed in your `.env` settings, they will try real dispatch routing.
            </span>
          </div>

          {emails.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-gray-200 animate-fade-in">
              <Inbox className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <h3 className="font-sans font-bold text-gray-700 text-sm">No recorded emails</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto font-sans leading-relaxed">Modify database records via the admin or managers hubs to witness dynamic email streams.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-auto lg:h-[600px] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
              
              {/* List panel - Left 5 cols */}
              <div className="col-span-1 lg:col-span-5 border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col h-[280px] lg:h-full bg-gray-50/50">
                <div className="p-4 border-b border-gray-100 bg-white">
                  <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">Outbox Stream ({emails.length})</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={`p-4 cursor-pointer text-left transition duration-150 ${
                        selectedEmail?.id === email.id 
                          ? 'bg-amber-50/30 border-l-4 border-[#1B4332]' 
                          : 'hover:bg-gray-100/30'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[9px] font-mono font-bold bg-stone-100 text-stone-600 border px-2 py-0.5 rounded-full uppercase truncate">
                            {email.category || 'Notification'}
                          </span>
                          {email.deliveryStatus === 'delivered' && (
                            <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide flex items-center gap-0.5">
                              <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></span>
                              real
                            </span>
                          )}
                          {email.deliveryStatus === 'failed' && (
                            <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 uppercase tracking-wide flex items-center gap-0.5">
                              <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse"></span>
                              failed
                            </span>
                          )}
                          {(email.deliveryStatus === 'simulated' || !email.deliveryStatus) && (
                            <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-200 uppercase tracking-wide">
                              sim
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-gray-400 font-mono shrink-0">
                          {new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-gray-800 truncate mb-1">{email.subject}</h4>
                      <p className="text-[10.5px] text-gray-500 font-medium truncate font-sans">To: {email.to}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px]">
                        {email.isRead ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold font-sans">
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            <span>Read {email.readAt ? `(${new Date(email.readAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})` : ''}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-gray-400 font-sans">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span>Unread</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Render Panel - Right 7 cols */}
              <div className="col-span-1 lg:col-span-7 flex flex-col h-[320px] lg:h-full">
                {selectedEmail ? (
                  <div className="flex flex-col h-full bg-white divide-y divide-gray-100">
                    {/* Email headers */}
                    <div className="p-6 space-y-3.5 bg-gray-50/30">
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Send className="h-4.5 w-4.5 text-emerald-600" />
                          <span className="text-xs font-mono text-gray-400">SMTP Header Envelope</span>
                        </div>
                        
                        {/* Delivery Status Badge */}
                        {selectedEmail.deliveryStatus === 'delivered' ? (
                          <span className="text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Delivered
                          </span>
                        ) : selectedEmail.deliveryStatus === 'failed' ? (
                          <span className="text-[10px] font-bold font-mono bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-600" />
                            Delivery Failed
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold font-mono bg-gray-50 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <HelpCircle className="h-3 w-3 text-gray-400" />
                            Simulated Outbox
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <h2 className="text-sm font-bold text-gray-800">{selectedEmail.subject}</h2>
                        <div className="mt-2 text-xs font-mono text-gray-600 space-y-1">
                          <div><b>Recipient:</b> {selectedEmail.to}</div>
                          <div><b>Timestamp:</b> {new Date(selectedEmail.sentAt).toLocaleString()}</div>
                          <div>
                            <b>Read Status:</b>{' '}
                            {selectedEmail.isRead ? (
                              <span className="text-emerald-600 font-bold font-sans inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Read at {new Date(selectedEmail.readAt!).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-400 font-sans inline-flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5 text-gray-300" />
                                Unread (Awaiting investor review)
                              </span>
                            )}
                          </div>
                          {selectedEmail.attachmentUrl && (
                            <div className="flex items-center gap-1.5 text-[#2D6A4F] font-sans font-bold text-xs pt-1.5 border-t border-gray-100 dark:border-stone-800 mt-1.5">
                              <Paperclip className="h-3.5 w-3.5" />
                              <span>Attachment:</span>
                              <a 
                                href={selectedEmail.attachmentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="underline hover:text-[#1B4332] cursor-pointer break-all"
                              >
                                {selectedEmail.attachmentName || 'View Attachment'}
                              </a>
                              <span className="text-[10px] text-gray-400 font-mono font-normal">
                                ({selectedEmail.attachmentType || 'file'})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Failure detailed banner */}
                      {selectedEmail.deliveryStatus === 'failed' && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left space-y-2">
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <h4 className="text-xs font-extrabold text-red-800 uppercase tracking-wider font-sans">Email Dispatch Error Details</h4>
                              <p className="text-[10.5px] text-red-700 leading-normal font-mono break-all bg-white border border-red-100 p-2.5 rounded-lg">{selectedEmail.deliveryError}</p>
                            </div>
                          </div>
                          
                          <div className="text-[10.5px] text-gray-600 leading-relaxed font-sans pt-1 border-t border-red-100 pl-6 space-y-1.5">
                            <strong className="text-red-800">💡 Dynamic Integration Troubleshooting Guide:</strong>
                            <ul className="list-disc pl-4 space-y-1 text-[10px]">
                              <li>
                                <strong>Cloud Sandboxing SMTP Port Block:</strong> Real-world cloud host providers (like Google Cloud Run) **block outgoing TCP traffic on ports 25, 465, and 587** by default to protect networks from spam. Standard custom SMTP will therefore time out or fail.
                              </li>
                              <li>
                                <strong>Highly Recommended Solution:</strong> Change your configuration in <strong>Settings → Service Settings</strong> to use <strong>Brevo SMTP Third-Party API</strong>. Brevo communicates securely over standard HTTPS (port 443), which is fully allowed and supported in this environment!
                              </li>
                              <li>
                                <strong>Brevo Sender Email verification:</strong> If using Brevo, make sure your <strong>Brevo Sender Email</strong> corresponds to a verified sender or verified domain in your active Brevo dashboard settings.
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Success banner */}
                      {selectedEmail.deliveryStatus === 'delivered' && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-left">
                          <div className="flex items-center gap-2 text-[10.5px] text-emerald-800 font-medium font-sans">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span>Real dispatch completed successfully through your configured active provider channel!</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Simulated email client container */}
                    <div className="flex-1 p-8 overflow-y-auto bg-stone-100/10">
                      <div className="bg-white p-6 rounded-xl border border-gray-200/60 shadow-sm max-w-xl mx-auto text-left">
                        <div 
                          className="email-body-pane prose prose-sm text-xs text-gray-700 leading-relaxed max-w-none"
                          dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody || selectedEmail.body }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-xs font-mono">
                    Select an email from the simulated outbox stack to review formatting.
                  </div>
                )}
              </div>

            </div>
          )}
        </>
      )}

    </div>
  );
}
