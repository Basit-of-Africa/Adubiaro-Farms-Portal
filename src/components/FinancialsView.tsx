/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle, 
  Calendar,
  Layers,
  ArrowRight,
  Download
} from 'lucide-react';
import { User, FinancialStatus } from '../types';

interface FinancialsViewProps {
  user: User;
  token: string;
  refreshSignal: number;
}

export default function FinancialsView({ user, token, refreshSignal }: FinancialsViewProps) {
  const [financials, setFinancials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinancials = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/financials/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Access boundary triggered');
      }
      const data = await res.json();
      setFinancials(data);
    } catch (e: any) {
      setError(e.message || 'Error occurred loading financials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, [token, refreshSignal]);

  const getStatusBadgeClass = (status: FinancialStatus) => {
    switch (status) {
      case FinancialStatus.PAID: 
        return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25';
      case FinancialStatus.PENDING: 
        return 'bg-amber-500/15 text-amber-600 border-amber-500/25';
      case FinancialStatus.OVERDUE: 
        return 'bg-rose-500/15 text-rose-500 border-rose-500/25';
      case FinancialStatus.PARTIAL: 
        return 'bg-blue-500/15 text-blue-500 border-blue-500/25';
      default: 
        return 'bg-gray-500/15 text-gray-500 border-gray-500/25';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1B4332] border-t-transparent animate-fade-in" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border-l-4 border-red-500 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-red-500 h-5 w-5 shrink-0" />
          <h3 className="font-sans font-bold text-sm text-red-800">Operational Security Violation</h3>
        </div>
        <p className="text-xs text-red-700 leading-relaxed max-w-xl">
          {error}. Under regulatory security policies, farm manager assignment operations are restricted from auditing financials. Please request assistance from administrative supervisors.
        </p>
      </div>
    );
  }

  // Math summary stats
  const totalPaid = financials.filter(f => f.status === 'paid').reduce((s, f) => s + f.payoutAmount, 0);
  const totalPending = financials.filter(f => f.status === 'pending').reduce((s, f) => s + f.payoutAmount, 0);
  const totalRoiCombined = financials.reduce((sum, f) => sum + (f.roiPercentage || 0), 0);
  const avgRoi = financials.length > 0 ? (totalRoiCombined / financials.length) : 0;

  const handleExportToCSV = () => {
    if (financials.length === 0) return;

    // Helper to escape values for CSV formulation
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
    };

    const headers = [
      'Billing Cycle',
      ...(user.role === 'admin' ? ['Investor Client'] : []),
      'Plot ID',
      'Crop Cultivar',
      'Net Payout (₦)',
      'Yield ROI (%)',
      'Ledger Date',
      'Status',
      'Auditor Remarks'
    ];

    const rows = financials.map(fin => [
      `${fin.period} ${fin.year}`,
      ...(user.role === 'admin' ? [fin.investorName || ''] : []),
      fin.plotNumber || '',
      fin.cropType || '',
      fin.payoutAmount || 0,
      fin.roiPercentage || 0,
      fin.payoutDate || '',
      fin.status || '',
      fin.notes || ''
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `adubiaro_investment_payouts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="financials-stage" className="space-y-8 animate-fade-in">
      
      {/* Title */}
      <div className="bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-serif font-extrabold text-2xl text-[#1B4332] tracking-wide">Investment Ledger Statements</h1>
          <p className="text-xs text-[#2c3e35]/60 font-mono mt-1">Notarized statements, audits & historical ROI payout records</p>
        </div>
        {financials.length > 0 && (
          <button
            onClick={handleExportToCSV}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-[#52B788] hover:text-white rounded-xl text-xs font-bold transition duration-300 shadow-sm border border-[#52B788]/20 cursor-pointer animate-fade-in"
          >
            <Download className="h-4 w-4 animate-bounce" />
            <span>Export to CSV</span>
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium hover:shadow-premium-hover transition duration-300 flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-[#1B4332] rounded-xl">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">Distributed Payouts</div>
            <div className="text-xl font-extrabold text-[#1B4332] font-sans mt-1">₦{totalPaid?.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium hover:shadow-premium-hover transition duration-300 flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">Pending Disburse</div>
            <div className="text-xl font-extrabold text-gray-800 font-sans mt-1">₦{totalPending?.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium hover:shadow-premium-hover transition duration-300 flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">Mean ROI Performance</div>
            <div className="text-xl font-extrabold text-[#1B4332] font-sans mt-1">{avgRoi?.toFixed(1)}%</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#2D6A4F]/10 shadow-premium hover:shadow-premium-hover transition duration-300 flex items-center gap-4">
          <div className="p-3.5 bg-stone-50 text-stone-600 rounded-xl">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">Total Settlements</div>
            <div className="text-xl font-extrabold text-gray-800 font-sans mt-1">{financials.length} cycles</div>
          </div>
        </div>

      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-[#2D6A4F]/10 shadow-premium overflow-hidden p-6">
        {financials.length === 0 ? (
          <div className="text-center p-12 text-gray-400 font-mono text-xs">
            No audited financial summaries found for your target plot allocations.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs bg-white rounded-xl">
              <thead>
                <tr className="border-b border-gray-150 text-gray-400 uppercase font-mono tracking-wider">
                  <th className="py-4 px-3 font-bold select-none">Billing Cycle</th>
                  {user.role === 'admin' && <th className="py-4 px-3 font-bold select-none">Investor Client</th>}
                  <th className="py-4 px-3 font-bold text-center select-none">Plot ID</th>
                  <th className="py-4 px-3 font-bold select-none">Crop cultivar</th>
                  <th className="py-4 px-3 font-bold text-right select-none">Net Payout</th>
                  <th className="py-4 px-3 font-bold text-center select-none">Yield ROI %</th>
                  <th className="py-4 px-3 font-bold select-none">Ledger Date</th>
                  <th className="py-4 px-3 font-bold text-center select-none">Status</th>
                  <th className="py-4 px-3 font-bold max-w-[200px] select-none">Auditor Remarks</th>
                </tr>
              </thead>
              <tbody>
                {financials.map((fin) => (
                  <tr key={fin.id} className="border-b last:border-0 border-gray-50 hover:bg-[#FBF9F4]/40 transition">
                    <td className="py-5 px-3 font-sans font-bold text-[#1B4332]">{fin.period} {fin.year}</td>
                    {user.role === 'admin' && (
                      <td className="py-5 px-3 font-semibold text-[#2c3e35] font-sans">{fin.investorName}</td>
                    )}
                    <td className="py-5 px-3 text-center font-mono text-[#1B4332] font-extrabold">{fin.plotNumber}</td>
                    <td className="py-5 px-3 text-[#2c3e35]/80 font-medium font-mono text-[11px] truncate">{fin.cropType}</td>
                    <td className="py-5 px-3 text-right font-sans font-extrabold text-[#1B4332]">₦{fin.payoutAmount?.toLocaleString()}</td>
                    <td className="py-5 px-3 text-center font-mono font-extrabold text-[#D4A017]">{fin.roiPercentage}%</td>
                    <td className="py-5 px-3 text-gray-400 font-mono text-[11px] font-semibold">{fin.payoutDate}</td>
                    <td className="py-5 px-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase rounded-full border ${getStatusBadgeClass(fin.status)}`}>
                        {fin.status}
                      </span>
                    </td>
                    <td className="py-5 px-3 text-gray-500 font-normal leading-relaxed font-sans max-w-[250px] truncate" title={fin.notes}>
                      {fin.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
