import React from 'react';
import { LayoutDashboard, FileText, Users, Calendar, Settings, ShieldAlert, Send, Crown, BarChart } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'membership', label: 'Membership', icon: Crown },
    { id: 'developers', label: 'Developers & Fraud', icon: Users },
    { id: 'outreach', label: 'Smart Outreach', icon: Send },
    { id: 'invoices', label: 'Finance & Invoices', icon: FileText },
    { id: 'reporting', label: 'Reporting & AI', icon: BarChart },
    { id: 'events', label: 'Event Management', icon: Calendar },
    { id: 'admin', label: 'Admin Settings', icon: ShieldAlert },
  ];

  return (
    <div className="w-20 lg:w-72 bg-[#141319] border-r border-white/5 flex flex-col min-h-screen z-50 shadow-2xl relative overflow-hidden">
      {/* Background Glow Effect */}
      <div className="absolute top-0 left-0 w-full h-96 bg-[#2a00ff]/10 blur-[100px] pointer-events-none"></div>

      {/* Brand Header */}
      <div className="h-28 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/5 relative z-10">
        <div className="relative group cursor-pointer flex items-center gap-3">
            {/* Dar Blockchain Logo Shape */}
            <svg width="40" height="40" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <path d="M10 25H0V45C0 47.7614 2.23858 50 5 50H15V25C15 19.4772 19.4772 15 25 15C30.5228 15 35 19.4772 35 25V50H45C47.7614 50 50 47.7614 50 45V25C50 11.1929 38.8071 0 25 0H15V10C15 12.7614 12.7614 15 10 15V25Z" fill="#2a00ff"/>
            </svg>
            <div className="hidden lg:block">
                <h1 className="font-extrabold text-xl leading-none text-white tracking-tight">Dar <br/>Blockchain<span className="align-top text-[8px] text-slate-500 ml-0.5">TM</span></h1>
            </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-8 space-y-2 px-4 relative z-10">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 relative group overflow-hidden ${
                isActive 
                  ? 'text-white shadow-[0_0_20px_rgba(42,0,255,0.25)]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-[#2a00ff] to-[#791cf5] opacity-20 border-l-2 border-[#2a00ff]"></div>
              )}
              
              <item.icon className={`w-5 h-5 transition-all duration-300 relative z-10 ${isActive ? 'text-[#2a00ff] drop-shadow-[0_0_8px_rgba(42,0,255,0.8)]' : 'group-hover:scale-110'}`} />
              <span className={`ml-3 text-sm font-medium tracking-wide hidden lg:block relative z-10 ${isActive ? 'text-white font-bold' : ''}`}>{item.label}</span>
              
              {/* Mobile Tooltip */}
              <span className="absolute left-full ml-4 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 lg:hidden whitespace-nowrap z-50 pointer-events-none shadow-xl border border-slate-700">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-6 border-t border-white/5 bg-[#141319] relative z-10">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2a00ff] to-[#791cf5] flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-[#2a00ff]/30">
            SA
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-bold text-white group-hover:text-[#a522dd] transition-colors">Super Admin</p>
            <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Global HQ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};