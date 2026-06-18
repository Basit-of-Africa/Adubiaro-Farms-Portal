/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import AdminDashboard from './components/AdminDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import InvestorDashboard from './components/InvestorDashboard';
import FarmDetail from './components/FarmDetail';
import FinancialsView from './components/FinancialsView';
import EmailOutbox from './components/EmailOutbox';
import NotificationBell from './components/NotificationBell';
import { User, UserRole } from './types';
import { 
  Sprout, 
  HelpCircle, 
  ShieldAlert, 
  FolderGit2, 
  BookOpen, 
  FileCheck, 
  Settings,
  Terminal,
  Heart,
  ExternalLink,
  Menu,
  X
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  
  // Refresh signals allowing children tables to update whenever operations forms are saved
  const [refreshSignal, setRefreshSignal] = useState<number>(0);
  const triggerRefreshSignal = () => setRefreshSignal((prev) => prev + 1);

  useEffect(() => {
    // Session restore check
    const token = localStorage.getItem('adubiaro_token');
    const userJson = localStorage.getItem('adubiaro_user');
    if (token && userJson) {
      setAuthToken(token);
      setCurrentUser(JSON.parse(userJson));
    }
  }, []);

  const handleLoginSuccess = (token: string, user: User) => {
    localStorage.setItem('adubiaro_token', token);
    localStorage.setItem('adubiaro_user', JSON.stringify(user));
    setAuthToken(token);
    setCurrentUser(user);
    setActiveTab('dashboard');
    setSelectedFarmId(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('adubiaro_token');
    localStorage.removeItem('adubiaro_user');
    setAuthToken(null);
    setCurrentUser(null);
    setActiveTab('dashboard');
    setSelectedFarmId(null);
  };

  // Switch to selected farm in detail tabs
  const handleSelectFarm = (farmId: string) => {
    setSelectedFarmId(farmId);
    setActiveTab('farm-detail');
  };

  const handleBackToDashboard = () => {
    setSelectedFarmId(null);
    setActiveTab('dashboard');
  };

  if (!currentUser || !authToken) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#FBF9F4] text-[#2c3e35] font-sans flex flex-col antialiased">
      
      {/* Mobile Top Navigation Headbar */}
      <header id="mobile-top-bar" className="lg:hidden flex items-center justify-between bg-[#143427] text-white py-3 px-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <button
            id="mobile-menu-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 -ml-2 text-gray-300 hover:text-white rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer transition"
            aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
            aria-expanded={isSidebarOpen}
            aria-controls="portal-sidebar"
          >
            {isSidebarOpen ? <X className="h-6 w-6 text-[#52B788]" /> : <Menu className="h-6 w-6 text-[#52B788]" />}
          </button>
          
          <div className="flex items-center gap-2 select-none">
            <Sprout className="h-5 w-5 text-[#52B788]" />
            <span className="font-serif font-bold text-base tracking-wide text-white">Adubiaro</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-[9px] font-mono tracking-wider bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-full uppercase text-[#52B788] font-bold">
            {currentUser.role.split('_').join(' ')}
          </div>
          <NotificationBell user={currentUser} token={authToken} refreshSignal={refreshSignal} />
        </div>
      </header>

      {/* Sidebar fixed nav boundary */}
      <Sidebar 
        user={currentUser} 
        activeTab={activeTab === 'farm-detail' ? 'dashboard' : activeTab} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        setActiveTab={(tab) => {
          setSelectedFarmId(null);
          setActiveTab(tab);
          setIsSidebarOpen(false);
        }} 
        onLogout={handleLogout} 
      />

      {/* Mobile Sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#07140e]/60 backdrop-blur-sm z-30 lg:hidden transition-all duration-300 pointer-events-auto"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Container workspace */}
      <main className="flex-1 lg:pl-[280px] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 pb-20 w-full min-h-screen">
        
        {/* Desktop Top Header Bar with Live Alerts */}
        <div className="hidden lg:flex justify-between items-center bg-white border border-[#2D6A4F]/10 px-6 py-4.5 rounded-3xl shadow-premium">
          <div>
            <span className="text-[10px] font-mono font-bold text-[#2D6A4F]/60 uppercase tracking-widest">Active Secure Session</span>
            <h2 className="font-serif font-extrabold text-[#1B4332] text-xl mt-0.5">Welcome back, {currentUser.name}</h2>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-xs font-extrabold text-gray-700">{currentUser.email}</p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-[9.5px] font-mono text-[#2D6A4F] uppercase font-bold tracking-wider">{currentUser.role.split('_').join(' ')} Profile</p>
              </div>
            </div>
            <div className="h-8 w-px bg-gray-150" />
            <NotificationBell user={currentUser} token={authToken} refreshSignal={refreshSignal} />
          </div>
        </div>

        {/* Dynamic workspace router */}
        {activeTab === 'dashboard' && (
          <>
            {currentUser.role === UserRole.ADMIN && (
              <AdminDashboard 
                user={currentUser} 
                token={authToken} 
                onSelectFarm={handleSelectFarm}
                triggerRefreshSignal={triggerRefreshSignal}
                refreshSignal={refreshSignal}
              />
            )}
            {currentUser.role === UserRole.FARM_MANAGER && (
              <ManagerDashboard 
                user={currentUser} 
                token={authToken} 
                onSelectFarm={handleSelectFarm}
                triggerRefreshSignal={triggerRefreshSignal}
                refreshSignal={refreshSignal}
              />
            )}
            {currentUser.role === UserRole.INVESTOR && (
              <InvestorDashboard 
                user={currentUser} 
                token={authToken} 
                onSelectFarm={handleSelectFarm}
                refreshSignal={refreshSignal}
              />
            )}
          </>
        )}

        {activeTab === 'farm-detail' && selectedFarmId && (
          <FarmDetail 
            user={currentUser}
            token={authToken}
            farmId={selectedFarmId}
            onBack={handleBackToDashboard}
            refreshSignal={refreshSignal}
          />
        )}

        {/* FINANCIAL LEDGER TAB - Enforce Manager-Level Block */}
        {activeTab === 'financials' && (
          currentUser.role === UserRole.FARM_MANAGER ? (
            <div className="p-8 bg-red-50 border-l-4 border-red-500 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="text-red-500 h-6 w-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-sans font-bold text-sm text-red-800">403 Operational Security Violation</h3>
                <p className="text-xs text-red-700 mt-1 max-w-xl">
                  Regulatory clearance policies restrict farm manager supervisors from auditing or reviewing investment payouts ledger records. Please direct requests to the system administrator.
                </p>
              </div>
            </div>
          ) : (
            <FinancialsView 
              user={currentUser} 
              token={authToken} 
              refreshSignal={refreshSignal} 
            />
          )
        )}

        {/* BACKGROUND TRIGGERS EMAIL OUTBOX TAB */}
        {activeTab === 'outbox' && (
          <EmailOutbox 
            token={authToken} 
            refreshSignal={refreshSignal} 
          />
        )}



      </main>
    </div>
  );
}
