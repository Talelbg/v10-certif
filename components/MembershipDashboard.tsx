import React, { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, Award, Filter, Calendar, Check, Crown, TrendingUp, UserCheck, ArrowLeft } from 'lucide-react';
import { StatCard } from './StatCard';
import { DeveloperRecord, TimeframeOption, MembershipMetrics } from '../types';
import { calculateMembershipMetrics, generateMembershipChartData } from '../services/dataProcessing';

interface MembershipDashboardProps {
  data: DeveloperRecord[];
  onBack?: () => void;
}

export const MembershipDashboard: React.FC<MembershipDashboardProps> = ({ data, onBack }) => {
  const [metrics, setMetrics] = useState<MembershipMetrics | null>(null);

  // Filter State (Mirrors main dashboard for consistency)
  const [activeCommunity, setActiveCommunity] = useState<string>('All');
  const [activeTimeframe, setActiveTimeframe] = useState<TimeframeOption>('All Time');
  const [activeStartDate, setActiveStartDate] = useState<string>('');
  const [activeEndDate, setActiveEndDate] = useState<string>('');

  const [pendingCommunity, setPendingCommunity] = useState<string>('All');
  const [pendingTimeframe, setPendingTimeframe] = useState<TimeframeOption>('All Time');
  const [pendingStartDate, setPendingStartDate] = useState<string>('');
  const [pendingEndDate, setPendingEndDate] = useState<string>('');

  const hasUnappliedChanges = 
      pendingCommunity !== activeCommunity || 
      pendingTimeframe !== activeTimeframe ||
      (pendingTimeframe === 'Custom Range' && (pendingStartDate !== activeStartDate || pendingEndDate !== activeEndDate));

  // Calculate Date Objects
  const calculatedDateRange = useMemo(() => {
      const now = new Date();
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      let start: Date | null = null;
      let end: Date | null = null;

      switch (activeTimeframe) {
          case 'Last 30 Days':
              start = new Date(); start.setDate(now.getDate() - 30); start.setHours(0,0,0,0);
              end = endOfToday;
              break;
          case 'Last 90 Days':
              start = new Date(); start.setDate(now.getDate() - 90); start.setHours(0,0,0,0);
              end = endOfToday;
              break;
          case 'This Year':
              start = new Date(now.getFullYear(), 0, 1); start.setHours(0,0,0,0);
              end = endOfToday;
              break;
          case 'Custom Range':
              if (activeStartDate) { start = new Date(activeStartDate); start.setHours(0,0,0,0); }
              if (activeEndDate) { end = new Date(activeEndDate); end.setHours(23,59,59,999); }
              break;
          default: break;
      }
      return { start, end };
  }, [activeTimeframe, activeStartDate, activeEndDate]);

  const communities = useMemo(() => {
    const unique = new Set(data.map(d => d.partnerCode).filter(c => c && c !== 'UNKNOWN'));
    return ['All', ...Array.from(unique).sort()];
  }, [data]);

  // Filter data
  const filteredData = useMemo(() => {
    if (activeCommunity === 'All') return data;
    return data.filter(d => d.partnerCode === activeCommunity);
  }, [data, activeCommunity]);

  // Calculate Metrics & Chart Data
  useEffect(() => {
    const m = calculateMembershipMetrics(filteredData, calculatedDateRange.start, calculatedDateRange.end);
    setMetrics(m);
  }, [filteredData, calculatedDateRange]);

  const chartData = useMemo(() => {
    return generateMembershipChartData(filteredData, calculatedDateRange.start, calculatedDateRange.end);
  }, [filteredData, calculatedDateRange]);

  // Pie Chart Data
  const funnelData = useMemo(() => {
      if(!metrics) return [];
      const nonMembers = metrics.totalEnrolled - metrics.totalMembers;
      return [
          { name: 'Members', value: metrics.totalMembers },
          { name: 'Non-Members', value: nonMembers > 0 ? nonMembers : 0 }
      ];
  }, [metrics]);

  const COLORS = ['#8b5cf6', '#334155']; // Purple for members, Slate for non-members

  const handleApplyFilters = () => {
      setActiveCommunity(pendingCommunity);
      setActiveTimeframe(pendingTimeframe);
      setActiveStartDate(pendingStartDate);
      setActiveEndDate(pendingEndDate);
  };

  if (!metrics) return <div className="p-6 text-slate-500 dark:text-slate-400">Loading Membership Data...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
        
        {/* Optional Back Button */}
        {onBack && (
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-[#2a00ff] dark:hover:text-[#2a00ff] font-medium mb-2 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
        )}

        {/* HEADER & FILTERS */}
        <div className="glass-panel p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4 gap-4">
                 <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Crown className="w-6 h-6 text-purple-600" /> Membership Program
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Track developer conversion from enrollment to official membership.
                    </p>
                </div>
            </div>
            
            {/* FILTERS (Reused logic) */}
            <div className="flex flex-col xl:flex-row gap-4 items-end xl:items-center">
                 <div className="w-full xl:w-auto">
                    <label className="block text-[10px] font-bold text-[#a522dd] mb-2 uppercase tracking-wider">Community</label>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select 
                            value={pendingCommunity}
                            onChange={(e) => setPendingCommunity(e.target.value)}
                            className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium w-full xl:w-64 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                        >
                            {communities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                 </div>
                 <div className="w-full xl:w-auto">
                    <label className="block text-[10px] font-bold text-[#a522dd] mb-2 uppercase tracking-wider">Period</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select 
                            value={pendingTimeframe}
                            onChange={(e) => setPendingTimeframe(e.target.value as TimeframeOption)}
                            className="pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium w-full xl:w-48 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                        >
                            <option value="All Time">All Time</option>
                            <option value="This Year">This Year</option>
                            <option value="Last 90 Days">Last 90 Days</option>
                            <option value="Last 30 Days">Last 30 Days</option>
                            <option value="Custom Range">Custom Range</option>
                        </select>
                    </div>
                 </div>
                 {pendingTimeframe === 'Custom Range' && (
                     <div className="flex gap-2 w-full xl:w-auto animate-fade-in">
                         <input 
                            type="date" 
                            value={pendingStartDate} 
                            onChange={e => setPendingStartDate(e.target.value)} 
                            className="px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none shadow-sm" 
                         />
                         <input 
                            type="date" 
                            value={pendingEndDate} 
                            onChange={e => setPendingEndDate(e.target.value)} 
                            className="px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none shadow-sm" 
                         />
                     </div>
                 )}
                 <div className="w-full xl:w-auto pb-[1px]">
                     <button
                        onClick={handleApplyFilters}
                        disabled={!hasUnappliedChanges}
                        className={`w-full px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${hasUnappliedChanges ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'}`}
                     >
                        <Check className="w-4 h-4" /> Apply
                     </button>
                 </div>
            </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                title="Total Enrolled (Course)"
                value={metrics.totalEnrolled.toLocaleString()}
                icon={<Users className="w-5 h-5" />}
            />
            <StatCard 
                title="Onboarded Members"
                value={metrics.totalMembers.toLocaleString()}
                icon={<Crown className="w-5 h-5" />}
                alert={metrics.membershipRate < 50} // Alert if conversion < 50%
            />
            <StatCard 
                title="Membership Conversion"
                value={`${metrics.membershipRate.toFixed(1)}%`}
                icon={<TrendingUp className="w-5 h-5" />}
                trendUp={metrics.membershipRate > 50}
            />
            <StatCard 
                title="Certified Members"
                value={`${metrics.certifiedMembers} (${metrics.certifiedMemberRate.toFixed(1)}%)`}
                icon={<Award className="w-5 h-5" />}
            />
        </div>

        {/* CHARTS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Growth Chart */}
            <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <div className="w-1 h-5 bg-purple-600 rounded-full"></div>
                    Membership Growth Evolution
                </h3>
                <div className="h-80 w-full">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeOpacity={0.2} />
                                <XAxis dataKey="name" stroke="currentColor" className="text-slate-500 dark:text-slate-400" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                                <YAxis stroke="currentColor" className="text-slate-500 dark:text-slate-400" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#141319', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="enrollees" stroke="#94a3b8" strokeWidth={2} fillOpacity={0} fill="transparent" name="Total Enrolled" strokeDasharray="5 5" />
                                <Area type="monotone" dataKey="newMembers" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorMembers)" name="New Members" />
                                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400">No data available for period.</div>
                    )}
                </div>
            </div>

            {/* Funnel / Pie Chart */}
            <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-bold text-slate-800 dark:text-white mb-2">Program Composition</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Ratio of Total Enrolled vs. Accepted Members</p