/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  TrendingUp, 
  Sprout, 
  Coins, 
  Calendar, 
  MapPin, 
  ArrowUpRight 
} from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    totalFarms?: number;
    totalActiveFarms?: number;
    totalActiveInvestmentCount?: number;
    totalActiveInvestmentAmount?: number;
    totalPaidPayouts?: number;
    totalPendingPayouts?: number;
    totalPayoutsThisMonth?: number;
    totalPlotsCount?: number;
    totalInvestment?: number;
  } | null;
  loading?: boolean;
}

export default function DashboardStats({ stats, loading }: DashboardStatsProps) {
  // If stats is loading or unavailable, show premium skeleton loaders
  if (loading || !stats) {
    return (
      <div id="dashboard-stats-skeleton" className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map((idx) => (
          <div key={idx} className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-[#2D6A4F]/10 dark:border-stone-800/80 shadow-premium space-y-4">
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 bg-stone-100 dark:bg-stone-800 rounded-2xl" />
              <div className="h-4 w-12 bg-stone-100 dark:bg-stone-800 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-20 bg-stone-100 dark:bg-stone-800 rounded-full" />
              <div className="h-6 w-32 bg-stone-100 dark:bg-stone-800 rounded-full" />
            </div>
            <div className="h-3 w-40 bg-stone-50 dark:bg-stone-800/50 rounded-full pt-1" />
          </div>
        ))}
      </div>
    );
  }

  // Value formatting helpers
  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '₦0';
    return '₦' + val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const activeFarms = stats.totalActiveFarms ?? 0;
  const totalFarms = stats.totalFarms ?? 0;
  const activeInvestmentsValue = stats.totalActiveInvestmentAmount ?? stats.totalInvestment ?? 0;
  const activeInvestmentsCount = stats.totalActiveInvestmentCount ?? stats.totalPlotsCount ?? 0;
  const payoutsThisMonth = stats.totalPayoutsThisMonth ?? 0;

  return (
    <div id="dashboard-stats-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* 1. TOTAL ACTIVE INVESTMENTS */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-[#2D6A4F]/10 dark:border-stone-800/80 shadow-premium flex flex-col justify-between transition-all duration-300 hover:shadow-[#2D6A4F]/10 dark:hover:shadow-stone-850 relative group overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none" />
        <div className="flex items-start justify-between">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-2xl">
            <Coins className="h-6 w-6" />
          </div>
          <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
            Active Assets <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>
        <div className="mt-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 dark:text-stone-500 font-bold block">
            Total Active Investments
          </span>
          <h3 className="text-2xl font-serif font-extrabold text-[#1B4332] dark:text-[#52B788] mt-1 tracking-tight">
            {formatCurrency(activeInvestmentsValue)}
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-stone-400 mt-2 font-sans flex items-center gap-1.5">
            <span className="font-bold text-[#2D6A4F] dark:text-[#52B788]">{activeInvestmentsCount}</span> deeded plot active holdings configured
          </p>
        </div>
      </div>

      {/* 2. TOTAL PAYOUTS THIS MONTH */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-[#2D6A4F]/10 dark:border-stone-800/80 shadow-premium flex flex-col justify-between transition-all duration-300 hover:shadow-[#2D6A4F]/10 dark:hover:shadow-stone-850 relative group overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#D4A017]/5 to-transparent rounded-bl-full pointer-events-none" />
        <div className="flex items-start justify-between">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-2xl">
            <TrendingUp className="h-6 w-6" />
          </div>
          <span className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
            Current Month <Calendar className="h-3 w-3" />
          </span>
        </div>
        <div className="mt-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 dark:text-stone-500 font-bold block">
            Total Payouts This Month
          </span>
          <h3 className="text-2xl font-serif font-extrabold text-[#1B4332] dark:text-[#52B788] mt-1 tracking-tight">
            {formatCurrency(payoutsThisMonth)}
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-stone-400 mt-2 font-sans">
            Net investment yield audits scheduled for {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* 3. NUMBER OF ACTIVE FARMS */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-[#2D6A4F]/10 dark:border-stone-800/80 shadow-premium flex flex-col justify-between transition-all duration-300 hover:shadow-[#2D6A4F]/10 dark:hover:shadow-stone-850 relative group overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#52B788]/5 to-transparent rounded-bl-full pointer-events-none" />
        <div className="flex items-start justify-between">
          <div className="p-3 bg-[#52B788]/10 dark:bg-[#52B788]/5 text-emerald-800 dark:text-[#52B788] rounded-2xl">
            <Sprout className="h-6 w-6" />
          </div>
          <span className="bg-[#52B788]/10 dark:bg-[#52B788]/15 text-emerald-800 dark:text-[#52B788] text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
            Soil Telemetry <MapPin className="h-3 w-3" />
          </span>
        </div>
        <div className="mt-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 dark:text-stone-500 font-bold block">
            Number of Active Farms
          </span>
          <h3 className="text-2xl font-serif font-extrabold text-[#1B4332] dark:text-[#52B788] mt-1 tracking-tight">
            {activeFarms} <span className="text-xs text-gray-400 dark:text-stone-500 font-sans font-normal">/ {totalFarms} Configured</span>
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-stone-400 mt-2 font-sans">
            Estates actively broadcasting vegetation indices & smart logs
          </p>
        </div>
      </div>

    </div>
  );
}
