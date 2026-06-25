/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sprout, 
  MapPin, 
  DollarSign, 
  Calendar, 
  FileText, 
  ChevronRight, 
  TrendingUp, 
  User, 
  Award, 
  Compass,
  HelpCircle
} from 'lucide-react';
import { User as UserType, Farm } from '../types';

interface InvestorDashboardProps {
  user: UserType;
  token: string;
  onSelectFarm: (farmId: string) => void;
  refreshSignal: number;
}

export default function InvestorDashboard({ user, token, onSelectFarm, refreshSignal }: InvestorDashboardProps) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvestorPortfolio = async () => {
    try {
      setLoading(true);
      setError(null);

      // List of owned farms
      const farmsRes = await fetch('/api/farms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!farmsRes.ok) throw new Error('Could not pull investor farms data');
      const farmsData = await farmsRes.json();
      setFarms(farmsData);

      // Detail plot holdings (needs plotId lookup)
      if (farmsData.length > 0) {
        const detailsRes = await fetch(`/api/farms/${farmsData[0].id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const detailsData = await detailsRes.json();
        setHoldings(detailsData.investorHoldings || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred fetching portfolio holdings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestorPortfolio();
  }, [token, refreshSignal]);

  const totalCapital = holdings.reduce((sum, h) => sum + h.investmentAmount, 0);
  const totalHectares = holdings.reduce((sum, h) => sum + (h.sizeHectares || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1B4332] border-t-transparent animate-fade-in" />
      </div>
    );
  }

  return (
    <div id="investor-dashboard-container" className="space-y-8 animate-fade-in">
      {/* Welcome Hero BANNER */}
      <div className="relative bg-gradient-to-br from-[#0F291E] via-[#1B4332] to-[#2D6A4F] text-white p-10 rounded-3xl overflow-hidden border border-white/10 shadow-premium-lg">
        <div className="absolute right-0 bottom-0 opacity-[0.06] translate-x-1/6 translate-y-1/6 pointer-events-none">
          <Sprout className="h-96 w-96" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 bg-[#D4A017] text-white text-[9px] uppercase font-mono font-extrabold px-3 py-1 rounded-full tracking-wider shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            PORTFOLIO SECURE ACCESS
          </span>
          <h1 className="font-serif font-semibold text-3xl text-white tracking-wide mt-4">Welcome back, {user.name}</h1>
          <p className="text-xs text-[#52B788]/90 max-w-lg mt-2 font-mono leading-relaxed">
            Monitor deed-allocated high-yield oil palm estates, certified boundary coordinates, and dynamic quarterly payout schedules in real-time.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('start-onboarding-tour'))}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white hover:text-[#52B788] px-4.5 py-2 rounded-xl text-xs font-mono font-bold transition duration-300 cursor-pointer shadow-sm active:scale-95"
              title="Launch interactive getting started guide"
            >
              <HelpCircle className="h-4 w-4 text-[#D4A017]" />
              <span>Interactive Portal Tour</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI stats grid */}
      <div id="investor-stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <div className="bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium hover:shadow-premium-hover transition duration-300 flex items-center gap-4">
          <div className="p-3.5 bg-[#1B4332]/5 text-[#1B4332] rounded-xl">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">Total Investment</div>
            <div className="text-xl font-extrabold text-[#1B4332] font-sans mt-1">₦{totalCapital.toLocaleString()}</div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium hover:shadow-premium-hover transition duration-300 flex items-center gap-4">
          <div className="p-3.5 bg-[#D4A017]/5 text-[#D4A017] rounded-xl">
            <Sprout className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">Deeded Plots</div>
            <div className="text-xl font-extrabold text-gray-800 font-sans mt-1">{holdings.length} Active</div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium hover:shadow-premium-hover transition duration-300 flex items-center gap-4">
          <div className="p-3.5 bg-[#52B788]/5 text-[#2D6A4F] rounded-xl">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">Land Area</div>
            <div className="text-xl font-extrabold text-gray-800 font-sans mt-1">{totalHectares.toFixed(1)} ha</div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium hover:shadow-premium-hover transition duration-300 flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">Ownership status</div>
            <div className="text-xl font-extrabold text-emerald-700 font-sans mt-1">100% Certified</div>
          </div>
        </div>
      </div>

      {/* Owned farms list & plots grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Owned Farms Left side - 5 columns */}
        <div id="investor-farms-list" className="lg:col-span-5 space-y-4">
          <h2 className="font-sans font-extrabold text-xs text-[#2c3e35]/70 uppercase tracking-wider font-mono">My Farm holdings</h2>
          
          <div className="space-y-4">
            {farms.length === 0 ? (
              <div className="bg-white p-8 text-center rounded-2xl border border-gray-100 shadow-premium">
                <p className="text-xs text-gray-400">You do not own any plot allocations yet.</p>
              </div>
            ) : (
              farms.map(farm => (
                <div 
                  key={farm.id}
                  onClick={() => onSelectFarm(farm.id)}
                  className="bg-white rounded-2xl overflow-hidden border border-[#2D6A4F]/10 shadow-premium hover:shadow-premium-hover transition duration-300 cursor-pointer group"
                >
                  <div className="relative h-36 bg-gray-100 overflow-hidden">
                    <img src={farm.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition duration-750 ease-out" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif font-bold text-[#1B4332] text-base group-hover:text-[#2D6A4F] transition">{farm.name}</h3>
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-2 font-mono">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#2D6A4F]" />
                      <span>{farm.location}, {farm.state}</span>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-gray-50 pt-3.5 text-xs text-[#2D6A4F] font-bold uppercase tracking-wide font-mono">
                      <span>Explore chronicles & documents</span>
                      <ChevronRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-1 text-[#D4A017]" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Owned Plots specifications right side - 7 columns */}
        <div id="investor-plots-table" className="lg:col-span-7 space-y-4">
          <h2 className="font-sans font-extrabold text-xs text-[#2c3e35]/70 uppercase tracking-wider font-mono">Acreage Plot Specifications</h2>
          
          <div className="bg-white rounded-2xl border border-[#2D6A4F]/10 shadow-premium overflow-hidden p-6 space-y-5">
            
            {holdings.length === 0 ? (
              <div className="text-center p-8 text-gray-400 text-xs font-mono">
                No plot registries found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs bg-white rounded-xl">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 uppercase font-mono tracking-wider">
                      <th className="py-3 px-2 font-bold select-none">Plot ID</th>
                      <th className="py-3 px-2 font-bold select-none">Crop Cultivar</th>
                      <th className="py-3 px-2 font-bold font-sans select-none">Investment</th>
                      <th className="py-3 px-2 font-bold select-none">Land size</th>
                      <th className="py-3 px-2 font-bold select-none">Contract Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h, idx) => (
                      <tr key={idx} className="border-b last:border-0 border-gray-50 hover:bg-[#FBF9F4]/40 transition">
                        <td className="py-4.5 px-2 font-mono font-bold text-[#1B4332]">{h.plotNumber || 'N/A'}</td>
                        <td className="py-4.5 px-2 text-[#2c3e35] font-semibold">{h.cropType || 'Oil Palm'}</td>
                        <td className="py-4.5 px-2 font-extrabold text-emerald-800 font-sans">₦{h.investmentAmount?.toLocaleString()}</td>
                        <td className="py-4.5 px-2 text-gray-500 font-mono font-medium">{h.sizeHectares || '1.0'} ha</td>
                        <td className="py-4.5 px-2 font-mono text-gray-400 font-bold">{h.contractRef || 'CON-DEED'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-4 bg-[#FBF9F4] rounded-xl border border-[#D4A017]/20 text-[11px] leading-relaxed text-[#2c3e35]/80 flex gap-2.5">
              <span className="font-extrabold text-[#D4A017] shrink-0 uppercase tracking-wider select-none">Deed Notice:</span>
              <span>All plot allocations are deeded via notarized covenants. Contracts, certificates, and land boundary surveys can be requested securely in the document vault inner panels.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
