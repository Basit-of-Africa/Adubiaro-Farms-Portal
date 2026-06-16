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
        
        <div className="text-[9px] font-mono tracking-wider bg-white/5 border border-white/10 px-2.5 py-1 rounded-full uppercase text-[#52B788] font-bold">
          {currentUser.role.split('_').join(' ')}
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

        {/* Django project instructions shortcut section */}
        <div className="mt-16 border-t border-gray-200 pt-8 max-w-4xl">
          <div className="bg-white p-6 rounded-2xl border border-dashed border-gray-200 space-y-4">
            <div className="flex items-center gap-2.5">
              <FolderGit2 className="h-5 w-5 text-[#1B4332]" />
              <h3 className="font-sans font-bold text-sm text-gray-800">Exportable Django Core Project Ready</h3>
            </div>
            
            <p className="text-[11.5px] leading-relaxed text-gray-500 font-sans">
              We have compiled a complete, beautifully structured, and fully functional Django project code inside your repository folder <code>/django_project/</code>. You can instantly inspect it in your file hierarchy or download it as a standalone ZIP archive using the settings icon in your workspace menu. It contains all DB mapping files, secure download endpoints, SMTP custom emails modules, white-noise files, and nixpacks configs ready for immediate deploy on Railway or local SQLite.
            </p>

            <div className="flex flex-wrap gap-2 text-[10px] font-mono select-none">
              <span className="bg-[#1B4332]/10 text-[#1B4332] px-2.5 py-1 rounded">DJANGO 4.2+</span>
              <span className="bg-[#1B4332]/10 text-[#1B4332] px-2.5 py-1 rounded">POSTGRESQL CAPABLE</span>
              <span className="bg-amber-50 text-amber-800 px-2.5 py-1 border border-amber-200/50 rounded">CLOUDINARY STORAGE</span>
              <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 border border-emerald-200/50 rounded">WHITENOISE EXCELLENCE</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
