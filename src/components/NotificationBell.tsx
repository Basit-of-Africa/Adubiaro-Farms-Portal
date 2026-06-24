import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Coins, 
  Sprout, 
  FileCheck, 
  X, 
  CheckCheck, 
  Download, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { User, UserRole } from '../types';

interface NotificationBellProps {
  user: User;
  token: string;
  refreshSignal?: number;
}

export default function NotificationBell({ user, token, refreshSignal }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load read status from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`read_notifications_${user.id}`);
      if (stored) {
        setReadIds(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse read notifications:', e);
    }
  }, [user.id]);

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      } else {
        console.warn('Notification endpoint responded with non-ok status:', res.status);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications gracefully:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when token or refresh signal updates
  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 30 seconds for live updates
    const timer = setInterval(() => {
      fetchNotifications();
    }, 30000);
    return () => clearInterval(timer);
  }, [token, refreshSignal]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  const handleMarkAllRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    localStorage.setItem(`read_notifications_${user.id}`, JSON.stringify(allIds));
  };

  const handleAlertClick = (alert: any) => {
    setSelectedAlert(alert);
    setIsOpen(false);
    if (!readIds.includes(alert.id)) {
      const updated = [...readIds, alert.id];
      setReadIds(updated);
      localStorage.setItem(`read_notifications_${user.id}`, JSON.stringify(updated));
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'roi_payout':
        return (
          <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-inner">
            <Coins className="h-4.5 w-4.5" />
          </div>
        );
      case 'farm_update':
        return (
          <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-150 flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
            <Sprout className="h-4.5 w-4.5" />
          </div>
        );
      case 'document_upload':
        return (
          <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 shadow-inner">
            <FileCheck className="h-4.5 w-4.5" />
          </div>
        );
      default:
        return (
          <div className="h-9 w-9 rounded-xl bg-gray-50 border border-gray-250 flex items-center justify-center text-gray-600 shrink-0">
            <Bell className="h-4.5 w-4.5" />
          </div>
        );
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef} id="notification-wrapper">
      {/* Bell Trigger Button */}
      <button
        id="btn-bell-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-[#1B4332] hover:bg-neutral-100 rounded-xl transition duration-200 cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center border border-gray-150/50"
        aria-label="View alerts"
      >
        <Bell className="h-5 w-5 pointer-events-none" />
        {unreadCount > 0 && (
          <span 
            id="unread-badge-count" 
            className="absolute -top-1 -right-1 bg-red-500 text-white font-mono font-bold text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 border-2 border-[#FBF9F4] animate-pulse"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Container */}
      {isOpen && (
        <div 
          id="notifications-dropdown"
          className="absolute right-0 mt-3.5 w-[calc(100vw-32px)] max-w-sm sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden origin-top-right animate-fadeIn"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-50 bg-[#143427] text-white flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-sm tracking-wide">Recent Alerts</h3>
              <p className="text-[10px] text-[#52B788] font-mono font-semibold">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            </div>
            
            {unreadCount > 0 && (
              <button
                id="btn-mark-all-read"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[10.5px] font-mono font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-[#52B788] rounded-lg transition duration-150 cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark Clean</span>
              </button>
            )}
          </div>

          {/* List Workspace */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs font-mono">
                Spinning secure logs...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <Bell className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                <p className="text-xs font-medium text-gray-500">No recent alerts found</p>
                <p className="text-[10px] font-mono text-gray-400 mt-1">All clean! Check back later.</p>
              </div>
            ) : (
              notifications.map((alert) => {
                const isRead = readIds.includes(alert.id);
                return (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className={`p-4 flex gap-3 hover:bg-neutral-50/80 cursor-pointer transition relative group ${
                      !isRead ? 'bg-emerald-50/20' : ''
                    }`}
                  >
                    {!isRead && (
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    )}
                    
                    {getAlertIcon(alert.type)}

                    <div className="flex-1 min-w-0 pr-1 pl-1">
                      <div className="flex justify-between items-start gap-1">
                        <h4 className={`text-[12.5px] font-bold truncate ${!isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                          {alert.title}
                        </h4>
                        <span className="text-[9px] font-mono text-gray-400 whitespace-nowrap pt-0.5">
                          {formatDate(alert.date).split(',')[0]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {alert.message}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold bg-[#E8F5E9] text-[#2D6A4F] px-1.5 py-0.5 rounded uppercase tracking-wider">
                          {alert.type.split('_').join(' ')}
                        </span>
                        <span className="text-[10px] text-[#2D6A4F] font-bold opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                          View details <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Alert Detail Modal Drawer */}
      {selectedAlert && (
        <div 
          id="alert-detail-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07140e]/60 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100">
            {/* Header */}
            <div className={`p-6 text-white flex justify-between items-start ${
              selectedAlert.type === 'roi_payout' ? 'bg-gradient-to-r from-[#D4A017] to-amber-600' :
              selectedAlert.type === 'document_upload' ? 'bg-gradient-to-r from-blue-600 to-indigo-700' :
              'bg-gradient-to-r from-[#143427] to-[#2D6A4F]'
            }`}>
              <div>
                <span className="text-[9.5px] font-mono font-extrabold uppercase bg-white/20 tracking-wider px-2.5 py-1 rounded-full text-white">
                  {selectedAlert.type.split('_').join(' ')} Alert
                </span>
                <h3 className="font-serif font-extrabold text-xl mt-3 leading-tight">{selectedAlert.title}</h3>
                <p className="text-[11px] opacity-80 mt-1 font-mono">Published {formatDate(selectedAlert.date)}</p>
              </div>
              <button
                _id="btn-close-modal"
                onClick={() => setSelectedAlert(null)}
                className="p-1 px-1.5 hover:bg-white/10 rounded-xl text-white cursor-pointer transition min-w-[32px] min-h-[32px] flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contents details */}
            <div className="p-6 space-y-6">
              
              {/* Main Message summary card */}
              <div className="bg-gray-50/60 border border-gray-100 p-4 rounded-2xl">
                <p className="text-sm text-gray-700 leading-relaxed font-sans">{selectedAlert.message}</p>
              </div>

              {/* Grid Metadata details based on type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                {selectedAlert.meta?.farmName && (
                  <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                    <span className="text-gray-400 font-mono text-[10px] uppercase font-bold tracking-wider">Farm Estate</span>
                    <p className="text-gray-800 font-bold mt-1 text-sm">{selectedAlert.meta.farmName}</p>
                  </div>
                )}

                {selectedAlert.type === 'roi_payout' && (
                  <>
                    <div className="bg-amber-50/30 p-3 rounded-xl border border-amber-100/50">
                      <span className="text-amber-700/60 font-mono text-[10px] uppercase font-bold tracking-wider">Payout Amount</span>
                      <p className="text-amber-800 font-mono font-extrabold mt-1 text-base">
                        ₦{selectedAlert.meta.payoutAmount?.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-amber-50/30 p-3 rounded-xl border border-amber-100/50">
                      <span className="text-amber-700/60 font-mono text-[10px] uppercase font-bold tracking-wider">Yield Return (ROI)</span>
                      <p className="text-amber-800 font-mono font-extrabold mt-1 text-base flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-amber-600" />
                        {selectedAlert.meta.roiPercentage}%
                      </p>
                    </div>
                    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                      <span className="text-gray-400 font-mono text-[10px] uppercase font-bold tracking-wider">Period</span>
                      <p className="text-gray-800 font-bold mt-1 text-sm">
                        {selectedAlert.meta.period} {selectedAlert.meta.year}
                      </p>
                    </div>
                    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                      <span className="text-gray-400 font-mono text-[10px] uppercase font-bold tracking-wider">Plot Code</span>
                      <p className="text-gray-800 font-bold mt-1 text-sm">Plot #{selectedAlert.meta.plotNumber}</p>
                    </div>
                  </>
                )}

                {selectedAlert.type === 'farm_update' && (
                  <>
                    <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-100/50">
                      <span className="text-emerald-700/60 font-mono text-[10px] uppercase font-bold tracking-wider">Update Category</span>
                      <p className="text-emerald-800 font-bold mt-1 text-sm capitalize">{selectedAlert.meta.updateType}</p>
                    </div>
                    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                      <span className="text-gray-400 font-mono text-[10px] uppercase font-bold tracking-wider">Published By</span>
                      <p className="text-gray-800 font-bold mt-1 text-sm">{selectedAlert.meta.postedByName || 'System'}</p>
                    </div>
                    {selectedAlert.meta.body && (
                      <div className="col-span-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100/50 max-h-36 overflow-y-auto">
                        <span className="text-gray-400 font-mono text-[10px] uppercase font-bold tracking-wider">Body Preview</span>
                        <p className="text-gray-700 whitespace-pre-wrap mt-1 leading-relaxed text-xs">{selectedAlert.meta.body}</p>
                      </div>
                    )}
                  </>
                )}

                {selectedAlert.type === 'document_upload' && (
                  <>
                    <div className="bg-blue-50/30 p-3 rounded-xl border border-blue-100/50 col-span-2">
                      <span className="text-blue-700/60 font-mono text-[10px] uppercase font-bold tracking-wider">File Attachment</span>
                      <p className="text-blue-900 font-bold mt-1 text-sm truncate">{selectedAlert.meta.fileName}</p>
                    </div>
                    {selectedAlert.meta.description && (
                      <div className="col-span-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                        <span className="text-gray-400 font-mono text-[10px] uppercase font-bold tracking-wider">Document Summary</span>
                        <p className="text-gray-700 mt-1 leading-relaxed text-xs">{selectedAlert.meta.description}</p>
                      </div>
                    )}
                  </>
                )}

              </div>

              {/* Bottom interactive action button */}
              <div className="pt-4 border-t border-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-500 hover:bg-neutral-50 rounded-xl text-xs font-bold cursor-pointer transition duration-150"
                >
                  Dismiss
                </button>
                
                {selectedAlert.type === 'document_upload' && selectedAlert.meta?.fileUrl && (
                  <a
                    href={selectedAlert.meta.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition duration-150 shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Attachment</span>
                  </a>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
