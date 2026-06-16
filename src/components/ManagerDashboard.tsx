/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sprout, 
  MapPin, 
  FileText, 
  Calendar, 
  PlusCircle, 
  RefreshCw, 
  Image as ImageIcon, 
  Send,
  Upload,
  UserCheck
} from 'lucide-react';
import { User, Farm } from '../types';

interface ManagerDashboardProps {
  user: User;
  token: string;
  onSelectFarm: (farmId: string) => void;
  triggerRefreshSignal: () => void;
  refreshSignal: number;
}

export default function ManagerDashboard({ user, token, onSelectFarm, triggerRefreshSignal, refreshSignal }: ManagerDashboardProps) {
  const [assignedFarms, setAssignedFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedFarmId, setSelectedFarmId] = useState('');
  
  // Update state
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateType, setUpdateType] = useState('general');
  const [updateBody, setUpdateBody] = useState('');
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [updateCaption, setUpdateCaption] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  // Document state
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('report');
  const [docDesc, setDocDesc] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docSuccess, setDocSuccess] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  const fetchAssignedFarms = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/farms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not pull assigned farms');
      const data = await res.json();
      setAssignedFarms(data);
      if (data.length > 0) {
        setSelectedFarmId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred fetching farms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedFarms();
  }, [token, refreshSignal]);

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateSuccess(null);
    setUpdateLoading(true);

    try {
      if (!selectedFarmId) throw new Error('Please select an assigned farm first');

      const formData = new FormData();
      formData.append('title', updateTitle);
      formData.append('body', updateBody);
      formData.append('updateType', updateType);
      if (updateFile) {
        formData.append('photos', updateFile);
        formData.append('captions[0]', updateCaption);
      }

      const res = await fetch(`/api/updates/farm/${selectedFarmId}/new`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish development update');

      setUpdateSuccess(`Chronicle update posted successfully! Registered investors on ${assignedFarms.find(f => f.id === selectedFarmId)?.name} notified.`);
      setUpdateTitle('');
      setUpdateBody('');
      setUpdateFile(null);
      setUpdateCaption('');
      triggerRefreshSignal();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocSuccess(null);
    setDocLoading(true);

    try {
      if (!docFile) throw new Error('Please select a certificate or report file');
      if (!selectedFarmId) throw new Error('Please select an assigned farm');

      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('title', docTitle);
      formData.append('category', docCategory);
      formData.append('visibility', 'farm'); // Manager uploads default to farm-wide updates
      formData.append('description', docDesc);

      const res = await fetch(`/api/documents/farm/${selectedFarmId}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Document dispatch failed');

      setDocSuccess(`Document "${data.title}" successfully dispatched to farm investors!`);
      setDocTitle('');
      setDocDesc('');
      setDocFile(null);
      triggerRefreshSignal();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDocLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1B4332] border-t-transparent" />
      </div>
    );
  }

  return (
    <div id="manager-dashboard-container" className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium gap-4">
        <div>
          <h1 className="font-serif font-extrabold text-2xl text-[#1B4332] tracking-wide">Supervisor Dashboard</h1>
          <p className="text-xs text-gray-500 font-mono mt-1">Field operations & crop activity publishing panel</p>
        </div>
        <div className="flex items-center gap-2.5 text-xs font-mono font-bold text-[#1B4332] bg-[#52B788]/10 px-4 py-2.5 rounded-xl border border-[#52B788]/20 shadow-inner">
          <UserCheck className="h-4.5 w-4.5 text-[#2D6A4F]" />
          <span className="uppercase tracking-wider">ASSIGNED TO {assignedFarms.length} ESTATES</span>
        </div>
      </div>

      {assignedFarms.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-gray-200">
          <Sprout className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-sans font-bold text-gray-700 text-lg">No Farm Assignments</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">You are not linked to any active agricultural projects. Please contact the administrator to route your supervisor credentials.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Assigned Farms Left Column */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="font-sans font-extrabold text-xs text-[#2c3e35]/70 uppercase tracking-wider font-mono">Assigned Operations</h2>
            
            <div className="space-y-4">
              {assignedFarms.map(farm => (
                <div 
                  key={farm.id}
                  onClick={() => onSelectFarm(farm.id)}
                  className="bg-white rounded-2xl border border-[#2D6A4F]/10 shadow-premium hover:shadow-[#2D6A4F]/15 hover:border-[#2D6A4F]/25 transition-all duration-300 p-5 cursor-pointer relative group overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-2 h-full bg-[#1B4332]" />
                  <div className="flex items-start gap-4">
                    {farm.coverImage && (
                      <img src={farm.coverImage} className="w-16 h-16 rounded-xl object-cover shadow-sm border border-gray-100" />
                    )}
                    <div>
                      <h3 className="font-serif font-bold text-[#1B4332] text-sm group-hover:text-[#2D6A4F] transition">{farm.name}</h3>
                      <div className="flex items-center gap-1 text-gray-400 text-[11px] mt-1.5 font-sans font-semibold">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#2D6A4F]" />
                        <span>{farm.location}, {farm.state}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-[10px] font-mono text-gray-400 uppercase font-bold">
                        <span>Plots: <b className="text-[#1B4332] font-extrabold">{farm.totalPlots}</b></span>
                        <span>•</span>
                        <span>{farm.totalHectares} Hectares</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supervisor Publishing Suite Right Column */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Form Selector Farm Select */}
            <div className="bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold mb-1.5 text-gray-400 tracking-wider">Current active site</label>
                <select
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  className="w-full text-xs font-bold border border-gray-200 rounded-xl p-3 bg-[#FBF9F4]/40 focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition"
                >
                  {assignedFarms.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Farm Update Posting Form */}
            <div className="bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium">
              <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                <Send className="text-[#1B4332] h-4.5 w-4.5" />
                <h3 className="font-serif font-bold text-sm text-[#1B4332]">Post Field Growth & Operations Update</h3>
              </div>

              {updateSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                  {updateSuccess}
                </div>
              )}

              <form onSubmit={handlePostUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400 tracking-wider">Update title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Nursery Cohort Harvest Notice"
                      value={updateTitle}
                      onChange={(e) => setUpdateTitle(e.target.value)}
                      className="w-full text-xs bg-[#FBF9F4]/40 border border-gray-150 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400 tracking-wider">Category Tag</label>
                    <select
                      value={updateType}
                      onChange={(e) => setUpdateType(e.target.value)}
                      className="w-full text-xs bg-[#FBF9F4]/40 border border-gray-150 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                    >
                      <option value="general">General update</option>
                      <option value="planting">Planting cycle</option>
                      <option value="growth">Growth report</option>
                      <option value="harvest">Harvest notice</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="weather">Weather alerts</option>
                      <option value="pest">Pest Control</option>
                      <option value="milestone">Milestone achievement</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400 tracking-wider">Activity Log Description</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide full description of operations..."
                    value={updateBody}
                    onChange={(e) => setUpdateBody(e.target.value)}
                    className="w-full text-xs bg-[#FBF9F4]/40 border border-gray-150 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400 tracking-wider">Attach Field Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setUpdateFile(e.target.files?.[0] || null)}
                      className="w-full text-xs border border-dashed border-gray-300 rounded-xl p-2.5 bg-[#FBF9F4]/40 focus:ring-2 focus:ring-[#1B4332]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400 tracking-wider">Photo caption</label>
                    <input
                      type="text"
                      placeholder="e.g. Palm FFB Loading Block A"
                      value={updateCaption}
                      onChange={(e) => setUpdateCaption(e.target.value)}
                      className="w-full text-xs bg-[#FBF9F4]/40 border border-gray-150 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={updateLoading}
                  className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-mono font-bold p-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow transition duration-300"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>{updateLoading ? 'Publishing update...' : 'Publish Update & Notify Investors'}</span>
                </button>
              </form>
            </div>

            {/* Document Dispatch form */}
            <div className="bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium">
              <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                <FileText className="text-[#1B4332] h-4.5 w-4.5" />
                <h3 className="font-serif font-bold text-sm text-[#1B4332]">Dispatch Farm-wide Certificate / Report</h3>
              </div>

              {docSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                  {docSuccess}
                </div>
              )}

              <form onSubmit={handleUploadDocument} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400 tracking-wider">Document Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Soil Nutrients Report June 2026"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="w-full text-xs bg-[#FBF9F4]/40 border border-gray-150 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400 tracking-wider">Category</label>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                      className="w-full text-xs bg-[#FBF9F4]/40 border border-gray-150 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                    >
                      <option value="report">Operational Report</option>
                      <option value="certificate">Ecological Certificate</option>
                      <option value="legal">Legal Clearance</option>
                      <option value="other">Other / Support Document</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400 tracking-wider">Attachment File</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    className="w-full text-xs border border-dashed border-gray-300 rounded-xl p-3 bg-[#FBF9F4]/40 focus:ring-2 focus:ring-[#1B4332]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold mb-1 text-gray-400 tracking-wider">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief summary of document content..."
                    value={docDesc}
                    onChange={(e) => setDocDesc(e.target.value)}
                    className="w-full text-xs bg-[#FBF9F4]/40 border border-gray-150 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={docLoading}
                  className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-mono font-bold p-3.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow transition duration-300"
                >
                  <Upload className="h-4 w-4" />
                  <span>{docLoading ? 'Uploading document...' : 'Upload & Notify Investors'}</span>
                </button>
              </form>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
