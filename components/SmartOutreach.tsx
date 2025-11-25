import React, { useMemo, useState } from 'react';
import { DeveloperRecord, EmailTemplate, OutreachCampaign } from '../types';
import { DEFAULT_TEMPLATES, sendEmailCampaign } from '../services/emailService';
import { Filter, Users, Mail, Send, CheckCircle, Loader2, Edit2, AlertCircle, Download, History } from 'lucide-react';

interface SmartOutreachProps {
  data: DeveloperRecord[];
  campaigns: OutreachCampaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<OutreachCampaign[]>>;
}

export const SmartOutreach: React.FC<SmartOutreachProps> = ({ data, campaigns, setCampaigns }) => {
  // Filter State
  const [filterCommunity, setFilterCommunity] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCountry, setFilterCountry] = useState('All');
  
  // Campaign State
  const [selectedTemplateId, setSelectedTemplateId] = useState(DEFAULT_TEMPLATES[0].id);
  const [customSubject, setCustomSubject] = useState(DEFAULT_TEMPLATES[0].subject);
  const [customBody, setCustomBody] = useState(DEFAULT_TEMPLATES[0].body);
  const [isEditing, setIsEditing] = useState(false);
  
  // Sending State
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  // --- 1. Computed Filters ---
  const communities = useMemo(() => {
      const unique = new Set(data.map(d => d.partnerCode).filter(c => c && c !== 'UNKNOWN'));
      return ['All', ...Array.from(unique).sort()];
  }, [data]);

  const countries = useMemo(() => {
      const unique = new Set(data.map(d => d.country).filter(c => c && c !== 'Unknown'));
      return ['All', ...Array.from(unique).sort()];
  }, [data]);

  const filteredAudience = useMemo(() => {
      return data.filter(user => {
          // Community Filter
          if (filterCommunity !== 'All' && user.partnerCode !== filterCommunity) return false;
          
          // Country Filter
          if (filterCountry !== 'All' && user.country !== filterCountry) return false;

          // Status Filter
          if (filterStatus === 'Not Started') {
              if (user.percentageCompleted > 0 || user.finalGrade === 'Pass') return false;
          } else if (filterStatus === 'In Progress') {
              if (user.percentageCompleted === 0 || user.finalGrade === 'Pass') return false;
          } else if (filterStatus === 'Certified') {
              if (user.finalGrade !== 'Pass') return false;
          }

          return true;
      });
  }, [data, filterCommunity, filterStatus, filterCountry]);

  // --- 2. Template Logic ---
  const handleTemplateChange = (id: string) => {
      const tpl = DEFAULT_TEMPLATES.find(t => t.id === id);
      if (tpl) {
          setSelectedTemplateId(id);
          setCustomSubject(tpl.subject);
          setCustomBody(tpl.body);
          setIsEditing(false);
      }
  };

  // --- 3. Download Logic ---
  const handleDownloadAudience = () => {
    if (filteredAudience.length === 0) return;

    const headers = ['Email', 'First Name', 'Last Name', 'Partner Code', 'Country', 'Progress (%)', 'Status'];
    const rows = filteredAudience.map(user => [
        user.email,
        user.firstName,
        user.lastName,
        user.partnerCode,
        user.country,
        user.percentageCompleted,
        user.finalGrade
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audience_segment_${filterCommunity.toLowerCase()}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 4. Sending Logic ---
  const handleSendCampaign = async () => {
      if (filteredAudience.length === 0) return;
      
      setIsSending(true);
      setSendProgress(0);

      const currentTemplate: EmailTemplate = {
          id: selectedTemplateId,
          name: 'Custom Campaign',
          subject: customSubject,
          body: customBody,
          trigger: 'Manual'
      };

      await sendEmailCampaign(filteredAudience, currentTemplate, (sent) => {
          setSendProgress(sent);
      });

      const newCampaign: OutreachCampaign = {
          id: `cmp_${Date.now()}`,
          name: `${currentTemplate.subject}`,
          audienceSize: filteredAudience.length,
          sentCount: filteredAudience.length,
          status: 'Completed',
          sentAt: new Date().toISOString(),
          templateId: selectedTemplateId
      };

      setCampaigns([newCampaign, ...campaigns]);
      setIsSending(false);
  };

  if (data.length === 0) {
      return (
          <div className="p-12 text-center bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
              <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-400 mb-4">
                  <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Smart Outreach Unavailable</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Please upload the Developer CSV in the Dashboard to start segmenting your audience.</p>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Smart Outreach & Automation</h1>
        <p className="text-slate-500 dark:text-slate-400">Segment your audience and launch automated email campaigns using the Mailer API.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SECTION 1: AUDIENCE FILTER */}
        <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-fit">
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Filter className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white">1. Define Audience</h3>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">Community</label>
                    <select 
                        value={filterCommunity}
                        onChange={(e) => setFilterCommunity(e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                    >
                        <option value="All">All Communities</option>
                        {communities.filter(c => c !== 'All').map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">Progress Status</label>
                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                    >
                        <option value="All">All Users</option>
                        <option value="Not Started">Not Started (0%)</option>
                        <option value="In Progress">In Progress (1-99%)</option>
                        <option value="Certified">Certified (Pass)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">Region / Country</label>
                    <select 
                        value={filterCountry}
                        onChange={(e) => setFilterCountry(e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                    >
                        <option value="All">Global</option>
                        {countries.filter(c => c !== 'All').map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mt-8 p-4 bg-slate-900 dark:bg-black rounded-xl text-white flex items-center justify-between border border-slate-800 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-400" />
                    <div>
                        <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Target Audience</div>
                        <div className="text-2xl font-bold">{filteredAudience.length.toLocaleString()}</div>
                    </div>
                </div>
                {filteredAudience.length === 0 && (
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                )}
            </div>
            
            {/* Download CSV Button */}
             <button 
                onClick={handleDownloadAudience}
                disabled={filteredAudience.length === 0}
                className="mt-3 w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Download className="w-4 h-4" />
                Download List (.CSV)
            </button>

            {filteredAudience.length === 0 && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 font-medium text-center">No users match these filters.</p>
            )}
        </div>

        {/* SECTION 2: EMAIL COMPOSER */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                          <Mail className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-800 dark:text-white">2. Compose Message</h3>
                  </div>
                  <select 
                      className="text-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white border outline-none"
                      value={selectedTemplateId}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                  >
                      {DEFAULT_TEMPLATES.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                  </select>
              </div>

              <div className="space-y-4">
                  <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">Subject Line</label>
                      <input 
                          type="text" 
                          value={customSubject}
                          onChange={(e) => { setCustomSubject(e.target.value); setIsEditing(true); }}
                          className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                  </div>

                  <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">Email Body</label>
                      <div className="relative">
                          <textarea 
                              rows={8}
                              value={customBody}
                              onChange={(e) => { setCustomBody(e.target.value); setIsEditing(true); }}
                              className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                          />
                          <div className="absolute bottom-3 right-3 flex gap-2">
                              {['{{firstName}}', '{{partnerCode}}', '{{percentage}}'].map(tag => (
                                  <button 
                                      key={tag}
                                      onClick={() => setCustomBody(prev => prev + ' ' + tag)}
                                      className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                                  >
                                      {tag}
                                  </button>
                              ))}
                          </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                          Supported variables: <span className="font-mono text-slate-500 dark:text-slate-400">{`{{firstName}}`}</span>, <span className="font-mono text-slate-500 dark:text-slate-400">{`{{partnerCode}}`}</span>, <span className="font-mono text-slate-500 dark:text-slate-400">{`{{percentage}}`}</span>
                      </p>
                  </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      {isEditing ? <Edit2 className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                      {isEditing ? 'Customizing template...' : 'Ready to send'}
                  </div>

                  <button 
                      onClick={handleSendCampaign}
                      disabled={filteredAudience.length === 0 || isSending}
                      className={`px-8 py-3 rounded-lg font-bold text-white flex items-center gap-2 transition-all shadow-md ${
                          isSending 
                          ? 'bg-slate-400 cursor-not-allowed' 
                          : filteredAudience.length === 0 
                              ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
                              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-lg hover:scale-105 active:scale-95'
                      }`}
                  >
                      {isSending ? (
                          <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Sending ({Math.round((sendProgress / filteredAudience.length) * 100)}%)...
                          </>
                      ) : (
                          <>
                              <Send className="w-5 h-5" />
                              Send Campaign
                          </>
                      )}
                  </button>
              </div>
          </div>

          {/* Campaign History */}
          {campaigns.length > 0 && (
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <History className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-slate-800 dark:text-white">Recent Campaigns</h3>
                </div>
                <div className="space-y-3">
                    {campaigns.map(cmp => (
                        <div key={cmp.id} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-white/5 flex justify-between items-center">
                            <div>
                                <div className="font-bold text-sm text-slate-700 dark:text-slate-300">{cmp.name}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(cmp.sentAt).toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase">Sent</div>
                                <div className="text-sm font-mono text-slate-600 dark:text-slate-400">{cmp.sentCount.toLocaleString()} recipients</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};