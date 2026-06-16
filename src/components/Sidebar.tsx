/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User, UserRole } from '../types';
import { 
  Sprout, 
  LayoutDashboard, 
  CreditCard, 
  Mail, 
  FileText, 
  LogOut, 
  ShieldAlert,
  Users,
  X
} from 'lucide-react';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ user, activeTab, setActiveTab, onLogout, isOpen, onClose }: SidebarProps) {
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'bg-red-500/15 text-red-500 border-red-500/25';
      case UserRole.FARM_MANAGER: return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25';
      case UserRole.INVESTOR: return 'bg-amber-500/15 text-amber-500 border-amber-500/25';
      default: return 'bg-gray-500/15 text-gray-500';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'Super Admin';
      case UserRole.FARM_MANAGER: return 'Farm Manager';
      case UserRole.INVESTOR: return 'Investor Client';
      default: return 'User';
    }
  };

  return (
    <aside 
      id="portal-sidebar" 
      className={`fixed top-0 left-0 w-[280px] h-screen bg-gradient-to-b from-[#0F291E] via-[#143427] to-[#0E251B] text-white flex flex-col justify-between border-r border-[#2D6A4F]/20 z-40 shadow-2xl transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Sidebar Header & Brand */}
      <div className="p-6 relative">
        {onClose && (
          <button
            id="btn-sidebar-close"
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center transition cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#52B788]/10 rounded-2xl border border-[#52B788]/20 shadow-inner">
            <Sprout className="h-6 w-6 text-[#52B788]" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-xl tracking-wide text-white leading-tight">Adubiaro</h1>
            <p className="text-[9px] uppercase tracking-widest text-[#52B788] font-mono leading-none font-bold mt-0.5">ESTATE INVESTOR PORTAL</p>
          </div>
        </div>

        {/* User Card */}
        <div className="mt-8 p-4.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-3">
            {user.profilePhoto ? (
              <img 
                src={user.profilePhoto} 
                alt={user.name} 
                className="w-10 h-10 rounded-full object-cover border-2 border-[#52B788]/30 shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#52B788] to-[#2D6A4F] text-white flex items-center justify-center font-bold font-sans text-xs shadow-inner">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-sans font-semibold text-xs truncate text-white">{user.name}</h2>
              <span className={`inline-block mt-1 px-2.5 py-0.5 text-[8px] font-mono font-bold rounded-full border ${getRoleBadgeColor(user.role)}`}>
                {getRoleLabel(user.role).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Options */}
        <nav className="mt-8 space-y-1.5">
          <button
            id="nav-dashboard"
            onClick={() => {
              setActiveTab('dashboard');
              if (onClose) onClose();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'bg-gradient-to-r from-[#52B788] to-[#3B946A] text-[#0A2619] shadow-lg shadow-[#1B4332]/40 font-bold' 
                : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-4.5 w-4.5" />
            <span>Dashboard</span>
          </button>

          {/* Manager is STRICTLY forbidden from financial records */}
          {user.role !== UserRole.FARM_MANAGER && (
            <button
              id="nav-financials"
              onClick={() => {
                setActiveTab('financials');
                if (onClose) onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
                activeTab === 'financials' 
                  ? 'bg-gradient-to-r from-[#52B788] to-[#3B946A] text-[#0A2619] shadow-lg shadow-[#1B4332]/40 font-bold' 
                  : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <CreditCard className="h-4.5 w-4.5" />
              <span>Investment Ledger</span>
            </button>
          )}

          <button
            id="nav-outbox"
            onClick={() => {
              setActiveTab('outbox');
              if (onClose) onClose();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
              activeTab === 'outbox' 
                ? 'bg-gradient-to-r from-[#52B788] to-[#3B946A] text-[#0A2619] shadow-lg shadow-[#1B4332]/40 font-bold' 
                : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <Mail className="h-4.5 w-4.5" />
            <div className="flex items-center justify-between w-full">
              <span>Simulated Outbox</span>
              <span className="bg-[#D4A017] text-[#0A2619] text-[8px] px-2 py-0.5 rounded-full font-mono font-black border border-[#D4A017]/30">LIVE</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Logout Action Area */}
      <div className="p-6">
        <button
          id="nav-logout"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#F8F4EC]/60 hover:bg-red-500/10 hover:text-red-400 Transition-all duration-150 cursor-pointer border border-transparent hover:border-red-500/20"
        >
          <LogOut className="h-4.5 w-4.5" />
          <span>Disconnect Portal</span>
        </button>
      </div>
    </aside>
  );
}
