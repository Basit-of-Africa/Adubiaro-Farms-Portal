/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Mail, Calendar, User, FileText, Send, ChevronRight, Inbox, Sparkles, CheckCircle2, AlertTriangle, HelpCircle, XCircle } from 'lucide-react';
import { SimulatedEmail } from '../types';

interface EmailOutboxProps {
  token: string;
  refreshSignal: number;
}

export default function EmailOutbox({ token, refreshSignal }: EmailOutboxProps) {
  const [emails, setEmails] = useState<SimulatedEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<SimulatedEmail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/emails/outbox', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const val = await res.json();
        setEmails(val);
        if (val.length > 0) {
          setSelectedEmail(val[0]);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [token, refreshSignal]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1B4332] border-t-transparent animate-fade-in" />
      </div>
    );
  }

  return (
    <div id="email-outbox-stage" className="space-y-8 animate-fade-in">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="font-sans font-bold text-2xl text-gray-800 tracking-tight flex items-center gap-2">
            <span>Simulated Notification Outbox</span>
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">Real-time log of background dispatch emails triggered by models and data actions</p>
        </div>
        <button
          onClick={fetchEmails}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium cursor-pointer hover:bg-gray-100 transition duration-150"
        >
          <Mail className="h-3.5 w-3.5 text-emerald-600" />
          <span>Monitor Outbox Logs</span>
        </button>
      </div>

      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/40 text-[11px] leading-relaxed text-amber-800 flex gap-2">
        <Sparkles className="h-4.5 w-4.5 shrink-0 text-[#D4A017]" />
        <span>
          <b>System Note:</b> Modifying databases (e.g. creating user, posting updates, uploading docs, filing financials) fires signals that automatically record and dispatch standard HTML/Text emails recorded below. If SMTP configurations are parsed in your `.env` settings, they will try real dispatch routing.
        </span>
      </div>

      {emails.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-gray-200">
          <Inbox className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="font-sans font-bold text-gray-700 text-sm">No recorded emails</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto font-sans leading-relaxed">Modify database records via the admin or managers hubs to witness dynamic email streams.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-auto lg:h-[600px] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          
          {/* List panel - Left 5 cols */}
          <div className="col-span-1 lg:col-span-5 border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col h-[280px] lg:h-full bg-gray-50/50">
            <div className="p-4 border-b border-gray-100 bg-white">
              <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">Outbox Stream ({emails.length})</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`p-4 cursor-pointer text-left transition duration-150 ${
                    selectedEmail?.id === email.id 
                      ? 'bg-amber-50/30 border-l-4 border-[#1B4332]' 
                      : 'hover:bg-gray-100/30'
                  }`}
                >
                  <div className="flex justify-between items-center gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[9px] font-mono font-bold bg-stone-100 text-stone-600 border px-2 py-0.5 rounded-full uppercase truncate">
                        {email.category || 'Notification'}
                      </span>
                      {email.deliveryStatus === 'delivered' && (
                        <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide flex items-center gap-0.5">
                          <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></span>
                          real
                        </span>
                      )}
                      {email.deliveryStatus === 'failed' && (
                        <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 uppercase tracking-wide flex items-center gap-0.5">
                          <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse"></span>
                          failed
                        </span>
                      )}
                      {(email.deliveryStatus === 'simulated' || !email.deliveryStatus) && (
                        <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-200 uppercase tracking-wide">
                          sim
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-gray-400 font-mono shrink-0">
                      {new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-gray-800 truncate mb-1">{email.subject}</h4>
                  <p className="text-[10.5px] text-gray-500 font-medium truncate font-sans">To: {email.to}</p>
                  <div className="flex items-center gap-1 mt-1 text-[10px]">
                    {email.isRead ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold font-sans">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span>Read {email.readAt ? `(${new Date(email.readAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})` : ''}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-gray-400 font-sans">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span>Unread</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Render Panel - Right 7 cols */}
          <div className="col-span-1 lg:col-span-7 flex flex-col h-[320px] lg:h-full">
            {selectedEmail ? (
              <div className="flex flex-col h-full bg-white divide-y divide-gray-100">
                {/* Email headers */}
                <div className="p-6 space-y-3.5 bg-gray-50/30">
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Send className="h-4.5 w-4.5 text-emerald-600" />
                      <span className="text-xs font-mono text-gray-400">SMTP Header Envelope</span>
                    </div>
                    
                    {/* Delivery Status Badge */}
                    {selectedEmail.deliveryStatus === 'delivered' ? (
                      <span className="text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Delivered
                      </span>
                    ) : selectedEmail.deliveryStatus === 'failed' ? (
                      <span className="text-[10px] font-bold font-mono bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-red-600" />
                        Delivery Failed
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold font-mono bg-gray-50 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <HelpCircle className="h-3 w-3 text-gray-400" />
                        Simulated Outbox
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <h2 className="text-sm font-bold text-gray-800">{selectedEmail.subject}</h2>
                    <div className="mt-2 text-xs font-mono text-gray-600 space-y-1">
                      <div><b>Recipient:</b> {selectedEmail.to}</div>
                      <div><b>Timestamp:</b> {new Date(selectedEmail.sentAt).toLocaleString()}</div>
                      <div>
                        <b>Read Status:</b>{' '}
                        {selectedEmail.isRead ? (
                          <span className="text-emerald-600 font-bold font-sans inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Read at {new Date(selectedEmail.readAt!).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-sans inline-flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-gray-300" />
                            Unread (Awaiting investor review)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Failure detailed banner */}
                  {selectedEmail.deliveryStatus === 'failed' && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left space-y-2">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="text-xs font-extrabold text-red-800 uppercase tracking-wider font-sans">Email Dispatch Error Details</h4>
                          <p className="text-[10.5px] text-red-700 leading-normal font-mono break-all bg-white border border-red-100 p-2.5 rounded-lg">{selectedEmail.deliveryError}</p>
                        </div>
                      </div>
                      
                      <div className="text-[10.5px] text-gray-600 leading-relaxed font-sans pt-1 border-t border-red-100 pl-6 space-y-1.5">
                        <strong className="text-red-800">💡 Dynamic Integration Troubleshooting Guide:</strong>
                        <ul className="list-disc pl-4 space-y-1 text-[10px]">
                          <li>
                            <strong>Cloud Sandboxing SMTP Port Block:</strong> Real-world cloud host providers (like Google Cloud Run) **block outgoing TCP traffic on ports 25, 465, and 587** by default to protect networks from spam. Standard custom SMTP will therefore time out or fail.
                          </li>
                          <li>
                            <strong>Highly Recommended Solution:</strong> Change your configuration in <strong>Settings → Service Settings</strong> to use <strong>Brevo SMTP Third-Party API</strong>. Brevo communicates securely over standard HTTPS (port 443), which is fully allowed and supported in this environment!
                          </li>
                          <li>
                            <strong>Brevo Sender Email verification:</strong> If using Brevo, make sure your <strong>Brevo Sender Email</strong> corresponds to a verified sender or verified domain in your active Brevo dashboard settings.
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Success banner */}
                  {selectedEmail.deliveryStatus === 'delivered' && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-left">
                      <div className="flex items-center gap-2 text-[10.5px] text-emerald-800 font-medium font-sans">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Real dispatch completed successfully through your configured active provider channel!</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Simulated email client container */}
                <div className="flex-1 p-8 overflow-y-auto bg-stone-100/10">
                  <div className="bg-white p-6 rounded-xl border border-gray-200/60 shadow-sm max-w-xl mx-auto text-left">
                    <div 
                      className="email-body-pane prose prose-sm text-xs text-gray-700 leading-relaxed max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody || selectedEmail.body }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-xs font-mono">
                Select an email from the simulated outbox stack to review formatting.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
