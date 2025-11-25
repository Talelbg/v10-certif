import React, { useState, useMemo, useEffect } from 'react';
import { DeveloperRecord } from '../types';
import { AlertTriangle, CheckCircle, Clock, Search, Download, ChevronLeft, ChevronRight, Filter, Users, PlayCircle, Timer, X, ArrowLeft, Bug } from 'lucide-react';

interface UserTableProps {
  data: DeveloperRecord[];
  initialFilters?: {
      statusFilter?: string;
      communityFilter?: string;
      searchQuery?: string;
  };
  onBack?: () => void;
}

const ITEMS_PER_PAGE = 50;
type DetailedStatus = 'All' | 'Certified' | 'Not Started' | 'Just Started' | 'In Progress' | 'Course Complete (No Cert)' | 'Flagged' | 'Data Error';

export const UserTable: React.FC<UserTableProps> = ({ data, initialFilters, onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DetailedStatus>('All');
  const [communityFilter, setCommunityFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
      if (initialFilters) {
          if (initialFilters.statusFilter) setStatusFilter(initialFilters.statusFilter as DetailedStatus);
          if (initialFilters.communityFilter) setCommunityFilter(initialFilters.communityFilter);
          if (initialFilters.searchQuery) setSearchQuery(initialFilters.searchQuery);
      }
  }, [initialFilters]);

  const communities = useMemo(() => {
      const unique = new Set(data.map(d => d.partnerCode).filter(c => c && c !== 'UNKNOWN'));
      return ['All', ...Array.from(unique).sort()];
  }, [data]);

  const filteredData = useMemo(() => {
    let result = data;
    if (communityFilter !== 'All') result = result.filter(d => d.partnerCode === communityFilter);
    
    switch (statusFilter) {
        case 'Certified': result = result.filter(d => d.finalGrade === 'Pass'); break;
        case 'Not Started': result = result.filter(d => d.percentageCompleted === 0 && d.finalGrade !== 'Pass'); break;
        case 'Just Started': result = result.filter(d => d.percentageCompleted > 0 && d.percentageCompleted < 30 && d.finalGrade !== 'Pass'); break;
        case 'In Progress': result = result.filter(d => d.percentageCompleted >= 30 && d.percentageCompleted < 100 && d.finalGrade !== 'Pass'); break;
        case 'Course Complete (No Cert)': result = result.filter(d => d.percentageCompleted === 100 && d.finalGrade !== 'Pass'); break;
        case 'Flagged': result = result.filter(d => d.isSuspicious); break;
        case 'Data Error': result = result.filter(d => d.dataError); break;
    }

    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        result = result.filter(d => d.email.toLowerCase().includes(query) || d.firstName.toLowerCase().includes(query) || d.lastName.toLowerCase().includes(query) || (d.partnerCode && d.partnerCode.toLowerCase().includes(query)));
    }
    return result;
  }, [data, searchQuery, statusFilter, communityFilter]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, (currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE), [filteredData, currentPage]);

  useEffect(() => setCurrentPage(1), [searchQuery, statusFilter, communityFilter]);

  const clearFilters = () => { setSearchQuery(''); setStatusFilter('All'); setCommunityFilter('All'); };

  const handleExport = () => {
    if (filteredData.length === 0) return;
    const headers = ['ID', 'Email', 'First Name', 'Last Name', 'Partner Code', 'Country', 'Progress', 'Status', 'Score', 'Duration (Hrs)', 'Risk Flag'];
    const rows = filteredData.map(d => [d.id, d.email, d.firstName, d.lastName, d.partnerCode, d.country, `${d.percentageCompleted}%`, d.finalGrade, d.finalScore, d.durationHours?.toFixed(2) || '', d.isSuspicious ? `Suspicious: ${d.suspicionReason}` : d.dataError ? 'Data Error' : '']);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })); link.download = `export_${new Date().toISOString().slice(0,10)}.csv`; link.click();
  };

  return (
    <div className="space-y-6 fade-in-up">
      {onBack && (
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-[#2a00ff] font-medium transition-colors group mb-2">
              <div className="p-1 rounded-full group-hover:bg-slate-200 dark:group-hover:bg-white/10"><ArrowLeft className="w-4 h-4" /></div> Back to Dashboard
          </button>
      )}

      <div className="glass-panel p-5 rounded-2xl flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
          <div className="relative w-full xl:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                  type="text" 
                  placeholder="Search developers..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#2a00ff] outline-none text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm" 
              />
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
              <div className="relative flex-1 md:w-48">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select 
                      value={communityFilter} 
                      onChange={(e) => setCommunityFilter(e.target.value)} 
                      className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2a00ff] outline-none appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
                  >
                      <option value="All">All Communities</option>
                      {communities.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>
              <div className="relative flex-1 md:w-56">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select 
                      value={statusFilter} 
                      onChange={(e) => setStatusFilter(e.target.value as DetailedStatus)} 
                      className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2a00ff] outline-none appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
                  >
                      <option value="All">All Statuses</option>
                      <option value="Not Started">Not Started (0%)</option>
                      <option value="Just Started">Just Started (1-29%)</option>
                      <option value="In Progress">In Progress (30-99%)</option>
                      <option value="Certified">Certified (Pass)</option>
                      <option value="Flagged">Risk / Flagged</option>
                      <option value="Data Error">Data Errors</option>
                  </select>
              </div>
              <div className="flex items-center gap-2">
                  {(statusFilter !== 'All' || communityFilter !== 'All' || searchQuery) && (
                      <button onClick={clearFilters} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors" title="Clear"><X className="w-4 h-4" /></button>
                  )}
                  <button onClick={handleExport} disabled={filteredData.length === 0} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#a522dd] text-white rounded-xl hover:bg-[#791cf5] transition-all text-sm font-bold shadow-lg shadow-[#a522dd]/20 disabled:opacity-50 disabled:shadow-none">
                      <Download className="w-4 h-4" /> Export
                  </button>
              </div>
          </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-[#141319]/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-white/5">
              <tr>
                <th className="px-6 py-4">Developer</th>
                <th className="px-6 py-4">Community</th>
                <th className="px-6 py-4">Progress</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Risk Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {paginatedData.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-white group-hover:text-[#2a00ff] transition-colors">{user.firstName} {user.lastName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-500 font-mono">{user.email}</div>
                  </td>
                  <td className="px-6 py-4"><span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300 text-xs font-bold">{user.partnerCode}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-20 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div className={`h-full rounded-full shadow-[0_0_10px_currentColor] ${user.finalGrade === 'Pass' ? 'bg-[#a522dd] text-[#a522dd]' : 'bg-[#2a00ff] text-[#2a00ff]'}`} style={{ width: `${user.percentageCompleted}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{user.percentageCompleted}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.finalGrade === 'Pass' ? (
                      <span className="inline-flex items-center gap-1.5 text-[#a522dd] bg-[#a522dd]/10 px-2.5 py-1 rounded-full text-xs font-bold border border-[#a522dd]/20"><CheckCircle className="w-3 h-3" /> Certified</span>
                    ) : user.percentageCompleted === 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700"><PlayCircle className="w-3 h-3" /> Not Started</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[#2a00ff] bg-[#2a00ff]/10 px-2.5 py-1 rounded-full text-xs font-bold border border-[#2a00ff]/20"><Clock className="w-3 h-3" /> In Progress</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{user.durationHours ? `${user.durationHours.toFixed(1)}h` : '-'}</td>
                  <td className="px-6 py-4">
                    {user.isSuspicious ? (
                        <div className="flex flex-wrap gap-1">
                            {user.suspicionReason?.split(',').map((reason, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded text-[10px] font-bold border border-red-500/20 whitespace-nowrap">
                                    <AlertTriangle className="w-3 h-3" /> {reason.trim()}
                                </span>
                            ))}
                        </div>
                    ) : user.dataError ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded text-[10px] font-bold border border-orange-500/20">
                            <Bug className="w-3 h-3" /> Data Error
                        </span>
                    ) : (
                        <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {paginatedData.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-slate-500">No records found.</td></tr>}
            </tbody>
          </table>
        </div>
        
        {filteredData.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-[#141319]/50">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-[#2a00ff] disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /> Prev</button>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-500">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-[#2a00ff] disabled:opacity-30 transition-colors">Next <ChevronRight className="w-4 h-4" /></button>
            </div>
        )}
      </div>
    </div>
  );
};