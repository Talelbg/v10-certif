import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { MembershipDashboard } from './components/MembershipDashboard';
import { UserTable } from './components/UserTable';
import { CsvUploader } from './components/CsvUploader';
import { Invoicing } from './components/Invoicing';
import { EventManagement } from './components/EventManagement';
import { SmartOutreach } from './components/SmartOutreach';
import { AdminSettings } from './components/AdminSettings';
import { Reporting } from './components/Reporting';
import { 
  DeveloperRecord, 
  DatasetVersion, 
  AdminUser, 
  Invoice, 
  CommunityAgreement, 
  CommunityEvent, 
  OutreachCampaign, 
  CommunityMasterRecord 
} from './types';
import { MOCK_ADMIN_TEAM } from './constants';
import { Database, ChevronDown, Layers, Sun, Moon, CheckCircle } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [versions, setVersions] = useState<DatasetVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [viewParams, setViewParams] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // --- GLOBAL PERSISTENT STATE ---
  const [admins, setAdmins] = useState<AdminUser[]>(MOCK_ADMIN_TEAM);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [agreements, setAgreements] = useState<CommunityAgreement[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [masterRegistry, setMasterRegistry] = useState<CommunityMasterRecord[]>([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const developerData = useMemo(() => {
      if (!activeVersionId) return [];
      return versions.find(v => v.id === activeVersionId)?.data || [];
  }, [versions, activeVersionId]);

  const activeVersionName = useMemo(() => {
      if (!activeVersionId) return '';
      return versions.find(v => v.id === activeVersionId)?.fileName || 'Unknown Version';
  }, [versions, activeVersionId]);

  const handleDataLoaded = (newData: DeveloperRecord[], fileName: string) => {
    const newVersion: DatasetVersion = { id: `ver_${Date.now()}`, fileName, uploadDate: new Date().toISOString(), recordCount: newData.length, data: newData };
    setVersions(prev => [newVersion, ...prev]);
    setActiveVersionId(newVersion.id);
  };

  const handleSwitchVersion = (id: string) => setActiveVersionId(id);
  const handleDeleteVersion = (id: string) => {
      const newVersions = versions.filter(v => v.id !== id);
      setVersions(newVersions);
      if (activeVersionId === id) setActiveVersionId(newVersions.length > 0 ? newVersions[0].id : null);
  };

  const handleNavigate = (view: string, params?: any) => { setViewParams(params || null); setCurrentView(view); };
  const handleSidebarNavigate = (view: string) => { setViewParams(null); setCurrentView(view); };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return (
          <div className="space-y-6">
            <Dashboard data={developerData} onNavigate={handleNavigate} />
            {developerData.length === 0 && (
                 <div className="mt-8 fade-in-up p-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-[#141319]/50">
                     <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-lg text-center">Initial Blockchain Sync Required</h3>
                     <div className="max-w-2xl mx-auto">
                        <CsvUploader onDataLoaded={handleDataLoaded} versions={versions} activeVersionId={activeVersionId || undefined} onVersionSelect={handleSwitchVersion} onDeleteVersion={handleDeleteVersion} />
                     </div>
                 </div>
            )}
          </div>
        );
      case 'membership': return <MembershipDashboard data={developerData} onBack={viewParams ? () => handleSidebarNavigate('dashboard') : undefined} />;
      case 'developers': return (
          <div className="space-y-6">
            <CsvUploader onDataLoaded={handleDataLoaded} versions={versions} activeVersionId={activeVersionId || undefined} onVersionSelect={handleSwitchVersion} onDeleteVersion={handleDeleteVersion} />
            {developerData.length > 0 && <UserTable data={developerData} initialFilters={viewParams} onBack={viewParams ? () => handleSidebarNavigate('dashboard') : undefined} />}
          </div>
        );
      case 'outreach': return <SmartOutreach data={developerData} campaigns={campaigns} setCampaigns={setCampaigns} />;
      case 'invoices': return (
        <Invoicing 
          data={developerData} 
          admins={admins} 
          invoices={invoices} 
          setInvoices={setInvoices}
          agreements={agreements}
          setAgreements={setAgreements}
        />
      );
      case 'reporting': return <Reporting data={developerData} />;
      case 'events': return <EventManagement data={developerData} events={events} setEvents={setEvents} />;
      case 'admin': return (
        <AdminSettings 
          data={developerData} 
          admins={admins} 
          setAdmins={setAdmins}
          masterRegistry={masterRegistry}
          setMasterRegistry={setMasterRegistry}
        />
      );
      default: return <div className="p-10 text-center text-slate-400">Module under construction</div>;
    }
  };

  return (
    <div className="flex bg-slate-50 dark:bg-[#141319] min-h-screen font-sans text-slate-900 dark:text-slate-200 selection:bg-[#2a00ff] selection:text-white transition-colors duration-300">
      <Sidebar currentView={currentView} setCurrentView={handleSidebarNavigate} />
      
      <main className="flex-1 h-screen overflow-y-auto relative">
        {/* Ambient Background Glow (Dark Mode Only) */}
        <div className="hidden dark:block fixed top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#791cf5]/10 blur-[120px] pointer-events-none rounded-full"></div>
        <div className="hidden dark:block fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#2a00ff]/10 blur-[120px] pointer-events-none rounded-full"></div>

        {/* Header */}
        <header className="bg-white/80 dark:bg-[#141319]/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 h-20 px-8 sticky top-0 z-40 flex items-center justify-between shadow-sm dark:shadow-2xl print:hidden transition-all">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[#2a00ff]/10 border border-[#2a00ff]/30 rounded-lg text-[#2a00ff] shadow-[0_0_10px_rgba(42,0,255,0.2)]"><Layers className="w-5 h-5" /></div>
             <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-[#a522dd] uppercase tracking-widest">Hedera Certification Dashboard</span>
                 <span className="text-base font-bold text-slate-900 dark:text-white capitalize">{currentView.replace('-', ' ')}</span>
             </div>
          </div>

          <div className="flex items-center gap-6">
             {versions.length > 0 && (
                 <div className="hidden md:block relative group">
                     <button className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-[#141319] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-[#2a00ff]/50 hover:shadow-[0_0_15px_rgba(42,0,255,0.2)] transition-all">
                        <Database className="w-4 h-4 text-[#2a00ff]" />
                        <span className="max-w-[150px] truncate">{activeVersionName}</span>
                        <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-[#2a00ff] transition-colors" />
                     </button>
                     <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-[#141319] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                         <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Select Dataset Version</div>
                         <div className="max-h-64 overflow-y-auto p-1">
                             {versions.map(v => (
                                 <button key={v.id} onClick={() => handleSwitchVersion(v.id)} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between rounded-xl mb-1 transition-colors ${v.id === activeVersionId ? 'bg-[#2a00ff]/10 text-[#2a00ff] font-semibold border border-[#2a00ff]/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}>
                                     <span>{v.fileName}</span>
                                     {v.id === activeVersionId && <CheckCircle className="w-4 h-4 text-[#2a00ff]" />}
                                 </button>
                             ))}
                         </div>
                     </div>
                 </div>
             )}

             <div className="flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-white/10">
                 <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                     {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                 </button>
                 <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#2a00ff] to-[#a522dd] flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-[#2a00ff]/20 cursor-pointer hover:scale-105 transition-transform">
                     SA
                 </div>
             </div>
          </div>
        </header>

        <div className="p-8">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;