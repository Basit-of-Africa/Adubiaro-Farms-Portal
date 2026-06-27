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
  Download, 
  BookOpen, 
  Layers, 
  User, 
  File, 
  AlertCircle,
  Clock,
  ArrowLeft,
  Briefcase,
  Filter,
  RotateCcw,
  X
} from 'lucide-react';
import { User as UserType, Farm, FarmPlot, FarmUpdate, Document, UserRole, PlotStatus } from '../types';
import CommentsSection from './CommentsSection';
import { getRelativeTime } from '../utils/time';

interface FarmDetailProps {
  user: UserType;
  token: string;
  farmId: string;
  onBack: () => void;
  refreshSignal: number;
}

export default function FarmDetail({ user, token, farmId, onBack, refreshSignal }: FarmDetailProps) {
  const [data, setData] = useState<{
    farm: Farm;
    plots: FarmPlot[];
    updates: FarmUpdate[];
    documents: Document[];
    investorHoldings?: any[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'updates' | 'plots' | 'documents'>('updates');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const fetchFarmDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/farms/${farmId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch details');
      }
      const val = await res.json();
      setData(val);
    } catch (err: any) {
      setError(err.message || 'Error occurred fetching details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmDetails();
  }, [farmId, token, refreshSignal]);

  const handleDownload = async (docId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Access clearance failure');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (e: any) {
      alert(e.message || 'You do not have authorization to download this secure document.');
    }
  };

  const getStatusBadge = (status: PlotStatus) => {
    switch (status) {
      case PlotStatus.ACTIVE: return 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/20';
      case PlotStatus.HARVESTING: return 'bg-amber-500/15 text-amber-600 border border-amber-500/20';
      case PlotStatus.DORMANT: return 'bg-gray-500/15 text-gray-500 border border-gray-500/20';
      case PlotStatus.AVAILABLE: return 'bg-blue-500/15 text-blue-600 border border-blue-500/20';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1B4332] border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border-l-4 border-red-500 rounded-xl space-y-4">
        <h3 className="text-sm font-bold text-red-800">Permission Check Issue</h3>
        <p className="text-xs text-red-700">{error || 'Access denied'}</p>
        <button
          onClick={onBack}
          className="px-3 py-1.5 bg-[#1B4332] text-white rounded text-xs cursor-pointer font-bold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { farm, plots, updates, documents } = data;

  // Filter updates by selected date-range
  const filteredUpdates = updates.filter(up => {
    if (!up.createdAt) return true;
    const upDate = new Date(up.createdAt);
    const yyyy = upDate.getFullYear();
    const mm = String(upDate.getMonth() + 1).padStart(2, '0');
    const dd = String(upDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    if (filterStartDate && dateStr < filterStartDate) return false;
    if (filterEndDate && dateStr > filterEndDate) return false;
    return true;
  });

  return (
    <div id="farm-detail-stage" className="space-y-8 animate-fade-in">
      
      {/* Back navigation */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-mono font-bold text-[#1B4332] hover:underline cursor-pointer group"
      >
        <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
        <span>Return to Dashboard</span>
      </button>

      {/* Hero estate display card */}
      <div className="bg-white rounded-3xl overflow-hidden border border-[#2D6A4F]/15 shadow-premium">
        <div className="relative h-72 bg-gray-200">
          <img src={farm.coverImage} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F291E] via-[#1B4332]/45 to-transparent opacity-90" />
          <div className="absolute bottom-6 left-8 right-8 text-white text-left">
            <div className="flex items-center gap-2">
              <span className="bg-[#D4A017] text-white text-[9px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                Est. {new Date(farm.dateEstablished).toLocaleDateString([], {year: 'numeric', month: 'short'})}
              </span>
            </div>
            <h1 className="font-serif font-bold text-3xl text-white tracking-wide mt-3.5">{farm.name}</h1>
            <div className="flex items-center gap-1.5 text-[#52B788] text-xs mt-2 font-mono">
              <MapPin className="h-4 w-4 text-[#D4A017]" />
              <span className="font-bold">{farm.location}, {farm.state}</span>
            </div>
          </div>
        </div>

        <div className="p-8">
          <p className="text-gray-600 text-xs leading-relaxed max-w-4xl font-normal">{farm.description}</p>
          
          <div className="mt-6 flex flex-wrap gap-8 border-t border-gray-100 pt-6 text-xs font-mono text-gray-400 uppercase">
            <div>
              Total Plots: <b className="text-gray-800 font-bold ml-1">{plots.length} Deeded</b>
            </div>
            <div>
              Gross Acreage: <b className="text-gray-800 font-bold ml-1">{farm.totalHectares} ha</b>
            </div>
            <div>
              Security Clearance: <b className="text-emerald-700 font-bold ml-1">AES-256</b>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar header */}
      <div className="flex flex-col sm:flex-row bg-white rounded-3xl sm:rounded-2xl shadow-premium p-2 sm:p-1.5 border border-[#2D6A4F]/10 gap-1.5 sm:gap-0">
        <button
          onClick={() => setActiveTab('updates')}
          className={`flex-1 py-3 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'updates' ? 'bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] text-white shadow shadow-[#1B4332]/30' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Activity Log ({updates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plots')}
          className={`flex-1 py-3 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'plots' ? 'bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] text-white shadow shadow-[#1B4332]/30' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Section Plots ({plots.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex-1 py-3 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'documents' ? 'bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] text-white shadow shadow-[#1B4332]/30' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Document Vault ({documents.length})</span>
        </button>
      </div>

      {/* Tab contents */}
      <div className="space-y-6">
        
        {/* UPDATES FEED */}
        {activeTab === 'updates' && (
          <div className="space-y-6">
            {/* Filter Panel */}
            {updates.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[#52B788]/10 text-[#1B4332] rounded-xl">
                    <Filter className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">Filter Field Chronicles</h4>
                    <p className="text-[10px] text-gray-500 font-mono">
                      {filterStartDate || filterEndDate ? (
                        <span className="text-emerald-600 font-semibold">Active filter: showing {filteredUpdates.length} of {updates.length} logs</span>
                      ) : (
                        `Displaying all ${updates.length} historic updates`
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-semibold text-gray-400 uppercase">From</span>
                    <input 
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="bg-gray-50 border border-gray-200 text-xs font-mono rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-semibold text-gray-400 uppercase">To</span>
                    <input 
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="bg-gray-50 border border-gray-200 text-xs font-mono rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] cursor-pointer"
                    />
                  </div>

                  {(filterStartDate || filterEndDate) && (
                    <button
                      onClick={() => {
                        setFilterStartDate('');
                        setFilterEndDate('');
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-200 text-xs font-mono font-bold rounded-lg transition duration-200 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {updates.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-gray-200">
                <p className="text-xs text-gray-400">No field chronicle updates yet posted for this estate.</p>
              </div>
            ) : filteredUpdates.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-gray-200 space-y-3">
                <p className="text-xs text-gray-500">No operations updates match the selected date range.</p>
                <button
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B4332] text-white text-xs font-mono font-bold rounded-lg cursor-pointer hover:bg-[#2D6A4F] transition shadow-sm"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Filters</span>
                </button>
              </div>
            ) : (
              filteredUpdates.map((up) => (
                <div key={up.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#52B788]/20 text-[#1B4332] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase">
                        {up.updateType}
                      </span>
                      {user.role !== UserRole.INVESTOR && up.targetInvestorIds && up.targetInvestorIds.length > 0 && (
                        <span className="bg-[#D8F3DC] text-[#1B4332] text-[9px] font-mono font-bold px-2 py-0.5 rounded-full select-none" title={`Visible to ${up.targetInvestorIds.length} select investors`}>
                          🔒 Targeted ({up.targetInvestorIds.length})
                        </span>
                      )}
                      {user.role !== UserRole.INVESTOR && (!up.targetInvestorIds || up.targetInvestorIds.length === 0) && (
                        <span className="bg-gray-100 text-gray-500 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full select-none">
                          🌍 Broadcast
                        </span>
                      )}
                      <h3 className="font-sans font-bold text-gray-800 text-sm">{up.title}</h3>
                    </div>
                    <div className="text-[10px] font-mono text-gray-400 text-right">
                      <div className="font-bold text-[#1B4332]" title={new Date(up.createdAt).toLocaleString()}>{getRelativeTime(up.createdAt)}</div>
                      <div className="text-[9px] text-gray-400 mt-0.5 flex items-center gap-0.5 justify-end">
                        <Clock className="h-2.5 w-2.5 shrink-0 text-gray-400" />
                        <span>{new Date(up.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(up.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-600 text-xs leading-relaxed font-sans">{up.body}</p>

                  {up.photos && up.photos.length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                      {up.photos.map((p) => (
                        <div key={p.id} className="group relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                          <img 
                            src={p.image} 
                            alt={p.caption} 
                            className="w-full h-36 object-cover object-center group-hover:scale-105 transition duration-300"
                            referrerPolicy="no-referrer"
                          />
                          {p.caption && (
                            <div className="p-2.5 bg-[#1B4332] text-white text-[10px] font-mono truncate">
                              {p.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[10px] font-mono text-gray-400 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      <span>Dispatched by Supervisor: <b className="text-gray-600">{up.postedByName}</b></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 bg-gray-50 px-2.5 py-0.5 rounded-md border border-gray-100">
                      <Clock className="h-3.5 w-3.5 text-[#2D6A4F]" />
                      <span>Last Updated: <b className="text-[#1B4332]">{new Date(up.updatedAt || up.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</b></span>
                    </div>
                  </div>

                  <CommentsSection
                    updateId={up.id}
                    comments={up.comments}
                    currentUser={user}
                    token={token}
                    onCommentAdded={fetchFarmDetails}
                  />
                </div>
              ))
            )}
          </div>
        )}

        {/* ASSOCIATED PLOT STATS */}
        {activeTab === 'plots' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs bg-white rounded-xl">
                <thead>
                  <tr className="border-b border-gray-150 text-gray-400 uppercase font-mono tracking-wider">
                    <th className="py-3 px-3 font-bold">Plot identifier</th>
                    <th className="py-3 px-3 font-bold text-center">Land Size</th>
                    <th className="py-3 px-3 font-bold">Cultivar Canopy</th>
                    <th className="py-3 px-3 font-bold">Active Status</th>
                    <th className="py-3 px-3 font-bold">Ownership profile</th>
                  </tr>
                </thead>
                <tbody>
                  {plots.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="py-4 px-3 font-mono font-bold text-gray-800">{p.plotNumber}</td>
                      <td className="py-4 px-3 text-center font-mono text-gray-600">{p.sizeHectares} ha</td>
                      <td className="py-4 px-3 text-gray-600 font-medium">{p.cropType}</td>
                      <td className="py-4 px-3">
                        <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold font-mono uppercase rounded-full ${getStatusBadge(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-4 px-3 font-mono text-gray-400">
                        {p.status === PlotStatus.DORMANT || p.status === PlotStatus.AVAILABLE ? (
                          <span className="text-gray-400">Milling holding</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">Allocated Investor</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DOCUMENT SECURE DOWNLOAD */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.length === 0 ? (
              <div className="col-span-2 bg-white p-12 text-center rounded-2xl border border-dashed border-gray-200">
                <p className="text-xs text-gray-400">No secure document deeds allocated to this estate.</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <span className="bg-gray-100 text-gray-700 text-[9px] font-bold font-mono px-2 py-0.5 rounded uppercase border border-gray-200">
                        {doc.category}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-sans font-bold text-gray-800 text-xs line-clamp-1">{doc.title}</h4>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5 mt-1 truncate">{doc.fileName}</p>
                    </div>

                    <p className="text-[11px] text-gray-500 leading-relaxed font-sans">{doc.description}</p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-[9px] text-gray-400 font-mono">
                      Security policy: {doc.visibility.toUpperCase()}
                    </span>
                    <button
                      onClick={() => handleDownload(doc.id, doc.fileName)}
                      className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 hover:text-[#1B4332] bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg cursor-pointer transition"
                    >
                      <Download className="h-3 w-3" />
                      <span>SECURE DOWNLOAD</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
