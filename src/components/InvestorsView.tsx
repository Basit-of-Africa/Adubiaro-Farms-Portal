import React, { useState, useEffect } from 'react';
import { 
  Search, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Mail, 
  Phone, 
  X, 
  Check, 
  ShieldAlert, 
  Loader2, 
  MessageSquare, 
  Clock, 
  User, 
  Briefcase, 
  ToggleLeft, 
  ToggleRight,
  AlertCircle,
  Paperclip,
  FileVideo
} from 'lucide-react';
import { User as UserType, UserRole } from '../types';

interface InvestorsViewProps {
  user: UserType;
  token: string;
  refreshSignal: number;
  triggerRefreshSignal?: () => void;
}

export default function InvestorsView({ user, token, refreshSignal, triggerRefreshSignal }: InvestorsViewProps) {
  const [investors, setInvestors] = useState<UserType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState<boolean>(false);

  // Active investor being edited/deleted/messaged
  const [selectedInvestor, setSelectedInvestor] = useState<UserType | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    isActive: true
  });

  const [messageForm, setMessageForm] = useState({
    subject: '',
    body: ''
  });

  const [messageAttachment, setMessageAttachment] = useState<File | null>(null);
  const [messageAttachmentPreview, setMessageAttachmentPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Fetch investors list
  const fetchInvestors = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data: UserType[] = await res.json();
        // Filter only investors
        const investorUsers = data.filter(u => u.role === UserRole.INVESTOR);
        setInvestors(investorUsers);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to fetch investors list.');
      }
    } catch (err) {
      setError('Network error: Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestors();
  }, [refreshSignal, token]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Create Investor handler
  const handleCreateInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.username || !createForm.name || !createForm.email) {
      setError('Please fill in all required fields.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...createForm,
          role: UserRole.INVESTOR
        })
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        setCreateForm({ username: '', name: '', email: '', phone: '', password: '' });
        showSuccess('Investor profile provisioned successfully! A welcome notification has been logged.');
        fetchInvestors();
        if (triggerRefreshSignal) triggerRefreshSignal();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to create investor profile.');
      }
    } catch (err) {
      setError('Failed to reach server.');
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Investor handler
  const handleEditInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestor) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${selectedInvestor.id}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        showSuccess(`Investor "${editForm.name}" updated successfully!`);
        fetchInvestors();
        if (triggerRefreshSignal) triggerRefreshSignal();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to update investor profile.');
      }
    } catch (err) {
      setError('Failed to update investor.');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle active directly
  const handleToggleActive = async (investor: UserType) => {
    try {
      const res = await fetch(`/api/admin/users/${investor.id}/toggle-active`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        showSuccess(`Status toggled for ${investor.name}`);
        fetchInvestors();
        if (triggerRefreshSignal) triggerRefreshSignal();
      }
    } catch (err) {
      console.error('Failed to toggle user status', err);
    }
  };

  // Delete Investor handler
  const handleDeleteInvestor = async () => {
    if (!selectedInvestor) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${selectedInvestor.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setIsDeleteModalOpen(false);
        showSuccess(`Investor "${selectedInvestor.name}" has been permanently removed.`);
        fetchInvestors();
        if (triggerRefreshSignal) triggerRefreshSignal();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to delete investor.');
      }
    } catch (err) {
      setError('Failed to complete delete request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileChange = (file: File) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setError("File size exceeds 50MB limit. Please choose a file smaller than 50MB.");
      return;
    }
    setMessageAttachment(file);
    const previewUrl = URL.createObjectURL(file);
    setMessageAttachmentPreview(previewUrl);
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

  const handleRemoveAttachment = () => {
    setMessageAttachment(null);
    if (messageAttachmentPreview) {
      if (messageAttachmentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(messageAttachmentPreview);
      }
      setMessageAttachmentPreview(null);
    }
  };

  // Send Direct Message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestor || !messageForm.subject || !messageForm.body) return;
    setActionLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('subject', messageForm.subject);
      formData.append('body', messageForm.body);
      if (messageAttachment) {
        formData.append('attachment', messageAttachment);
      }

      const res = await fetch(`/api/admin/users/${selectedInvestor.id}/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        setIsMessageModalOpen(false);
        setMessageForm({ subject: '', body: '' });
        setMessageAttachment(null);
        if (messageAttachmentPreview) {
          if (messageAttachmentPreview.startsWith('blob:')) {
            URL.revokeObjectURL(messageAttachmentPreview);
          }
          setMessageAttachmentPreview(null);
        }
        showSuccess(`Mailing successfully sent to ${selectedInvestor.name}!`);
        if (triggerRefreshSignal) triggerRefreshSignal();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to dispatch mailing.');
      }
    } catch (err) {
      setError('Failed to send mailing.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open modals with pre-populated data
  const openEditModal = (investor: UserType) => {
    setSelectedInvestor(investor);
    setEditForm({
      name: investor.name,
      email: investor.email,
      phone: investor.phone || '',
      username: investor.username,
      isActive: investor.isActive !== false
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (investor: UserType) => {
    setSelectedInvestor(investor);
    setIsDeleteModalOpen(true);
  };

  const openMessageModal = (investor: UserType) => {
    setSelectedInvestor(investor);
    setMessageForm({
      subject: `Adubiaro Estates update for ${investor.name}`,
      body: `Dear ${investor.name},\n\nWe wanted to share an update regarding your investment holdings at Adubiaro Farm Estates...`
    });
    setIsMessageModalOpen(true);
  };

  // Filtered investors
  const filteredInvestors = investors.filter(inv => {
    const q = searchQuery.toLowerCase();
    return (
      inv.name.toLowerCase().includes(q) ||
      inv.username.toLowerCase().includes(q) ||
      inv.email.toLowerCase().includes(q) ||
      (inv.phone && inv.phone.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Banner Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl flex items-center gap-3 animate-fade-in text-xs font-semibold shadow-premium">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-2xl flex items-start gap-3 animate-fade-in text-xs">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Execution Warning:</span>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Control Header & Actions bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-stone-900 border border-[#2D6A4F]/10 dark:border-stone-800 p-5 rounded-3xl shadow-premium">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2.5 bg-[#52B788]/10 rounded-2xl text-[#1B4332] dark:text-[#52B788]">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif font-extrabold text-base text-[#1B4332] dark:text-[#52B788]">Investors Directory</h2>
            <p className="text-[10px] font-mono text-gray-400">Total verified active holdings</p>
          </div>
        </div>

        {/* Search & Add */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#FBF9F4] dark:bg-stone-800 border border-gray-150 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#52B788] transition text-gray-800 dark:text-stone-100"
            />
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-[#FBF9F4] hover:text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Investor</span>
          </button>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-[#52B788] animate-spin" />
          <p className="text-xs font-mono text-gray-400">Restructuring portfolio holdings registry...</p>
        </div>
      ) : filteredInvestors.length === 0 ? (
        <div className="py-20 bg-white dark:bg-stone-900 rounded-3xl border border-[#2D6A4F]/10 dark:border-stone-800 text-center flex flex-col items-center justify-center p-6">
          <User className="h-10 w-10 text-gray-300 dark:text-stone-700 mb-2" />
          <h3 className="font-sans font-bold text-gray-700 dark:text-stone-300 text-sm">No Investors Found</h3>
          <p className="text-xs text-gray-400 max-w-sm mt-1">
            We couldn't find any investor profiles matching your criteria or currently registered.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInvestors.map((inv) => (
            <div 
              key={inv.id}
              className="bg-white dark:bg-stone-900 border border-gray-100 dark:border-stone-800 rounded-3xl p-5 hover:border-[#52B788]/30 dark:hover:border-[#52B788]/40 hover:shadow-premium transition-all duration-300 flex flex-col justify-between group relative"
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#52B788]/10 text-[#1B4332] dark:text-[#52B788] flex items-center justify-center font-bold text-xs">
                      {inv.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-sans font-bold text-sm text-gray-800 dark:text-stone-100 group-hover:text-[#2D6A4F] dark:group-hover:text-[#52B788] transition-colors">
                        {inv.name}
                      </h4>
                      <p className="text-[10px] font-mono text-gray-400">@{inv.username}</p>
                    </div>
                  </div>

                  <span className={`text-[8.5px] font-mono font-extrabold px-2.5 py-0.5 rounded-full border ${
                    inv.isActive !== false
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border-emerald-200 dark:border-emerald-800/40'
                      : 'bg-stone-100 dark:bg-stone-850 text-stone-500 border-stone-200 dark:border-stone-800'
                  }`}>
                    {inv.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                {/* Body details */}
                <div className="mt-5 space-y-2.5 text-xs text-gray-500 dark:text-stone-400 border-t border-dashed border-gray-100 dark:border-stone-800 pt-4">
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="truncate text-gray-700 dark:text-stone-300">{inv.email}</span>
                  </div>
                  {inv.phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-700 dark:text-stone-300">{inv.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="text-[10px] font-mono text-gray-400">ID: {inv.id}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-gray-50 dark:border-stone-850 flex items-center justify-between">
                
                {/* Active Toggle Switch */}
                <button
                  onClick={() => handleToggleActive(inv)}
                  title={inv.isActive !== false ? "Deactivate Profile" : "Activate Profile"}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-[#52B788] transition text-[10px] font-mono"
                >
                  {inv.isActive !== false ? (
                    <ToggleRight className="h-6 w-6 text-emerald-500 cursor-pointer" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-gray-400 cursor-pointer" />
                  )}
                  <span>Status</span>
                </button>

                {/* Operational actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openMessageModal(inv)}
                    className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-xl transition cursor-pointer"
                    title="Message / Mail Investor"
                  >
                    <Mail className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => openEditModal(inv)}
                    className="p-2 bg-[#52B788]/10 text-[#1B4332] dark:text-[#52B788] hover:bg-[#52B788]/20 rounded-xl transition cursor-pointer"
                    title="Modify Details"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => openDeleteModal(inv)}
                    className="p-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 rounded-xl transition cursor-pointer"
                    title="Permanently Remove Profile"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 1. Create Investor Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-[#2D6A4F]/20 dark:border-stone-800 max-w-md w-full shadow-premium p-6 overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[#2D6A4F] dark:text-[#52B788]" />
                <h3 className="font-serif font-extrabold text-sm text-[#1B4332] dark:text-[#52B788]">Add Investor Profile</h3>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvestor} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-extrabold text-[#1B4332] dark:text-stone-300 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alaba Michael"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 bg-[#FBF9F4] dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#52B788] text-gray-800 dark:text-stone-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-extrabold text-[#1B4332] dark:text-stone-300 uppercase tracking-wider mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. alaba_m"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    className="w-full text-xs px-3 py-2.5 bg-[#FBF9F4] dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#52B788] text-gray-800 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-extrabold text-[#1B4332] dark:text-stone-300 uppercase tracking-wider mb-1">
                    Temporary Password
                  </label>
                  <input
                    type="password"
                    placeholder="Auto generated if blank"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full text-xs px-3 py-2.5 bg-[#FBF9F4] dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#52B788] text-gray-800 dark:text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-extrabold text-[#1B4332] dark:text-stone-300 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. alaba@example.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 bg-[#FBF9F4] dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#52B788] text-gray-800 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-extrabold text-[#1B4332] dark:text-stone-300 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +234 801 234 5678"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 bg-[#FBF9F4] dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#52B788] text-gray-800 dark:text-stone-100"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-stone-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-stone-300 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#1B4332] text-white hover:bg-[#2D6A4F] rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1"
                >
                  {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit/Modify Investor Modal */}
      {isEditModalOpen && selectedInvestor && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-[#2D6A4F]/20 dark:border-stone-800 max-w-md w-full shadow-premium p-6 overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-[#2D6A4F] dark:text-[#52B788]" />
                <h3 className="font-serif font-extrabold text-sm text-[#1B4332] dark:text-[#52B788]">Modify Details</h3>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditInvestor} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-extrabold text-[#1B4332] dark:text-stone-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 bg-[#FBF9F4] dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#52B788] text-gray-800 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-extrabold text-[#1B4332] dark:text-stone-300 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 bg-[#FBF9F4] dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#52B788] text-gray-800 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-extrabold text-[#1B4332] dark:text-stone-300 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 bg-[#FBF9F4] dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#52B788] text-gray-800 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-extrabold text-[#1B4332] dark:text-stone-300 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 bg-[#FBF9F4] dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#52B788] text-gray-800 dark:text-stone-100"
                />
              </div>

              <div className="flex items-center justify-between bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-[#1B4332] dark:text-stone-200">Account Authorization Status</h4>
                  <p className="text-[9px] text-gray-400">Controls whether investor is permitted to log in</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                  className="text-gray-400 hover:text-[#52B788]"
                >
                  {editForm.isActive ? (
                    <ToggleRight className="h-7 w-7 text-emerald-500 cursor-pointer" />
                  ) : (
                    <ToggleLeft className="h-7 w-7 text-gray-400 cursor-pointer" />
                  )}
                </button>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-stone-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-stone-300 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#1B4332] text-white hover:bg-[#2D6A4F] rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1"
                >
                  {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedInvestor && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-red-100 dark:border-stone-800 max-w-sm w-full shadow-premium p-6 overflow-hidden animate-fade-in">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-50 text-red-600 mb-4">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-stone-100">Permanently Remove Profile?</h3>
              <p className="text-xs text-gray-500 mt-2">
                Are you absolutely sure you want to remove <strong>{selectedInvestor.name}</strong> from your estates investor registry? This action is non-reversible.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-stone-300 hover:bg-gray-50 cursor-pointer"
              >
                No, Keep Profile
              </button>
              <button
                type="button"
                onClick={handleDeleteInvestor}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1"
              >
                {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Yes, Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Message / Direct Mail Modal */}
      {isMessageModalOpen && selectedInvestor && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-[#2D6A4F]/20 dark:border-stone-800 max-w-lg w-full shadow-premium p-6 overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-[#2D6A4F] dark:text-[#52B788]" />
                <h3 className="font-serif font-extrabold text-sm text-[#1B4332] dark:text-[#52B788]">Send Private Message</h3>
              </div>
              <button 
                onClick={() => setIsMessageModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 p-3 bg-stone-50 dark:bg-stone-850 border border-gray-100 dark:border-stone-800 rounded-2xl flex items-center justify-between text-[11px] text-gray-500">
              <span>Sending communication to:</span>
              <span className="font-bold text-[#1B4332] dark:text-[#52B788]">{selectedInvestor.name} ({selectedInvestor.email})</span>
            </div>

            <form onSubmit={handleSendMessage} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-extrabold text-[#1B4332] dark:text-stone-300 uppercase tracking-wider mb-1">
                  Mailing Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adubiaro Farm Update Q3"
                  value={messageForm.subject}
                  onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 bg-[#FBF9F4] dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#52B788] text-gray-800 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-extrabold text-[#1B4332] dark:text-stone-300 uppercase tracking-wider mb-1">
                  Message Body
                </label>
                <textarea
                  required
                  rows={6}
                  value={messageForm.body}
                  onChange={(e) => setMessageForm({ ...messageForm, body: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 bg-[#FBF9F4] dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#52B788] text-gray-800 dark:text-stone-100 font-sans leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-extrabold text-[#1B4332] dark:text-stone-300 uppercase tracking-wider mb-1">
                  Attachment (Image or Video)
                </label>
                {messageAttachmentPreview ? (
                  <div className="relative border border-stone-200 dark:border-stone-800 rounded-2xl p-2 bg-[#FBF9F4] dark:bg-stone-800 flex items-center gap-3">
                    {messageAttachment?.type.startsWith('video/') ? (
                      <div className="h-14 w-14 bg-stone-100 dark:bg-stone-700 rounded-xl flex items-center justify-center text-[#2D6A4F] shrink-0">
                        <FileVideo className="h-6 w-6" />
                      </div>
                    ) : (
                      <img
                        src={messageAttachmentPreview}
                        alt="Attachment preview"
                        className="h-14 w-14 object-cover rounded-xl border border-stone-200 dark:border-stone-700 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">{messageAttachment?.name}</p>
                      <p className="text-[10px] text-stone-500 font-mono">
                        {(messageAttachment ? (messageAttachment.size / (1024 * 1024)).toFixed(2) : '0')} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      className="p-1.5 hover:bg-stone-150 dark:hover:bg-stone-700 rounded-lg text-red-500 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('message-attachment-input')?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-[#2D6A4F] bg-[#2D6A4F]/5 dark:border-[#52B788] dark:bg-[#52B788]/5'
                        : 'border-stone-200 hover:border-[#2D6A4F] bg-[#FBF9F4] hover:bg-stone-50/50 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-[#52B788]'
                    }`}
                  >
                    <input
                      type="file"
                      id="message-attachment-input"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileChange(e.target.files[0]);
                        }
                      }}
                    />
                    <Paperclip className="h-5 w-5 mx-auto text-stone-400 mb-1" />
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Drag & drop an image or video, or browse
                    </p>
                    <p className="text-[9px] text-stone-400 mt-0.5">
                      Supports PNG, JPG, WEBP, MP4, MOV up to 50MB
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-stone-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsMessageModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-stone-300 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#1B4332] text-white hover:bg-[#2D6A4F] rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1"
                >
                  {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Dispatch Message</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
