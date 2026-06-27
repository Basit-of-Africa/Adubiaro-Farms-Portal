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
  UserCheck,
  Camera,
  Trash2,
  Video,
  AlertTriangle,
  Check,
  Clock,
  Eye,
  Tag,
  Sliders
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

  // Camera & Feed states
  const [photoMode, setPhotoMode] = useState<'upload' | 'camera'>('upload');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraPreviewUrl, setCameraPreviewUrl] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const [feedUpdates, setFeedUpdates] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  // Personalized targeting states
  const [farmInvestors, setFarmInvestors] = useState<User[]>([]);
  const [selectedInvestorIds, setSelectedInvestorIds] = useState<string[]>([]);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [fetchingInvestors, setFetchingInvestors] = useState(false);

  // Document state
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('report');
  const [docDesc, setDocDesc] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docSuccess, setDocSuccess] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  const startCamera = async () => {
    setCameraError(null);
    setCameraPreviewUrl(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => console.error("Video play failed", err));
      }
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setCameraError('Could not access camera. Please check your system/browser permissions.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCameraPreviewUrl(dataUrl);
        
        // Convert base64 dataUrl to standard File
        const byteString = atob(dataUrl.split(',')[1]);
        const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const file = new File([blob], `status-snapshot-${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        setUpdateFile(file);
        if (!updateCaption) {
          setUpdateCaption(`Live field snapshot captured on ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        }
      }
      stopCamera();
    } catch (err) {
      console.error('Snapshot capture failed:', err);
      setCameraError('Failed to capture snapshot from camera feed.');
    }
  };

  const fetchFeedUpdates = async () => {
    try {
      setFeedLoading(true);
      const res = await fetch('/api/updates/manager', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Sort by date descending
        data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setFeedUpdates(data);
      }
    } catch (err) {
      console.error('Error fetching manager feed updates:', err);
    } finally {
      setFeedLoading(false);
    }
  };

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

  const fetchFarmInvestors = async (farmId: string) => {
    if (!farmId) return;
    try {
      setFetchingInvestors(true);
      const res = await fetch(`/api/farms/${farmId}/investors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not pull farm investors');
      const data = await res.json();
      setFarmInvestors(data);
    } catch (err) {
      console.error('Error fetching farm investors:', err);
    } finally {
      setFetchingInvestors(false);
    }
  };

  useEffect(() => {
    fetchAssignedFarms();
    fetchFeedUpdates();
  }, [token, refreshSignal]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    if (isCameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraActive, cameraStream]);

  useEffect(() => {
    if (selectedFarmId) {
      fetchFarmInvestors(selectedFarmId);
      setSelectedInvestorIds([]);
      setIsPersonalized(false);
    }
  }, [selectedFarmId]);

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateSuccess(null);
    setUpdateLoading(true);

    try {
      if (!selectedFarmId) throw new Error('Please select an assigned farm first');
      if (isPersonalized && selectedInvestorIds.length === 0) {
        throw new Error('Please select at least one space holder or crop investor to target');
      }

      const formData = new FormData();
      formData.append('title', updateTitle);
      formData.append('body', updateBody);
      formData.append('updateType', updateType);
      if (updateFile) {
        formData.append('photos', updateFile);
        formData.append('captions[0]', updateCaption);
      }
      if (isPersonalized && selectedInvestorIds.length > 0) {
        formData.append('targetInvestorIds', JSON.stringify(selectedInvestorIds));
      }

      const res = await fetch(`/api/updates/farm/${selectedFarmId}/new`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish development update');

      const farmName = assignedFarms.find(f => f.id === selectedFarmId)?.name || 'Estate';
      if (isPersonalized) {
        setUpdateSuccess(`Personalized chronicle update posted successfully! Retargeted only to ${selectedInvestorIds.length} select crop investor(s).`);
      } else {
        setUpdateSuccess(`Chronicle update posted successfully! Registered investors on ${farmName} notified.`);
      }
      setUpdateTitle('');
      setUpdateBody('');
      setUpdateFile(null);
      setUpdateCaption('');
      setCameraPreviewUrl(null);
      setPhotoMode('upload');
      stopCamera();
      setSelectedInvestorIds([]);
      setIsPersonalized(false);
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

            {/* Live Operational Feed */}
            <div className="space-y-4 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-sans font-extrabold text-xs text-[#2c3e35]/70 uppercase tracking-wider font-mono">Live Operations Feed</h2>
                  <p className="text-[10px] text-gray-400 font-mono">Recent chronicles across your estates</p>
                </div>
                <button 
                  type="button"
                  onClick={fetchFeedUpdates}
                  disabled={feedLoading}
                  className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg transition cursor-pointer"
                  title="Reload feed"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${feedLoading ? 'animate-spin text-[#1B4332]' : ''}`} />
                </button>
              </div>

              {feedLoading && feedUpdates.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#1B4332] border-t-transparent mx-auto" />
                  <p className="text-[10px] text-gray-400 mt-2 font-mono">Syncing farm feed...</p>
                </div>
              ) : feedUpdates.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-400">
                  <Sprout className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs font-sans">No updates posted yet on your assigned estates.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {feedUpdates.map((up) => (
                    <div key={up.id} className="bg-white p-4 rounded-2xl border border-[#2D6A4F]/10 shadow-sm space-y-3 hover:border-[#2D6A4F]/30 transition duration-200">
                      <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono text-[#1B4332] font-extrabold">{up.farmName}</span>
                          <span className="text-[9px] font-mono text-gray-400">{new Date(up.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                        <span className="text-[9px] font-mono font-bold bg-[#52B788]/10 text-[#1B4332] px-2 py-0.5 rounded-full uppercase border border-[#52B788]/20">
                          {up.updateType}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-gray-800 font-sans">{up.title}</h4>
                        <p className="text-[11px] text-gray-600 font-sans leading-relaxed whitespace-pre-wrap">{up.body}</p>
                      </div>

                      {up.photos && up.photos.length > 0 && (
                        <div className="space-y-1">
                          <img 
                            src={up.photos[0].url} 
                            alt={up.photos[0].caption || 'Snapshot'} 
                            referrerPolicy="no-referrer"
                            className="w-full h-32 object-cover rounded-xl border border-gray-100"
                          />
                          {up.photos[0].caption && (
                            <p className="text-[9px] text-gray-400 font-mono italic">{up.photos[0].caption}</p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-gray-50 text-[9px] font-mono text-gray-400">
                        <span>By: <b className="text-gray-600">{up.postedByName}</b></span>
                        {up.targetInvestorIds && up.targetInvestorIds.length > 0 && (
                          <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/40 flex items-center gap-0.5">
                            <Eye className="h-2.5 w-2.5" />
                            Targeted
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                {/* Personalized / Targeted Update Section */}
                <div className="bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-500/10 hover:border-emerald-500/20 rounded-2xl p-4 space-y-3 transition duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-sans font-bold text-xs text-[#1B4332]">Target Specific Investors</span>
                      <span className="text-[10px] text-gray-500 font-sans mt-0.5">Toggle to limit this update to selected crop owners</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={isPersonalized}
                        onChange={(e) => {
                          setIsPersonalized(e.target.checked);
                          if (!e.target.checked) setSelectedInvestorIds([]);
                        }}
                        className="sr-only peer" 
                        id="personalized-update-toggle"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#52B788]"></div>
                    </label>
                  </div>

                  {isPersonalized && (
                    <div className="pt-2 border-t border-[#52B788]/10 animate-fade-in space-y-2">
                      <label className="block text-[10px] uppercase font-mono font-bold text-gray-400 tracking-wider">Select 1 or more Investors</label>
                      {fetchingInvestors ? (
                        <div className="text-[11px] text-gray-400 font-mono animate-pulse">Scanning farm logs for investors...</div>
                      ) : farmInvestors.length === 0 ? (
                        <div className="text-[11px] text-amber-600 font-sans bg-amber-50 border border-amber-200/40 p-2.5 rounded-lg">There are no investors registered with active holdings in this estate plot.</div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                          {farmInvestors.map(inv => {
                            const isChecked = selectedInvestorIds.includes(inv.id);
                            return (
                              <label 
                                key={inv.id} 
                                className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs font-sans cursor-pointer transition select-none ${
                                  isChecked 
                                    ? 'bg-[#52B788]/15 border-[#52B788]' 
                                    : 'bg-white border-gray-150 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="rounded text-[#1B4332] focus:ring-[#1B4332] h-4.5 w-4.5"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedInvestorIds(selectedInvestorIds.filter(id => id !== inv.id));
                                    } else {
                                      setSelectedInvestorIds([...selectedInvestorIds, inv.id]);
                                    }
                                  }}
                                />
                                <div className="flex flex-col">
                                  <span className="font-bold text-[#1B4332]">{inv.name}</span>
                                  <span className="text-[9px] text-gray-400 font-mono font-bold leading-normal">{inv.email}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
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
                </div>                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold mb-1.5 text-gray-400 tracking-wider">Attach Snapshot / Photo</label>
                    
                    <div className="flex bg-gray-100 p-1 rounded-xl text-[10px] font-mono font-bold mb-3 border border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoMode('upload');
                          stopCamera();
                        }}
                        className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all duration-150 cursor-pointer ${
                          photoMode === 'upload' ? 'bg-white text-[#1B4332] shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        <Upload className="h-3 w-3" />
                        <span>Upload File</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoMode('camera');
                          startCamera();
                        }}
                        className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all duration-150 cursor-pointer ${
                          photoMode === 'camera' ? 'bg-white text-[#1B4332] shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        <Camera className="h-3 w-3" />
                        <span>Live Camera</span>
                      </button>
                    </div>

                    {photoMode === 'upload' ? (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          setUpdateFile(e.target.files?.[0] || null);
                          setCameraPreviewUrl(null);
                        }}
                        className="w-full text-xs border border-dashed border-gray-300 rounded-xl p-2.5 bg-[#FBF9F4]/40 focus:ring-2 focus:ring-[#1B4332] cursor-pointer"
                      />
                    ) : (
                      <div className="space-y-3 bg-[#FBF9F4]/40 border border-[#2D6A4F]/10 rounded-xl p-3">
                        {cameraError && (
                          <div className="flex items-start gap-1.5 p-2 bg-red-50 text-red-700 rounded-lg text-[10px] font-semibold border border-red-100">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                            <span>{cameraError}</span>
                          </div>
                        )}

                        {isCameraActive && (
                          <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-h-48 flex items-center justify-center shadow-inner">
                            <video 
                              ref={videoRef}
                              autoPlay 
                              playsInline 
                              muted
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 px-3">
                              <button
                                type="button"
                                onClick={captureSnapshot}
                                className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow cursor-pointer transition"
                              >
                                <Camera className="h-3.5 w-3.5" />
                                <span>Capture Snapshot</span>
                              </button>
                              <button
                                type="button"
                                onClick={stopCamera}
                                className="bg-gray-800/85 hover:bg-gray-850 text-white text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg cursor-pointer transition"
                              >
                                <span>Cancel</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {!isCameraActive && !cameraPreviewUrl && (
                          <button
                            type="button"
                            onClick={startCamera}
                            className="w-full py-6 border border-dashed border-[#2D6A4F]/25 hover:border-[#2D6A4F] text-[#1B4332] text-xs font-mono font-bold rounded-lg bg-emerald-50/20 hover:bg-emerald-50/40 flex flex-col items-center justify-center gap-2 transition cursor-pointer"
                          >
                            <Video className="h-6 w-6 text-[#2D6A4F] animate-pulse" />
                            <span>Click to Start Device Camera</span>
                          </button>
                        )}

                        {cameraPreviewUrl && (
                          <div className="space-y-2">
                            <div className="relative rounded-lg overflow-hidden border border-[#2D6A4F]/20 aspect-video max-h-48 shadow-sm">
                              <img 
                                src={cameraPreviewUrl} 
                                alt="Captured live snapshot" 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 right-2 flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCameraPreviewUrl(null);
                                    setUpdateFile(null);
                                    startCamera();
                                  }}
                                  className="bg-gray-800/95 text-white p-1.5 rounded-lg hover:bg-gray-950 transition cursor-pointer"
                                  title="Retake Snapshot"
                                >
                                  <Camera className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCameraPreviewUrl(null);
                                    setUpdateFile(null);
                                  }}
                                  className="bg-red-600/90 text-white p-1.5 rounded-lg hover:bg-red-700 transition cursor-pointer"
                                  title="Discard Snapshot"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="absolute bottom-2 left-2 bg-emerald-600/90 text-white text-[9px] font-mono font-semibold px-2 py-0.5 rounded flex items-center gap-0.5 shadow-sm">
                                <Check className="h-3 w-3" />
                                <span>Snapshot Loaded</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
