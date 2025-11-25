import React, { useState, useMemo, useRef } from 'react';
import { AdminUser, CommunityMasterRecord, DeveloperRecord, UserRole } from '../types';
import { Users, Shield, Map, Upload, Search, Trash2, CheckCircle, AlertCircle, Plus, Save, FileSpreadsheet, X, Link, ChevronDown } from 'lucide-react';

interface AdminSettingsProps {
  data: DeveloperRecord[];
  admins: AdminUser[];
  setAdmins: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  masterRegistry: CommunityMasterRecord[];
  setMasterRegistry: React.Dispatch<React.SetStateAction<CommunityMasterRecord[]>>;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ data, admins, setAdmins, masterRegistry, setMasterRegistry }) => {
  const [activeTab, setActiveTab] = useState<'team' | 'registry'>('team');
  
  // --- TEAM MANAGEMENT STATE ---
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState<{name: string, email: string, role: UserRole, codes: string[]}>({
      name: '', email: '', role: UserRole.COMMUNITY_ADMIN, codes: []
  });
  const [partnerSearch, setPartnerSearch] = useState('');

  // --- REGISTRY STATE ---
  const registryInputRef = useRef<HTMLInputElement>(null);

  // --- DERIVED DATA ---
  const activePartners = useMemo(() => {
      const set = new Set(data.map(d => d.partnerCode).filter(c => c && c !== 'UNKNOWN'));
      return Array.from(set).sort();
  }, [data]);

  const filteredPartners = useMemo(() => {
      if (!partnerSearch) return activePartners;
      return activePartners.filter(p => p.toLowerCase().includes(partnerSearch.toLowerCase()));
  }, [activePartners, partnerSearch]);

  // --- TEAM LOGIC ---
  const handleAddUser = () => {
      if (!newUser.name || !newUser.email) return;
      
      const newAdmin: AdminUser = {
          id: `adm_${Date.now()}`,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          assignedCodes: newUser.role === UserRole.SUPER_ADMIN ? [] : newUser.codes,
          lastLogin: 'Never',
          status: 'Invited'
      };

      setAdmins([...admins, newAdmin]);
      setShowAddUser(false);
      setNewUser({ name: '', email: '', role: UserRole.COMMUNITY_ADMIN, codes: [] });
      setPartnerSearch('');
  };

  const handleDeleteUser = (id: string) => {
      setAdmins(admins.filter(a => a.id !== id));
  };

  const toggleCodeSelection = (code: string) => {
      if (newUser.role === UserRole.COMMUNITY_ADMIN) {
          // Local Admin can only have one code
          setNewUser({ ...newUser, codes: [code] });
      } else {
          // Regional can have multiple
          const exists = newUser.codes.includes(code);
          if (exists) {
              setNewUser({ ...newUser, codes: newUser.codes.filter(c => c !== code) });
          } else {
              setNewUser({ ...newUser, codes: [...newUser.codes, code] });
          }
      }
  };

  // --- REGISTRY LOGIC ---
  // COMPARISON LOGIC: Master vs Active
  const registryStats = useMemo(() => {
      if (masterRegistry.length === 0) return null;

      const masterSet = new Set(masterRegistry.map(r => r.code));
      
      // 1. Healthy: In Master AND Active
      const healthy = masterRegistry.filter(r => activePartners.includes(r.code));
      
      // 2. Inactive: In Master BUT NOT Active (0 developers)
      const inactive = masterRegistry.filter(r => !activePartners.includes(r.code));

      // 3. Rogue/Unrecognized: Active BUT NOT in Master
      const rogue = activePartners.filter(c => !masterSet.has(c));

      return { healthy, inactive, rogue };
  }, [masterRegistry, activePartners]);

  const handleRegistryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          if (!text) return;

          const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
          const records: CommunityMasterRecord[] = [];
          
          const startIndex = lines[0].toLowerCase().includes('code') ? 1 : 0;

          for (let i = startIndex; i < lines.length; i++) {
              const cols = lines[i].split(/,|;/).map(c => c.trim().replace(/"/g, ''));
              if (cols.length >= 1) {
                  records.push({
                      code: cols[0],
                      name: cols[1] || cols[0],
                      region: cols[2] || 'Global',
                      managerEmail: cols[3]
                  });
              }
          }
          setMasterRegistry(records);
      };
      reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin & Settings</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your team hierarchy and official community registry.</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200 dark:border-white/10">
          <button 
            onClick={() => setActiveTab('team')}
            className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'team' ? 'border-[#2a00ff] text-[#2a00ff]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
          >
              Team Management
          </button>
          <button 
            onClick={() => setActiveTab('registry')}
            className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'registry' ? 'border-[#2a00ff] text-[#2a00ff]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
          >
              Community Registry (Active vs Official)
          </button>
      </div>

      {/* TAB 1: TEAM MANAGEMENT */}
      {activeTab === 'team' && (
          <div className="animate-fade-in space-y-6">
              <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                      <h3 className="font-bold text-slate-800 dark:text-white">Authorized Administrators</h3>
                      <button 
                        onClick={() => setShowAddUser(true)}
                        className="px-4 py-2 bg-[#2a00ff] text-white rounded-lg text-sm font-medium hover:bg-[#2a00ff]/80 flex items-center gap-2 shadow-lg shadow-[#2a00ff]/20"
                      >
                          <Plus className="w-4 h-4" /> Invite New Admin
                      </button>
                  </div>

                  {/* ADD USER FORM */}
                  {showAddUser && (
                      <div className="p-6 bg-blue-50 dark:bg-[#2a00ff]/10 border-b border-blue-100 dark:border-[#2a00ff]/20">
                          <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-4">Invite New Team Member</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                              <div>
                                  <label className="block text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Full Name</label>
                                  <input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full p-2.5 border border-blue-200 dark:border-blue-800 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="John Doe" />
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Email Address</label>
                                  <input value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full p-2.5 border border-blue-200 dark:border-blue-800 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="john@example.com" />
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Role</label>
                                  <select 
                                    value={newUser.role} 
                                    onChange={e => setNewUser({...newUser, role: e.target.value as UserRole, codes: []})}
                                    className="w-full p-2.5 border border-blue-200 dark:border-blue-800 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                      <option value={UserRole.SUPER_ADMIN}>{UserRole.SUPER_ADMIN}</option>
                                      <option value={UserRole.REGIONAL_ADMIN}>{UserRole.REGIONAL_ADMIN}</option>
                                      <option value={UserRole.COMMUNITY_ADMIN}>{UserRole.COMMUNITY_ADMIN}</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                                      {newUser.role === UserRole.SUPER_ADMIN ? 'Access Level' : 'Partner Assignment'}
                                  </label>
                                  {newUser.role === UserRole.SUPER_ADMIN ? (
                                      <div className="w-full p-2.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded-lg text-sm font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-2">
                                          <Shield className="w-4 h-4" /> Global Access
                                      </div>
                                  ) : (
                                      <div className="relative">
                                          {/* Search Input for Partners */}
                                          <div className="relative mb-1">
                                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-400" />
                                              <input 
                                                  type="text"
                                                  value={partnerSearch}
                                                  onChange={e => setPartnerSearch(e.target.value)}
                                                  placeholder="Search partners..."
                                                  className="w-full pl-7 p-1.5 text-xs border border-blue-200 dark:border-blue-800 rounded-t-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                                              />
                                          </div>
                                          <div className="w-full p-2.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-b-lg text-sm text-slate-900 dark:text-white max-h-40 overflow-y-auto grid grid-cols-1 gap-1">
                                              {activePartners.length === 0 && <span className="text-slate-400 italic text-xs">No active partners found.</span>}
                                              {filteredPartners.length === 0 && activePartners.length > 0 && <span className="text-slate-400 italic text-xs">No matches found.</span>}
                                              {filteredPartners.map(partner => (
                                                  <label key={partner} className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1 rounded">
                                                      <input 
                                                          type={newUser.role === UserRole.COMMUNITY_ADMIN ? 'radio' : 'checkbox'}
                                                          checked={newUser.codes.includes(partner)}
                                                          onChange={() => toggleCodeSelection(partner)}
                                                          className="rounded text-blue-600 focus:ring-blue-500" 
                                                      />
                                                      <span className="text-xs font-medium">{partner}</span>
                                                  </label>
                                              ))}
                                          </div>
                                          <p className="text-[10px] text-blue-600 dark:text-blue-300 mt-1">
                                              {newUser.role === UserRole.COMMUNITY_ADMIN ? 'Select single partner.' : 'Select multiple regions.'}
                                          </p>
                                      </div>
                                  )}
                              </div>
                          </div>
                          <div className="flex justify-end gap-3">
                              <button onClick={() => setShowAddUser(false)} className="px-3 py-1.5 text-slate-500 hover:text-slate-700 text-sm">Cancel</button>
                              <button onClick={handleAddUser} className="px-4 py-1.5 bg-[#2a00ff] text-white rounded text-sm font-bold shadow-sm hover:bg-[#2a00ff]/80">Send Invitation</button>
                          </div>
                      </div>
                  )}

                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-50 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                          <tr>
                              <th className="px-6 py-3">Admin User</th>
                              <th className="px-6 py-3">Role</th>
                              <th className="px-6 py-3">Assigned Partner Scope</th>
                              <th className="px-6 py-3">Status</th>
                              <th className="px-6 py-3 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {admins.map(admin => (
                              <tr key={admin.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                  <td className="px-6 py-4">
                                      <div className="font-medium text-slate-900 dark:text-white">{admin.name}</div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400">{admin.email}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                          admin.role === UserRole.SUPER_ADMIN ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' :
                                          admin.role === UserRole.REGIONAL_ADMIN ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                                          'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                                      }`}>
                                          {admin.role === UserRole.SUPER_ADMIN ? 'Super Admin' : 
                                           admin.role === UserRole.REGIONAL_ADMIN ? 'Regional' : 'Partner Admin'}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4">
                                      {admin.role === UserRole.SUPER_ADMIN ? (
                                          <span className="text-slate-400 italic flex items-center gap-1"><Shield className="w-3 h-3" /> Global Access</span>
                                      ) : (
                                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                                              {admin.assignedCodes.length === 0 && <span className="text-red-400 text-xs">Unassigned</span>}
                                              {admin.assignedCodes.map((c, i) => (
                                                  <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                      {c}
                                                  </span>
                                              ))}
                                          </div>
                                      )}
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`flex items-center gap-1.5 text-xs font-medium ${admin.status === 'Active' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${admin.status === 'Active' ? 'bg-green-600 dark:bg-green-400' : 'bg-orange-600 dark:bg-orange-400'}`}></span>
                                          {admin.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <button onClick={() => handleDeleteUser(admin.id)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* TAB 2: REGISTRY MANAGEMENT */}
      {activeTab === 'registry' && (
          <div className="animate-fade-in space-y-8">
              
              {/* UPLOADER */}
              <div className="glass-panel p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-start justify-between">
                      <div>
                          <h3 className="font-bold text-slate-900 dark:text-white">Upload Official Community Registry</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                              Import a CSV containing the master list of valid codes (Columns: Code, Name, Region).
                              <br/>This allows the system to detect unauthorized "Rogue" codes in the developer data.
                          </p>
                      </div>
                      <div className="flex gap-3">
                         <button 
                            onClick={() => registryInputRef.current?.click()}
                            className="px-4 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 flex items-center gap-2 text-sm shadow-lg shadow-white/10"
                         >
                             <Upload className="w-4 h-4" /> Import Registry CSV
                         </button>
                         <input type="file" ref={registryInputRef} className="hidden" onChange={handleRegistryUpload} accept=".csv" />
                      </div>
                  </div>
                  
                  {masterRegistry.length > 0 && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg inline-flex items-center gap-2 text-green-800 dark:text-green-300 text-sm font-medium">
                          <CheckCircle className="w-4 h-4" /> Loaded {masterRegistry.length} official codes from master list.
                      </div>
                  )}
              </div>

              {/* COMPARISON DASHBOARD */}
              {masterRegistry.length > 0 && registryStats && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* COL 1: HEALTHY */}
                      <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-green-200 dark:border-green-800 shadow-sm overflow-hidden">
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800 flex justify-between items-center">
                              <h4 className="font-bold text-green-900 dark:text-green-200">Active & Verified</h4>
                              <span className="bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs font-bold px-2 py-1 rounded-full">
                                  {registryStats.healthy.length}
                              </span>
                          </div>
                          <div className="p-0 max-h-60 overflow-y-auto">
                              {registryStats.healthy.map(r => (
                                  <div key={r.code} className="px-4 py-2 border-b border-slate-50 dark:border-slate-800 text-sm flex justify-between">
                                      <span className="font-medium text-slate-700 dark:text-slate-300">{r.name}</span>
                                      <span className="font-mono text-xs text-slate-400">{r.code}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                       {/* COL 2: INACTIVE */}
                       <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                          <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                              <h4 className="font-bold text-slate-700 dark:text-slate-300">Inactive (0 Devs)</h4>
                              <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded-full">
                                  {registryStats.inactive.length}
                              </span>
                          </div>
                          <div className="p-0 max-h-60 overflow-y-auto">
                              {registryStats.inactive.map(r => (
                                  <div key={r.code} className="px-4 py-2 border-b border-slate-50 dark:border-slate-800 text-sm flex justify-between">
                                      <span className="font-medium text-slate-500 dark:text-slate-400">{r.name}</span>
                                      <span className="font-mono text-xs text-slate-400">{r.code}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                      {/* COL 3: ROGUE */}
                      <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-red-200 dark:border-red-800 shadow-sm overflow-hidden">
                          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800 flex justify-between items-center">
                              <h4 className="font-bold text-red-900 dark:text-red-200">Rogue / Unverified</h4>
                              <span className="bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 text-xs font-bold px-2 py-1 rounded-full">
                                  {registryStats.rogue.length}
                              </span>
                          </div>
                          <div className="p-0 max-h-60 overflow-y-auto">
                              {registryStats.rogue.map(c => (
                                  <div key={c} className="px-4 py-2 border-b border-slate-50 dark:border-slate-800 text-sm flex justify-between items-center">
                                      <span className="font-mono text-slate-700 dark:text-slate-300">{c}</span>
                                      <AlertCircle className="w-4 h-4 text-red-500" />
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};