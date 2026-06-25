/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  FileText, 
  Layers, 
  Landmark, 
  Sprout, 
  ChevronRight, 
  X, 
  Loader2,
  TrendingUp,
  FileCheck,
  User
} from 'lucide-react';
import { User as UserType } from '../types';

interface GlobalSearchProps {
  token: string;
  user: UserType;
  onSelectFarm: (farmId: string) => void;
  setActiveTab: (tab: string) => void;
}

export default function GlobalSearch({ token, user, onSelectFarm, setActiveTab }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search results on query change
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error('Error fetching global search results:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, token]);

  const handleResultClick = (type: 'farm' | 'plot' | 'investorPlot' | 'document' | 'financial', item: any) => {
    setIsOpen(false);
    setQuery('');
    setResults(null);

    if (type === 'farm') {
      onSelectFarm(item.id);
    } else if (type === 'plot') {
      onSelectFarm(item.farmId);
    } else if (type === 'document') {
      // Direct file download/open or link to download
      if (item.fileUrl && item.fileUrl.startsWith('#')) {
        alert(`Simulating access to document "${item.title}". Real file: ${item.fileName}`);
      } else {
        window.open(`/api/documents/${item.id}/download?token=${token}`, '_blank');
      }
    } else if (type === 'investorPlot' || type === 'financial') {
      setActiveTab('financials');
    }
  };

  const hasResults = results && (
    (results.farms && results.farms.length > 0) ||
    (results.plots && results.plots.length > 0) ||
    (results.investorPlots && results.investorPlots.length > 0) ||
    (results.documents && results.documents.length > 0) ||
    (results.financials && results.financials.length > 0)
  );

  return (
    <div className="relative w-full max-w-md" ref={dropdownRef}>
      {/* Search Bar Container */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2D6A4F]/60 dark:text-[#52B788]/60" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search farms, land plots, records, or docs..."
          className="w-full bg-[#FBF9F4] dark:bg-stone-850 border border-[#2D6A4F]/10 dark:border-stone-800 text-xs text-[#1B4332] dark:text-stone-200 placeholder-gray-400 dark:placeholder-stone-500 rounded-xl pl-9.5 pr-8.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#2D6A4F] focus:border-[#2D6A4F] transition-all"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#2D6A4F] animate-spin" />
        ) : query ? (
          <button 
            onClick={() => {
              setQuery('');
              setResults(null);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-150 dark:hover:bg-stone-800 rounded text-gray-400 dark:text-stone-500 hover:text-gray-600 transition"
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}
      </div>

      {/* Search Overlay Dropdown */}
      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-stone-900 border border-gray-150 dark:border-stone-800 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[480px] flex flex-col">
          {loading && !results ? (
            <div className="p-8 text-center text-xs text-gray-400 dark:text-stone-500 font-mono flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#2D6A4F]" />
              <span>Scanning platform registry...</span>
            </div>
          ) : !hasResults ? (
            <div className="p-8 text-center text-xs text-gray-400 dark:text-stone-500 font-mono">
              No matching records found for "{query}"
            </div>
          ) : (
            <div className="overflow-y-auto divide-y divide-gray-100 dark:divide-stone-800">
              {/* Farms Category */}
              {results.farms && results.farms.length > 0 && (
                <div className="p-3">
                  <span className="text-[9px] font-mono font-bold text-[#2D6A4F]/60 dark:text-[#52B788]/60 uppercase tracking-widest block px-2 mb-1.5">
                    Farm Estates ({results.farms.length})
                  </span>
                  <div className="space-y-1">
                    {results.farms.map((farm: any) => (
                      <button
                        key={farm.id}
                        onClick={() => handleResultClick('farm', farm)}
                        className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-stone-800/40 rounded-xl flex items-center justify-between gap-3 transition group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-emerald-700 shrink-0">
                            <Sprout className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-800 dark:text-stone-200 group-hover:text-[#2D6A4F] truncate">{farm.name}</div>
                            <div className="text-[10px] text-gray-400 dark:text-stone-500 truncate">{farm.location}, {farm.state}</div>
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-stone-600 group-hover:text-[#2D6A4F] transition shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Land Plots Category */}
              {results.plots && results.plots.length > 0 && (
                <div className="p-3">
                  <span className="text-[9px] font-mono font-bold text-[#2D6A4F]/60 dark:text-[#52B788]/60 uppercase tracking-widest block px-2 mb-1.5">
                    Land Plots ({results.plots.length})
                  </span>
                  <div className="space-y-1">
                    {results.plots.map((plot: any) => (
                      <button
                        key={plot.id}
                        onClick={() => handleResultClick('plot', plot)}
                        className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-stone-800/40 rounded-xl flex items-center justify-between gap-3 transition group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 bg-[#52B788]/10 rounded-lg text-[#1B4332] dark:text-[#52B788] shrink-0">
                            <Layers className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-800 dark:text-stone-200 group-hover:text-[#2D6A4F] truncate">
                              Plot {plot.plotNumber}
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-stone-500 truncate">
                              {plot.cropType} • {plot.sizeHectares} Hectares ({plot.status})
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-stone-600 group-hover:text-[#2D6A4F] transition shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Investment Portfolio Holdings Category */}
              {results.investorPlots && results.investorPlots.length > 0 && (
                <div className="p-3">
                  <span className="text-[9px] font-mono font-bold text-[#2D6A4F]/60 dark:text-[#52B788]/60 uppercase tracking-widest block px-2 mb-1.5">
                    Investment Holdings ({results.investorPlots.length})
                  </span>
                  <div className="space-y-1">
                    {results.investorPlots.map((ip: any) => (
                      <button
                        key={ip.id}
                        onClick={() => handleResultClick('investorPlot', ip)}
                        className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-stone-800/40 rounded-xl flex items-center justify-between gap-3 transition group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-amber-700 shrink-0">
                            <Landmark className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-800 dark:text-stone-200 group-hover:text-[#2D6A4F] truncate">
                              Ref: {ip.contractRef}
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-stone-500 truncate">
                              Holdings: ₦{ip.investmentAmount?.toLocaleString()} • {ip.ownershipPercentage}% Ownership
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-stone-600 group-hover:text-[#2D6A4F] transition shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial Summary Records */}
              {results.financials && results.financials.length > 0 && (
                <div className="p-3">
                  <span className="text-[9px] font-mono font-bold text-[#2D6A4F]/60 dark:text-[#52B788]/60 uppercase tracking-widest block px-2 mb-1.5">
                    Financial Records ({results.financials.length})
                  </span>
                  <div className="space-y-1">
                    {results.financials.map((fin: any) => (
                      <button
                        key={fin.id}
                        onClick={() => handleResultClick('financial', fin)}
                        className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-stone-800/40 rounded-xl flex items-center justify-between gap-3 transition group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-emerald-700 shrink-0">
                            <TrendingUp className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-800 dark:text-stone-200 group-hover:text-[#2D6A4F] truncate">
                              Payout {fin.period} {fin.year}
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-stone-500 truncate">
                              ROI: {fin.roiPercentage}% • ₦{fin.payoutAmount?.toLocaleString()} ({fin.status})
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-stone-600 group-hover:text-[#2D6A4F] transition shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents Category */}
              {results.documents && results.documents.length > 0 && (
                <div className="p-3">
                  <span className="text-[9px] font-mono font-bold text-[#2D6A4F]/60 dark:text-[#52B788]/60 uppercase tracking-widest block px-2 mb-1.5">
                    Documents ({results.documents.length})
                  </span>
                  <div className="space-y-1">
                    {results.documents.map((doc: any) => (
                      <button
                        key={doc.id}
                        onClick={() => handleResultClick('document', doc)}
                        className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-stone-800/40 rounded-xl flex items-center justify-between gap-3 transition group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-blue-700 shrink-0">
                            <FileText className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-800 dark:text-stone-200 group-hover:text-[#2D6A4F] truncate">{doc.title}</div>
                            <div className="text-[10px] text-gray-400 dark:text-stone-500 truncate">{doc.fileName} • {doc.category}</div>
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-stone-600 group-hover:text-[#2D6A4F] transition shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
