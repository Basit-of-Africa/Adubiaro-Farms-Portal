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
import SettingsView from './components/SettingsView';
import QuickActions from './components/QuickActions';
import GlobalSearch from './components/GlobalSearch';
import OnboardingTour from './components/OnboardingTour';
import InvestorsView from './components/InvestorsView';
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
  X,
  Sun,
  Moon,
  Smartphone
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);

  // Capture beforeinstallprompt for PWA downloadability
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      setIsInstallModalOpen(true);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`⚡ [PWA] User choice outcome: ${outcome}`);
    setDeferredPrompt(null);
  };
  
  // Refresh signals allowing children tables to update whenever operations forms are saved
  const [refreshSignal, setRefreshSignal] = useState<number>(0);
  const triggerRefreshSignal = () => setRefreshSignal((prev) => prev + 1);

  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);

  // Auto-launch tour for new investors and register manual trigger listener
  useEffect(() => {
    if (currentUser && currentUser.role === UserRole.INVESTOR) {
      const isCompleted = localStorage.getItem(`onboarding_tour_completed_${currentUser.id}`);
      if (isCompleted !== 'true') {
        const timer = setTimeout(() => {
          setIsTourOpen(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    const handler = () => {
      // Ensure we are back on the main dashboard tab so the stats and holding grids are rendered and visible
      setActiveTab('dashboard');
      setSelectedFarmId(null);
      
      // Delay slightly to allow the dashboard view to mount before calculating positions
      setTimeout(() => {
        setIsTourOpen(true);
      }, 100);
    };
    window.addEventListener('start-onboarding-tour', handler);
    return () => window.removeEventListener('start-onboarding-tour', handler);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const [portalSettings, setPortalSettings] = useState<any>({
    portalName: 'Adubiaro Farm Portal',
    logoText: 'ADUBIARO',
    accentColor: 'emerald',
    announcementBanner: '',
    bannerType: 'none',
    allowedCrops: [],
  });

  const fetchPortalSettings = async () => {
    try {
      const res = await fetch('/api/portal/settings');
      if (res.ok) {
        const data = await res.json();
        setPortalSettings(data);
      }
    } catch (err) {
      console.warn('Failed to load public portal settings:', err);
    }
  };

  useEffect(() => {
    fetchPortalSettings();
  }, [refreshSignal]);

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
    <div className="min-h-screen bg-[#FBF9F4] dark:bg-stone-950 text-[#2c3e35] dark:text-stone-200 font-sans flex flex-col antialiased transition-colors duration-300">
      
      {/* Portal Announcement Banner */}
      {portalSettings?.announcementBanner && portalSettings?.bannerType !== 'none' && (
        <div id="portal-announcement-banner" className={`text-center py-2 px-4 text-xs font-semibold flex items-center justify-center gap-2 select-none shadow-sm transition border-b leading-tight z-40 lg:ml-[280px] ${
          portalSettings.bannerType === 'info' 
            ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900/40'
            : portalSettings.bannerType === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/40'
              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-950/40'
        }`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse shrink-0" />
          <span><b>ANNOUNCEMENT:</b> {portalSettings.announcementBanner}</span>
        </div>
      )}
      
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
            <span className="font-serif font-bold text-base tracking-wide text-white">{portalSettings?.logoText || 'Adubiaro'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Mobile Theme Toggle Button */}
          <button
            id="mobile-theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 hover:bg-white/10 rounded-xl text-gray-300 hover:text-[#52B788] transition cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            title="Toggle Light/Dark Theme"
          >
            {isDarkMode ? <Sun className="h-5 w-5 text-[#52B788]" /> : <Moon className="h-5 w-5 text-gray-300" />}
          </button>
          
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
        logoText={portalSettings?.logoText}
        deferredPrompt={deferredPrompt}
        onInstallApp={handleInstallApp}
      />

      {/* Mobile Sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#07140e]/60 backdrop-blur-sm z-45 lg:hidden transition-all duration-300 pointer-events-auto"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Container workspace */}
      <div className="flex-1 lg:pl-[280px] w-full min-h-screen">
        <main id="main-content" className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 pb-20 w-full">
        
        {/* Mobile Global Search Bar */}
        <div id="mobile-search-container" className="lg:hidden w-full">
          <GlobalSearch 
            token={authToken} 
            user={currentUser} 
            onSelectFarm={handleSelectFarm} 
            setActiveTab={setActiveTab} 
          />
        </div>

        {/* Desktop Top Header Bar with Live Alerts */}
        <div className="hidden lg:flex justify-between items-center bg-white dark:bg-stone-900 border border-[#2D6A4F]/10 dark:border-stone-800 px-6 py-4.5 rounded-3xl shadow-premium transition-colors duration-300">
          <div>
            <span className="text-[10px] font-mono font-bold text-[#2D6A4F]/60 dark:text-[#52B788]/60 uppercase tracking-widest">Active Secure Session</span>
            <h2 className="font-serif font-extrabold text-[#1B4332] dark:text-[#52B788] text-xl mt-0.5 animate-fade-in">Welcome back, {currentUser.name}</h2>
          </div>

          <div id="global-search-container" className="flex-1 max-w-md mx-6">
            <GlobalSearch 
              token={authToken} 
              user={currentUser} 
              onSelectFarm={handleSelectFarm} 
              setActiveTab={setActiveTab} 
            />
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-xs font-extrabold text-gray-700 dark:text-stone-300">{currentUser.email}</p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-[9.5px] font-mono text-[#2D6A4F] dark:text-[#52B788]/85 uppercase font-bold tracking-wider">{currentUser.role.split('_').join(' ')} Profile</p>
              </div>
            </div>
            <div className="h-8 w-px bg-gray-150 dark:bg-stone-800" />
            
            {/* Desktop Theme Toggle Button */}
            <button
              id="desktop-theme-toggle"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 bg-stone-50 dark:bg-stone-800/40 hover:bg-[#1B4332]/10 dark:hover:bg-stone-800 rounded-xl text-gray-400 dark:text-stone-300 hover:text-[#1B4332] dark:hover:text-[#52B788] transition cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center border border-gray-150 dark:border-stone-800"
              title="Toggle Light/Dark Theme"
            >
              {isDarkMode ? <Sun className="h-5 w-5 text-[#52B788]" /> : <Moon className="h-5 w-5" />}
            </button>

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

        {/* SUPER ADMIN CORE CONTROL CONSOLE SETTINGS TAB */}
        {activeTab === 'settings' && (
          currentUser.role !== UserRole.ADMIN ? (
            <div className="p-8 bg-red-50 border-l-4 border-red-500 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="text-red-500 h-6 w-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-sans font-bold text-sm text-red-800">403 Access Unauthorized</h3>
                <p className="text-xs text-red-700 mt-1 max-w-xl">
                  Only Super Administrators have authorized clearance to manage global system configurations, database mode status, and role credential management panels.
                </p>
              </div>
            </div>
          ) : (
            <SettingsView 
              user={currentUser} 
              token={authToken} 
              triggerRefreshSignal={triggerRefreshSignal} 
              refreshSignal={refreshSignal} 
            />
          )
        )}

        {/* INVESTORS DIRECTORY MANAGEMENT TAB */}
        {activeTab === 'investors' && (
          (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.FARM_MANAGER) ? (
            <div className="p-8 bg-red-50 border-l-4 border-red-500 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="text-red-500 h-6 w-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-sans font-bold text-sm text-red-800">403 Access Unauthorized</h3>
                <p className="text-xs text-red-700 mt-1 max-w-xl">
                  You do not have administrative clearance to access the interactive investors directory.
                </p>
              </div>
            </div>
          ) : (
            <InvestorsView 
              user={currentUser} 
              token={authToken} 
              refreshSignal={refreshSignal}
              triggerRefreshSignal={triggerRefreshSignal}
            />
          )
        )}



        </main>
      </div>

      {/* Dynamic Role-Based Floating Quick Actions Menu */}
      <QuickActions 
        user={currentUser} 
        token={authToken} 
        onTabChange={setActiveTab} 
        onRefresh={triggerRefreshSignal} 
      />

      {/* Onboarding Tour Sequence for Investors */}
      <OnboardingTour 
        user={currentUser} 
        isOpen={isTourOpen} 
        onClose={() => setIsTourOpen(false)} 
      />

      {/* PWA Installation Guide Dialog */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="bg-white dark:bg-stone-900 border border-[#2D6A4F]/20 dark:border-stone-800 rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl relative overflow-hidden text-stone-800 dark:text-stone-100 animate-in fade-in zoom-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-dialog-title"
          >
            <button
              onClick={() => setIsInstallModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
              aria-label="Close installation guide"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-[#1B4332]/10 dark:bg-[#52B788]/10 rounded-2xl text-[#1B4332] dark:text-[#52B788]">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h3 id="pwa-dialog-title" className="font-sans font-bold text-lg md:text-xl text-[#1B4332] dark:text-emerald-400">
                  Install Farm Portal App
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Progressive Web App (PWA)
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed mb-6 text-stone-600 dark:text-stone-300">
              Access the premium portal instantly from your device's home screen. Enjoy faster load times, fullscreen workspace, and offline capabilities.
            </p>

            <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
              {/* Contextual warning for iframe */}
              {window.self !== window.top && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-semibold flex items-center gap-1.5 mb-1 text-amber-900 dark:text-amber-200">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Viewing inside Preview Frame
                  </p>
                  <p>
                    Browsers restrict installation triggers inside frame layouts. Please open the portal in a new tab to trigger the installation natively.
                  </p>
                </div>
              )}

              {/* Android Chrome */}
              <div className="p-3.5 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-100 dark:border-stone-800">
                <h4 className="font-semibold text-xs text-[#1B4332] dark:text-emerald-400 flex items-center gap-2 mb-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">1</span>
                  Android (Chrome)
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-normal pl-7">
                  Tap the <strong className="text-stone-800 dark:text-stone-200">three-dot menu icon</strong> at the top right of Chrome and select <strong className="text-[#1B4332] dark:text-emerald-400">"Add to Home screen"</strong> or <strong className="text-[#1B4332] dark:text-emerald-400">"Install app"</strong>.
                </p>
              </div>

              {/* iOS Safari */}
              <div className="p-3.5 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-100 dark:border-stone-800">
                <h4 className="font-semibold text-xs text-[#1B4332] dark:text-emerald-400 flex items-center gap-2 mb-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">2</span>
                  iPhone & iPad (Safari)
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-normal pl-7">
                  Tap the <strong className="text-stone-800 dark:text-stone-200">Share button</strong> (square with up arrow), scroll down, and select <strong className="text-[#1B4332] dark:text-emerald-400">"Add to Home Screen"</strong>.
                </p>
              </div>

              {/* Desktop PC */}
              <div className="p-3.5 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-100 dark:border-stone-800">
                <h4 className="font-semibold text-xs text-[#1B4332] dark:text-emerald-400 flex items-center gap-2 mb-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">3</span>
                  Desktop PC (Chrome/Edge)
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-normal pl-7">
                  Click the <strong className="text-[#1B4332] dark:text-emerald-400">Install icon</strong> (computer screen with a down arrow) on the right side of the URL address bar.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 pt-4 border-t border-stone-100 dark:border-stone-800">
              <a 
                href={window.location.href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold bg-[#1B4332] hover:bg-[#2D6A4F] text-white transition-all duration-300 shadow-md text-center cursor-pointer"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open Standalone Tab</span>
              </a>
              <button
                onClick={() => setIsInstallModalOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl text-xs font-medium bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-all text-center"
              >
                Got it, Thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
