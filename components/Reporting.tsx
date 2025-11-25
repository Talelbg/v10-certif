
import React, { useState, useMemo } from 'react';
import { DeveloperRecord } from '../types';
import { calculateDashboardMetrics, getPreviousPeriod } from '../services/dataProcessing';
import { generateComparativeReport } from '../services/geminiService';
import { FileText, Printer, Sparkles, TrendingUp, TrendingDown, Globe, ShieldAlert, Crown } from 'lucide-react';

interface ReportingProps {
    data: DeveloperRecord[];
}

export const Reporting: React.FC<ReportingProps> = ({ data }) => {
  const [selectedCommunity, setSelectedCommunity] = useState<string>('');
  const [reportType, setReportType] = useState<'Monthly' | 'Custom'>('Monthly');
  const [reportMonth, setReportMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  
  // Custom Date State
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const [aiReport, setAiReport] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Derived Dates Logic
  const dateContext = useMemo(() => {
      let start: Date;
      let end: Date;

      if (reportType === 'Monthly') {
          const year = parseInt(reportMonth.split('-')[0]);
          const month = parseInt(reportMonth.split('-')[1]) - 1; 
          start = new Date(year, month, 1);
          end = new Date(year, month + 1, 0);
          end.setHours(23, 59, 59);
      } else {
          // Custom Range
          if (!customStart || !customEnd) return null;
          start = new Date(customStart);
          end = new Date(customEnd);
          end.setHours(23, 59, 59);
      }
      
      // Dynamic Previous Period Calculation
      const prev = getPreviousPeriod(start, end);
      
      return { start, end, prevStart: prev.start, prevEnd: prev.end };
  }, [reportType, reportMonth, customStart, customEnd]);

  const communities = useMemo(() => {
      const unique = new Set(data.map(d => d.partnerCode).filter(p => p && p !== 'UNKNOWN'));
      return Array.from(unique).sort();
  }, [data]);

  // Metrics Calculation
  const metrics = useMemo(() => {
      if (!selectedCommunity || !dateContext) return null;
      
      const commData = data.filter(d => d.partnerCode === selectedCommunity);
      
      const current = calculateDashboardMetrics(commData, dateContext.start, dateContext.end);
      const prev = calculateDashboardMetrics(commData, dateContext.prevStart, dateContext.prevEnd);
      
      // Global Benchmark (for same current period)
      const globalData = data; 
      const global = calculateDashboardMetrics(globalData, dateContext.start, dateContext.end);

      return { current, prev, global };
  }, [data, selectedCommunity, dateContext]);

  const handleGenerateAi = async () => {
      if (!metrics || !selectedCommunity) return;
      setLoadingAi(true);
      setAiReport('Generating analysis...');
      try {
        const text = await generateComparativeReport(selectedCommunity, metrics.current, metrics.prev, metrics.global);
        setAiReport(text);
      } catch (e) {
        setAiReport('Failed to generate report. Please check console.');
      } finally {
        setLoadingAi(false);
      }
  };

  const handlePrint = () => {
      window.print();
  };

  const formatDateDisplay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-6 print:space-y-0 animate-fade-in">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Performance Reporting</h1>
          <p className="text-slate-500 dark:text-slate-400">Generate comparative analysis PDF reports.</p>
        </div>
      </div>

      {/* CONTROLS (Hidden in Print) */}
      <div className="glass-panel p-6 rounded-xl flex flex-col lg:flex-row gap-4 items-end print:hidden border border-slate-200 dark:border-slate-700 shadow-sm">
          
          {/* 1. Community Selection */}
          <div className="w-full lg:w-1/4">
              <label className="block text-[10px] font-bold text-[#a522dd] mb-2 uppercase tracking-wider">Community</label>
              <select 
                  value={selectedCommunity} 
                  onChange={e => { setSelectedCommunity(e.target.value); setAiReport(''); }}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2a00ff] shadow-sm"
              >
                  <option value="">-- Select Community --</option>
                  {communities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
          </div>

          {/* 2. Report Type Toggle */}
          <div className="w-full lg:w-auto">
              <label className="block text-[10px] font-bold text-[#a522dd] mb-2 uppercase tracking-wider">Report Type</label>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button 
                    onClick={() => setReportType('Monthly')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${reportType === 'Monthly' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                      Monthly Preset
                  </button>
                  <button 
                    onClick={() => setReportType('Custom')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${reportType === 'Custom' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                      Custom Dates
                  </button>
              </div>
          </div>

          {/* 3. Date Inputs */}
          {reportType === 'Monthly' ? (
              <div className="w-full lg:w-48">
                  <label className="block text-[10px] font-bold text-[#a522dd] mb-2 uppercase tracking-wider">Select Month</label>
                  <input 
                      type="month" 
                      value={reportMonth} 
                      onChange={e => setReportMonth(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2a00ff] shadow-sm"
                  />
              </div>
          ) : (
              <div className="flex gap-2 w-full lg:w-auto">
                  <div>
                    <label className="block text-[10px] font-bold text-[#a522dd] mb-2 uppercase tracking-wider">Start</label>
                    <input 
                        type="date" 
                        value={customStart} 
                        onChange={e => setCustomStart(e.target.value)}
                        className="w-36 p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2a00ff] shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#a522dd] mb-2 uppercase tracking-wider">End</label>
                    <input 
                        type="date" 
                        value={customEnd} 
                        onChange={e => setCustomEnd(e.target.value)}
                        className="w-36 p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2a00ff] shadow-sm"
                    />
                  </div>
              </div>
          )}
          
          {/* 4. Action Buttons */}
          <div className="flex gap-2 ml-auto w-full lg:w-auto pb-[1px]">
            <button 
                onClick={handleGenerateAi} 
                disabled={!selectedCommunity || !dateContext || loadingAi}
                className="flex-1 lg:flex-none px-6 py-2.5 bg-gradient-to-r from-[#2a00ff] to-[#791cf5] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-[#2a00ff]/25 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
                <Sparkles className={`w-4 h-4 ${loadingAi ? 'animate-spin' : ''}`} /> {loadingAi ? 'Analyzing...' : 'AI Analysis'}
            </button>
            <button 
                onClick={handlePrint} 
                disabled={!selectedCommunity || !dateContext}
                className="flex-1 lg:flex-none px-6 py-2.5 bg-slate-800 dark:bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm transition-colors"
            >
                <Printer className="w-4 h-4" /> Print PDF
            </button>
          </div>
      </div>

      {/* REPORT PREVIEW (Printable Area) */}
      {selectedCommunity && metrics && dateContext ? (
          <div className="glass-card p-10 rounded-xl border border-slate-200 dark:border-white/10 shadow-lg min-h-[800px] print:shadow-none print:border-none print:p-0 animate-fade-in print:text-black print:bg-white bg-white dark:bg-[#141319]">
              
              {/* Report Header */}
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-white/10 pb-8 mb-8">
                  <div>
                      <div className="flex items-center gap-3 mb-2">
                          <div className="h-12 w-12 bg-[#2a00ff] rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-[0_0_15px_#2a00ff]">H</div>
                          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{selectedCommunity}</h1>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">Community Performance Report</p>
                  </div>
                  <div className="text-right">
                      <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                          {formatDateDisplay(dateContext.start)} - {formatDateDisplay(dateContext.end)}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                          Generated: {new Date().toLocaleDateString()}
                      </div>
                  </div>
              </div>

              {/* SECTION 1: GROWTH KPI Grid */}
              <div className="mb-8">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Growth Metrics
                  </h4>
                  <div className="grid grid-cols-3 gap-6">
                      <ReportCard 
                          title="Registrations" 
                          current={metrics.current.totalRegistered} 
                          prev={metrics.prev.totalRegistered} 
                      />
                      <ReportCard 
                          title="Certifications" 
                          current={metrics.current.totalCertified} 
                          prev={metrics.prev.totalCertified} 
                      />
                      <ReportCard 
                          title="Completion Rate" 
                          current={metrics.current.certificationRate} 
                          prev={metrics.prev.certificationRate}
                          isPercent 
                      />
                  </div>
              </div>

              {/* SECTION 2: ENGAGEMENT & QUALITY Grid */}
              <div className="mb-8">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Crown className="w-4 h-4" /> Engagement & Quality
                  </h4>
                  <div className="grid grid-cols-3 gap-6">
                      <ReportCard 
                          title="Subscribers" 
                          current={metrics.current.overallSubscriberRate} 
                          prev={metrics.prev.overallSubscriberRate}
                          isPercent
                      />
                      <ReportCard 
                          title="Course Starts" 
                          current={metrics.current.usersStartedCourse} 
                          prev={metrics.prev.usersStartedCourse} 
                      />
                      <ReportCard 
                          title="Avg Time (Days)" 
                          current={metrics.current.avgCompletionTimeDays} 
                          prev={metrics.prev.avgCompletionTimeDays}
                          reverseTrend // Lower is better
                      />
                  </div>
              </div>

              {/* SECTION 3: RISK Grid */}
              <div className="mb-10">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4" /> Risk Analysis
                  </h4>
                  <div className="grid grid-cols-3 gap-6">
                       <ReportCard 
                          title="Fake Accounts" 
                          current={metrics.current.potentialFakeAccounts} 
                          prev={metrics.prev.potentialFakeAccounts}
                          reverseTrend
                      />
                      <ReportCard 
                          title="Rapid Completions" 
                          current={metrics.current.rapidCompletions} 
                          prev={metrics.prev.rapidCompletions}
                      />
                      <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl border border-slate-100 dark:border-white/5 relative overflow-hidden">
                          <div className="relative z-10">
                              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Risk Ratio</div>
                              <div className={`text-3xl font-bold ${metrics.current.potentialFakeAccountsPct > 5 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'} mb-3`}>
                                  {metrics.current.potentialFakeAccountsPct.toFixed(1)}%
                              </div>
                              <div className="text-xs text-slate-400">of total registered</div>
                          </div>
                          {/* Background glow for risk card */}
                          <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-red-500/10 rounded-full blur-2xl"></div>
                      </div>
                  </div>
              </div>

              {/* Benchmark Section */}
              <div className="mb-10">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/10">
                      <Globe className="w-5 h-5 text-[#2a00ff]" /> Global Benchmark Comparison
                  </h3>
                  <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-8 border border-slate-200 dark:border-white/5">
                      <div className="grid grid-cols-2 gap-12">
                          
                          {/* Completion Time Benchmark */}
                          <div>
                              <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Avg. Completion Time (Days)</div>
                              <div className="flex items-end gap-6">
                                  <div>
                                      <div className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.current.avgCompletionTimeDays.toFixed(1)}</div>
                                      <div className="text-xs font-bold text-[#2a00ff] mt-1">YOUR COMMUNITY</div>
                                  </div>
                                  <div className="mb-2 text-slate-400 font-medium">vs</div>
                                  <div>
                                      <div className="text-3xl font-bold text-slate-400">{metrics.global.avgCompletionTimeDays.toFixed(1)}</div>
                                      <div className="text-xs font-bold text-slate-400 mt-1">GLOBAL AVG</div>
                                  </div>
                              </div>
                          </div>

                          {/* Efficiency Bar */}
                          <div>
                              <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Certification Efficiency</div>
                              <div className="relative pt-1">
                                  <div className="flex mb-2 items-center justify-between text-xs">
                                      <span className="font-bold text-[#2a00ff] px-2 py-1 bg-[#2a00ff]/10 rounded">You: {metrics.current.certificationRate.toFixed(1)}%</span>
                                      <span className="font-bold text-slate-600 dark:text-slate-400">Global: {metrics.global.certificationRate.toFixed(1)}%</span>
                                  </div>
                                  <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-slate-200 dark:bg-slate-700 relative">
                                      <div style={{ width: `${metrics.current.certificationRate}%` }} className="shadow-[0_0_10px_#2a00ff] flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#2a00ff] rounded-full relative z-10"></div>
                                      <div style={{ left: `${metrics.global.certificationRate}%` }} className="absolute h-full w-0.5 bg-slate-900 dark:bg-white z-20 opacity-80 top-0"></div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* AI Analysis Section */}
              <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/10">
                      <Sparkles className="w-5 h-5 text-[#a522dd]" /> AI Strategic Analysis
                  </h3>
                  <div className="prose prose-slate dark:prose-invert max-w-none p-8 bg-gradient-to-br from-[#a522dd]/5 to-transparent rounded-xl border border-[#a522dd]/10 text-sm md:text-base shadow-sm relative overflow-hidden">
                      <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#a522dd]/10 rounded-full blur-3xl"></div>
                      {aiReport ? (
                           <div className="whitespace-pre-line leading-loose text-slate-700 dark:text-slate-300 font-medium relative z-10">{aiReport}</div>
                      ) : (
                           <div className="text-slate-400 italic text-center py-8 border-2 border-dashed border-[#a522dd]/20 rounded-lg relative z-10">
                               {loadingAi ? 'Generating insights...' : 'Click "AI Analysis" to generate insights based on the comparison above.'}
                           </div>
                      )}
                  </div>
              </div>

              {/* Footer */}
              <div className="mt-16 pt-6 border-t border-slate-100 dark:border-white/10 text-center text-slate-400 text-xs">
                  Confidential Report • Hedera Certification Dashboard • {new Date().getFullYear()}
              </div>

          </div>
      ) : (
          <div className="p-20 text-center bg-white dark:bg-[#141319]/50 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
              <div className="mx-auto w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4">
                  <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ready to Generate Report</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Select a community and date range above to begin.</p>
          </div>
      )}
    </div>
  );
};

// Helper Component for Report Cards
const ReportCard = ({ title, current, prev, isPercent, reverseTrend }: { title: string, current: number, prev: number, isPercent?: boolean, reverseTrend?: boolean }) => {
    const diff = current - prev;
    const growth = prev !== 0 ? (diff / prev) * 100 : 0;
    
    const isGood = reverseTrend ? growth <= 0 : growth >= 0;

    return (
        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl border border-slate-100 dark:border-white/5 hover:border-[#2a00ff]/30 hover:shadow-[0_0_20px_rgba(42,0,255,0.1)] transition-all group relative overflow-hidden">
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#2a00ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="relative z-10">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{title}</div>
                <div className="text-4xl font-bold text-slate-900 dark:text-white mb-3">
                    {isPercent ? `${current.toFixed(1)}%` : current.toLocaleString()}
                </div>
                <div className={`flex items-center text-sm font-bold ${isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isGood ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    {Math.abs(growth).toFixed(1)}% <span className="text-slate-400 font-normal ml-1">vs prev. period</span>
                </div>
            </div>
        </div>
    );
};
