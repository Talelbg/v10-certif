import React, { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Users, Award, Globe, Clock, AlertTriangle, Activity, Filter, BarChart2, Mail, Flag, Calendar, Check, Sparkles } from 'lucide-react';
import { StatCard } from './StatCard';
import { DashboardMetrics, DeveloperRecord, TimeframeOption } from '../types';
import { calculateDashboardMetrics, generateChartData, generateLeaderboard } from '../services/dataProcessing';
import { generateExecutiveSummary } from '../services/geminiService';

interface DashboardProps {
  data: DeveloperRecord[];
  onNavigate: (view: string, params?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, onNavigate }) => {
  // Metrics State
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [aiSummary, setAiSummary] = useState<string>("Waiting for data...");
  const [loadingAi, setLoadingAi] = useState(false);

  // Filter State
  const [activeCommunity, setActiveCommunity] = useState<string>('All');
  const [activeTimeframe, setActiveTimeframe] = useState<TimeframeOption>('All Time');
  const [activeStartDate, setActiveStartDate] = useState<string>('');
  const [activeEndDate, setActiveEndDate] = useState<string>('');

  // Pending State for "Apply" workflow
  const [pendingCommunity, setPendingCommunity] = useState<string>('All');
  const [pendingTimeframe, setPendingTimeframe] = useState<TimeframeOption>('All Time');
  const [pendingStartDate, setPendingStartDate] = useState<string>('');
  const [pendingEndDate, setPendingEndDate] = useState<string>('');

  const hasUnappliedChanges = 
      pendingCommunity !== activeCommunity || 
      pendingTimeframe !== activeTimeframe ||
      (pendingTimeframe === 'Custom Range' && (pendingStartDate !== activeStartDate || pendingEndDate !== activeEndDate));

  // Date Calculation
  const calculatedDateRange = useMemo(() => {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      switch (activeTimeframe) {
          case 'Last 30 Days':
              start = new Date(); start.setDate(now.getDate() - 30); start.setHours(0, 0, 0, 0); end = endOfToday; break;
          case 'Last 90 Days':
              start = new Date(); start.setDate(now.getDate() - 90); start.setHours(0, 0, 0, 0); end = endOfToday; break;
          case 'This Year':
              start = new Date(now.getFullYear(), 0, 1); start.setHours(0, 0, 0, 0); end = endOfToday; break;
          case 'Custom Range':
              if (activeStartDate) { start = new Date(activeStartDate); start.setHours(0, 0, 0, 0); }
              if (activeEndDate) { end = new Date(activeEndDate); end.setHours(23, 59, 59, 999); }
              break;
          default: start = null; end = null; break;
      }
      return { start, end };
  }, [activeTimeframe, activeStartDate, activeEndDate]);

  const communities = useMemo(() => {
    const unique = new Set(data.map(d => d.partnerCode).filter(c => c && c !== 'UNKNOWN'));
    return ['All', ...Array.from(unique).sort()];
  }, [data]);

  const communityFilteredData = useMemo(() => {
    if (activeCommunity === 'All') return data;
    return data.filter(d => d.partnerCode === activeCommunity);
  }, [data, activeCommunity]);

  useEffect(() => {
    const calculated = calculateDashboardMetrics(communityFilteredData, calculatedDateRange.start, calculatedDateRange.end);
    setMetrics(calculated);
  }, [communityFilteredData, calculatedDateRange]);

  const chartData = useMemo(() => {
    return generateChartData(communityFilteredData, calculatedDateRange.start, calculatedDateRange.end);
  }, [communityFilteredData, calculatedDateRange]);

  const leaderboardData = useMemo(() => {
      return generateLeaderboard(communityFilteredData);
  }, [communityFilteredData]);

  // AI Summary Trigger
  useEffect(() => {
      if (data.length === 0) {
          setAiSummary("No data available. Please upload a CSV file.");
      } else if (metrics && aiSummary === "Waiting for data...") {
          setAiSummary("Click 'AI Insights' to analyze performance.");
      }
  }, [data]); 

  const handleApplyFilters = () => {
      setActiveCommunity(pendingCommunity);
      setActiveTimeframe(pendingTimeframe);
      setActiveStartDate(pendingStartDate);
      setActiveEndDate(pendingEndDate);
  };

  const handleGenerateSummary = async () => {
      if (!metrics) return;
      setLoadingAi(true);
      let timeContext: string = activeTimeframe;
      if (activeTimeframe === 'Custom Range') {
          timeContext = `${activeStartDate || 'Start'} to ${activeEndDate || 'End'}`;
      }
      const fullContext = `${activeCommunity} (${timeContext})`;
      try {
        if (!process.env.API_KEY) {
            setAiSummary("AI unavailable (Missing API Key).");
        } else {
            const summary = await generateExecutiveSummary(metrics, fullContext);
            setAiSummary(summary);
        }
      } catch (e) { setAiSummary("Failed to generate summary."); } finally { setLoadingAi(false); }
  }

  // Custom Tooltip for Area Chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#141319]/95 backdrop-blur-md border border-slate-200 dark:border-white/10 p-4 rounded-xl shadow-xl text-slate-900 dark:text-white z-50">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">{label}</p>
          <div className="space-y-1">
             <div className="flex items-center gap-3 text-sm font-medium">
                <div className="w-2 h-2 rounded-full bg-[#2a00ff]"></div>
                <span className="text-slate-600 dark:text-slate-300">Registrations:</span>
                <span className="font-bold">{payload[0].value}</span>
             </div>
             <div className="flex items-center gap-3 text-sm font-medium">
                <div className="w-2 h-2 rounded-full bg-[#a522dd]"></div>
                <span className="text-slate-600 dark:text-slate-300">Certifications:</span>
                <span className="font-bold">{payload[1].value}</span>
             </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!metrics) return <div className="p-20 text-center text-slate-500 font-medium animate-pulse">Initializing Blockchain Nodes...</div>;

  return (
    <div className="space-y-8 pb-12">
      {/* Filters & Controls - Glass Panel */}
      <div className="glass-panel p-6 rounded-2xl bg-white dark:bg-[#1c1b22]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-200 dark:border-white/5 pb-6">
             <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    {activeCommunity === 'All' ? 'Global Overview' : activeCommunity}
                    <div className="w-2 h-2 rounded-full bg-[#2a00ff] shadow-[0_0_10px_#2a00ff] animate-pulse"></div>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">
                    {activeTimeframe === 'All Time' 
                        ? `Viewing all ${communityFilteredData.length.toLocaleString()} records` 
                        : `Timeframe: ${activeTimeframe === 'Custom Range' ? `${activeStartDate} - ${activeEndDate}` : activeTimeframe}`}
                </p>
            </div>
            <button 
                onClick={handleGenerateSummary}
                disabled={loadingAi || data.length === 0}
                className="group flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2a00ff] to-[#791cf5] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#2a00ff]/30 hover:shadow-[#2a00ff]/50 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none relative overflow-hidden"
             >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <Sparkles className={`w-4 h-4 relative z-10 ${loadingAi ? 'animate-spin' : ''}`} />
                <span className="relative z-10">{loadingAi ? 'Analyzing...' : 'AI Insights'}</span>
             </button>
        </div>
        
        <div className="flex flex-col xl:flex-row gap-5 items-end xl:items-center">
             <div className="w-full xl:w-auto">
                <label className="block text-[10px] font-bold text-[#a522dd] mb-2 uppercase tracking-wider">Community Node</label>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select 
                        value={pendingCommunity}
                        onChange={(e) => setPendingCommunity(e.target.value)}
                        className="pl-10 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2a00ff] focus:border-transparent outline-none appearance-none w-full xl:w-64 cursor-pointer hover:border-slate-300 dark:hover:border-slate-500 transition-colors shadow-sm"
                    >
                        {communities.map(c => (
                            <option key={c} value={c}>{c === 'All' ? 'Global (All)' : c}</option>
                        ))}
                    </select>
                </div>
             </div>

             <div className="w-full xl:w-auto">
                <label className="block text-[10px] font-bold text-[#a522dd] mb-2 uppercase tracking-wider">Time Epoch</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select 
                        value={pendingTimeframe}
                        onChange={(e) => setPendingTimeframe(e.target.value as TimeframeOption)}
                        className="pl-10 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2a00ff] focus:border-transparent outline-none appearance-none w-full xl:w-56 cursor-pointer hover:border-slate-300 dark:hover:border-slate-500 transition-colors shadow-sm"
                    >
                        <option value="All Time">All Time</option>
                        <option value="This Year">This Year</option>
                        <option value="Last 90 Days">Last Quarter</option>
                        <option value="Last 30 Days">Last 30 Days</option>
                        <option value="Custom Range">Custom Range</option>
                    </select>
                </div>
             </div>

             {pendingTimeframe === 'Custom Range' && (
                 <div className="flex gap-2 w-full xl:w-auto fade-in-up">
                     <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Start Block</label>
                        <input 
                            type="date" 
                            value={pendingStartDate}
                            onChange={(e) => setPendingStartDate(e.target.value)}
                            className="w-full px-3 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2a00ff] outline-none shadow-sm"
                        />
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">End Block</label>
                        <input 
                            type="date" 
                            value={pendingEndDate}
                            onChange={(e) => setPendingEndDate(e.target.value)}
                            className="w-full px-3 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2a00ff] outline-none shadow-sm"
                        />
                     </div>
                 </div>
             )}

             <div className="w-full xl:w-auto pb-[1px]">
                 <button
                    onClick={handleApplyFilters}
                    disabled={!hasUnappliedChanges}
                    className={`w-full xl:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                        hasUnappliedChanges 
                        ? 'bg-[#2a00ff] hover:bg-[#791cf5] text-white shadow-[0_0_15px_rgba(42,0,255,0.4)] hover:scale-105' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-default border border-slate-200 dark:border-slate-700'
                    }`}
                 >
                    <Check className="w-4 h-4" />
                    Apply Filter
                 </button>
             </div>
        </div>
      </div>

      {/* AI Summary Banner */}
      <div className="relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-r from-[#2a00ff] via-[#791cf5] to-[#a522dd] shadow-lg animate-fade-in">
        <div className="bg-white/95 dark:bg-[#141319]/95 backdrop-blur-xl rounded-[15px] p-6 relative z-10">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-[#2a00ff]/10 to-[#791cf5]/10 border border-[#2a00ff]/20 text-[#a522dd] rounded-xl shrink-0">
                    <Activity className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1 flex items-center gap-2">
                        Executive AI Summary <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">Gemini 2.5</span>
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm md:text-base max-w-5xl">
                        {aiSummary}
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Registered Developers"
          value={metrics.totalRegistered.toLocaleString()}
          icon={<Users className="w-5 h-5" />}
          trendUp={true}
          onClick={() => onNavigate('developers', { statusFilter: 'All', communityFilter: activeCommunity })}
        />
        <StatCard
          title="Total Certified"
          value={metrics.totalCertified.toLocaleString()}
          icon={<Award className="w-5 h-5" />}
          trendUp={true}
          onClick={() => onNavigate('developers', { statusFilter: 'Certified', communityFilter: activeCommunity })}
        />
        <StatCard
          title="Users Started Course"
          value={`${metrics.usersStartedCourse.toLocaleString()} (${metrics.usersStartedCoursePct.toFixed(1)}%)`}
          icon={<BarChart2 className="w-5 h-5" />}
          trendUp={true}
          onClick={() => onNavigate('developers', { statusFilter: 'In Progress', communityFilter: activeCommunity })}
        />

        <StatCard
          title="Avg. Completion Time"
          value={`${metrics.avgCompletionTimeDays.toFixed(1)} days`}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="Active Communities"
          value={metrics.activeCommunities}
          icon={<Globe className="w-5 h-5" />}
          onClick={() => onNavigate('admin')}
        />
        <StatCard
          title="Overall Certification Rate"
          value={`${metrics.certificationRate.toFixed(1)}%`}
          icon={<Award className="w-5 h-5" />}
          trendUp={metrics.certificationRate > 40}
        />

        <StatCard
          title="Overall Subscriber Rate"
          value={`${metrics.overallSubscriberRate.toFixed(1)}%`}
          icon={<Mail className="w-5 h-5" />}
          onClick={() => onNavigate('membership')}
        />
        <StatCard
          title="Potential Fake Accounts"
          value={`${metrics.potentialFakeAccounts} (${metrics.potentialFakeAccountsPct.toFixed(1)}%)`}
          icon={<AlertTriangle className="w-5 h-5" />}
          alert={metrics.potentialFakeAccounts > 0}
          tooltip="Includes Speed Runs (<4h), Disposable Emails, and Shared Wallets. Does NOT include Data Errors (Time Travelers)."
          onClick={() => onNavigate('developers', { statusFilter: 'Flagged', communityFilter: activeCommunity })}
        />
        <StatCard
          title="Rapid Completions (<5h)"
          value={metrics.rapidCompletions.toLocaleString()}
          icon={<Flag className="w-5 h-5" />}
          onClick={() => onNavigate('developers', { statusFilter: 'Certified', searchQuery: '' })}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Growth Area Chart */}
        <div className="glass-card p-6 rounded-2xl bg-white dark:bg-transparent border border-slate-200 dark:border-white/5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-3 text-lg">
                <div className="w-1 h-6 bg-[#2a00ff] rounded-full shadow-[0_0_10px_#2a00ff]"></div> 
                Growth Evolution
            </h3>
            <div className="flex gap-4 text-xs font-bold">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#2a00ff] rounded-full"></div> <span className="text-slate-600 dark:text-slate-300">Registrations</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#a522dd] rounded-full"></div> <span className="text-slate-600 dark:text-slate-300">Certifications</span>
                </div>
            </div>
          </div>
          
          <div className="h-72 w-full">
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2a00ff" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2a00ff" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorCert" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a522dd" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#a522dd" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeOpacity={0.2} />
                    <XAxis dataKey="name" stroke="currentColor" className="text-slate-500 dark:text-slate-400" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} dy={10} />
                    <YAxis stroke="currentColor" className="text-slate-500 dark:text-slate-400" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="registrations" stroke="#2a00ff" strokeWidth={3} fillOpacity={1} fill="url(#colorReg)" />
                    <Area type="monotone" dataKey="certifications" stroke="#a522dd" strokeWidth={3} fillOpacity={1} fill="url(#colorCert)" />
                </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                    No data recorded for this period.
                </div>
            )}
          </div>
        </div>

        {/* Leaderboard Bar Chart */}
        <div className="glass-card p-6 rounded-2xl bg-white dark:bg-transparent border border-slate-200 dark:border-white/5">
            <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3 text-lg">
                <div className="w-1 h-6 bg-[#791cf5] rounded-full shadow-[0_0_10px_#791cf5]"></div> 
                {activeCommunity === 'All' ? 'Top Communities' : 'Contribution'}
            </h3>
            <div className="h-72 w-full">
                {leaderboardData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={leaderboardData} layout="vertical" margin={{ left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeOpacity={0.2}/>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} stroke="currentColor" className="text-slate-500 dark:text-slate-400" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip 
                                cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                                contentStyle={{ backgroundColor: '#141319', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16} name="Certified Users">
                                {leaderboardData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`url(#barGradient-${index})`} />
                                ))}
                            </Bar>
                            <defs>
                                {leaderboardData.map((entry, index) => (
                                    <linearGradient key={`grad-${index}`} id={`barGradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#2a00ff" />
                                        <stop offset="100%" stopColor="#a522dd" />
                                    </linearGradient>
                                ))}
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                        No leaderboard data.
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};