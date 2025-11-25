import React from 'react';
import { Info } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  alert?: boolean;
  onClick?: () => void;
  tooltip?: string; // New prop for explanation
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendUp, alert, onClick, tooltip }) => {
  return (
    <div 
        onClick={onClick}
        className={`p-6 rounded-2xl transition-all duration-300 relative overflow-hidden group border
        ${alert 
            ? 'bg-red-50 dark:bg-transparent border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
            : 'bg-white dark:bg-[#1c1b22]/60 border-slate-200 dark:border-white/5 hover:border-[#2a00ff]/50 hover:shadow-lg dark:hover:shadow-[0_0_30px_rgba(42,0,255,0.2)]'
        }
        ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}
        `}
    >
      {/* Background Gradient Bloom (Dark Mode Only) */}
      <div className={`hidden dark:block absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-10 blur-3xl transition-transform duration-700 group-hover:scale-125 ${alert ? 'bg-red-500' : 'bg-[#2a00ff]'}`}></div>

      <div className="flex justify-between items-start relative z-10">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${alert ? 'text-red-600/80 dark:text-red-400/80' : 'text-slate-500 dark:text-slate-400'}`}>{title}</p>
            {tooltip && (
                <div className="group/info relative">
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                    <div className="absolute left-0 top-full mt-1 w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-xl opacity-0 group-hover/info:opacity-100 pointer-events-none z-50 transition-opacity border border-white/10">
                        {tooltip}
                    </div>
                </div>
            )}
          </div>
          <h3 className={`text-3xl font-bold tracking-tight mt-2 ${
              alert 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-slate-900 dark:text-white group-hover:text-[#2a00ff] dark:group-hover:text-[#d8b4fe] transition-colors'
          }`}>
              {value}
          </h3>
        </div>
        {icon && (
            <div className={`p-3 rounded-xl backdrop-blur-md border transition-all duration-300 ${
                alert 
                  ? 'bg-red-100 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' 
                  : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/5 group-hover:bg-[#2a00ff] group-hover:text-white dark:group-hover:shadow-[0_0_15px_rgba(42,0,255,0.6)]'
            }`}>
                {icon}
            </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-xs font-medium">
          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${trendUp ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10' : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-500/10'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
          <span className="text-slate-500 dark:text-slate-400 ml-2">vs prev. period</span>
        </div>
      )}
    </div>
  );
};