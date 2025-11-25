import React, { useMemo, useState } from 'react';
import { Calendar, MapPin, Users, Search, Mail, Plus, Save, Video, Target, UserPlus, X, ExternalLink, Globe, AlertTriangle, Clock } from 'lucide-react';
import { DeveloperRecord, CommunityEvent } from '../types';

interface EventManagementProps {
    data: DeveloperRecord[];
    events: CommunityEvent[];
    setEvents: React.Dispatch<React.SetStateAction<CommunityEvent[]>>;
}

export const EventManagement: React.FC<EventManagementProps> = ({ data, events, setEvents }) => {
  const [showCreate, setShowCreate] = useState(false);
  
  // --- Form State ---
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [partner, setPartner] = useState('');
  const [format, setFormat] = useState<'Online' | 'In-Person'>('In-Person');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  
  // Facilitator Management
  const [facilitators, setFacilitators] = useState<string[]>([]);
  const [currentFacilitator, setCurrentFacilitator] = useState('');

  // Smart Query State
  const [queryCountry, setQueryCountry] = useState<string>('All');
  const [queryProgress, setQueryProgress] = useState<string>('0');
  const [queryResult, setQueryResult] = useState<number | null>(null);

  // Extract unique countries & partners
  const availableCountries = useMemo(() => {
      const countries = new Set(data.map(d => d.country).filter(c => c && c !== 'Unknown'));
      return Array.from(countries).sort();
  }, [data]);

  const availablePartners = useMemo(() => {
      const partners = new Set(data.map(d => d.partnerCode).filter(p => p && p !== 'UNKNOWN'));
      return Array.from(partners).sort();
  }, [data]);

  const handleAddFacilitator = () => {
      if (currentFacilitator.trim()) {
          setFacilitators([...facilitators, currentFacilitator.trim()]);
          setCurrentFacilitator('');
      }
  };

  const removeFacilitator = (index: number) => {
      const newF = [...facilitators];
      newF.splice(index, 1);
      setFacilitators(newF);
  };

  const handleCreateEvent = () => {
      setFormError(null);
      
      // VALIDATION
      if(!title.trim()) { setFormError('Event Title is required'); return; }
      if(!objective.trim()) { setFormError('Event Objective is required'); return; }
      if(!date) { setFormError('Date is required'); return; }
      if(!partner) { setFormError('Partner Community is required'); return; }
      if(!startTime) { setFormError('Start Time is required'); return; }
      if(!endTime) { setFormError('End Time is required'); return; }

      // Calculate eligible invitees based on partner code in CSV
      const eligibleCount = data.filter(d => d.partnerCode === partner).length;

      const newEvent: CommunityEvent = {
          id: `evt_${Date.now()}`,
          title,
          objective,
          date,
          startTime,
          endTime,
          format,
          location: format === 'In-Person' ? location : 'Online Event',
          meetingLink: format === 'Online' ? meetingLink : undefined,
          partnerCode: partner,
          facilitators: facilitators,
          invitedCount: eligibleCount,
          rsvpedCount: 0,
          checkedInCount: 0
      };

      setEvents([...events, newEvent]);
      
      // Reset Form
      setShowCreate(false);
      setTitle('');
      setObjective('');
      setDate('');
      setStartTime('');
      setEndTime('');
      setPartner('');
      setLocation('');
      setMeetingLink('');
      setFacilitators([]);
      setFormat('In-Person');
  };

  const handleGenerateList = () => {
      if (data.length === 0) {
          alert("Please upload a CSV file in the Dashboard first.");
          return;
      }

      const progressThreshold = parseInt(queryProgress);
      
      const eligibleUsers = data.filter(d => {
          const matchesCountry = queryCountry === 'All' || d.country === queryCountry;
          const matchesProgress = d.percentageCompleted >= progressThreshold;
          return matchesCountry && matchesProgress;
      });

      setQueryResult(eligibleUsers.length);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Event Management</h1>
          <p className="text-slate-500 dark:text-slate-400">Plan objectives, assign trainers, and organize community meetups.</p>
        </div>
        <button 
            onClick={() => setShowCreate(!showCreate)}
            disabled={data.length === 0}
            className="px-6 py-2.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 font-medium flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-900/20 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" /> Create New Event
        </button>
      </div>

      {/* Create Event Form */}
      {showCreate && (
          <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 rounded-xl shadow-lg animate-fade-in overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">Create Community Event</h3>
                  <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* LEFT COLUMN: Details */}
                  <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Event Details</h4>
                      
                      {formError && (
                          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg flex items-center gap-2 border border-red-200 dark:border-red-800">
                              <AlertTriangle className="w-4 h-4" /> {formError}
                          </div>
                      )}

                      <div>
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Event Title <span className="text-red-500">*</span></label>
                          <input 
                             value={title} 
                             onChange={e => setTitle(e.target.value)} 
                             type="text" 
                             placeholder="e.g., Hedera Hashgraph 101 Workshop"
                             className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" 
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Event Objective <span className="text-red-500">*</span></label>
                          <textarea 
                             value={objective} 
                             onChange={e => setObjective(e.target.value)} 
                             rows={3}
                             placeholder="What is the goal? e.g., Certify 50 new developers in Paris."
                             className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-900 dark:text-white" 
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Target Community <span className="text-red-500">*</span></label>
                            <select 
                                value={partner} 
                                onChange={e => setPartner(e.target.value)} 
                                className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                            >
                                <option value="">Select Partner...</option>
                                {availablePartners.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Date <span className="text-red-500">*</span></label>
                            <input 
                                value={date} 
                                onChange={e => setDate(e.target.value)} 
                                type="date" 
                                className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" 
                            />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Start Time <span className="text-red-500">*</span></label>
                              <input 
                                  value={startTime} 
                                  onChange={e => setStartTime(e.target.value)} 
                                  type="time" 
                                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" 
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">End Time <span className="text-red-500">*</span></label>
                              <input 
                                  value={endTime} 
                                  onChange={e => setEndTime(e.target.value)} 
                                  type="time" 
                                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" 
                              />
                          </div>
                      </div>
                  </div>

                  {/* RIGHT COLUMN: Logistics & Team */}
                  <div className="space-y-6">
                       {/* Format Section */}
                       <div>
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Format & Location</h4>
                           <div className="flex gap-4 mb-4">
                               <button 
                                  onClick={() => setFormat('In-Person')}
                                  className={`flex-1 py-2 rounded-lg text-sm font-medium border flex items-center justify-center gap-2 ${format === 'In-Person' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                               >
                                   <MapPin className="w-4 h-4" /> In-Person
                               </button>
                               <button 
                                  onClick={() => setFormat('Online')}
                                  className={`flex-1 py-2 rounded-lg text-sm font-medium border flex items-center justify-center gap-2 ${format === 'Online' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                               >
                                   <Video className="w-4 h-4" /> Online
                               </button>
                           </div>

                           {format === 'In-Person' ? (
                               <div>
                                   <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Physical Address / Map Location</label>
                                   <div className="relative">
                                       <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                       <input 
                                            value={location} 
                                            onChange={e => setLocation(e.target.value)} 
                                            type="text" 
                                            placeholder="e.g., Station F, Paris, France"
                                            className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" 
                                        />
                                   </div>
                               </div>
                           ) : (
                               <div>
                                   <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Meeting Link (Zoom/Meet)</label>
                                   <div className="relative">
                                       <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                       <input 
                                            value={meetingLink} 
                                            onChange={e => setMeetingLink(e.target.value)} 
                                            type="text" 
                                            placeholder="https://meet.google.com/..."
                                            className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" 
                                        />
                                   </div>
                               </div>
                           )}
                       </div>

                       {/* Team Section */}
                       <div>
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Assigned Team</h4>
                           <div>
                               <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Add Facilitators / Trainers (Up to 3)</label>
                               <div className="flex gap-2 mb-2">
                                   <div className="relative flex-1">
                                       <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                       <input 
                                           value={currentFacilitator} 
                                           onChange={e => setCurrentFacilitator(e.target.value)} 
                                           onKeyDown={e => e.key === 'Enter' && handleAddFacilitator()}
                                           type="text" 
                                           placeholder="Name of person..."
                                           className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" 
                                       />
                                   </div>
                                   <button 
                                      onClick={handleAddFacilitator}
                                      type="button"
                                      className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                   >
                                       <Plus className="w-4 h-4" />
                                   </button>
                               </div>
                               
                               {/* Tag List */}
                               <div className="flex flex-wrap gap-2">
                                   {facilitators.map((f, idx) => (
                                       <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full border border-indigo-100 dark:border-indigo-800">
                                           {f}
                                           <button onClick={() => removeFacilitator(idx)} className="hover:text-indigo-900 dark:hover:text-indigo-100"><X className="w-3 h-3" /></button>
                                       </span>
                                   ))}
                                   {facilitators.length === 0 && <span className="text-xs text-slate-400 italic">No facilitators assigned yet.</span>}
                               </div>
                           </div>
                       </div>
                  </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                  <button onClick={handleCreateEvent} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold flex items-center gap-2 shadow-sm">
                      <Save className="w-4 h-4" /> Save & Publish Event
                  </button>
              </div>
          </div>
      )}

      {events.length === 0 && !showCreate && (
           <div className="text-center py-16 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
               <div className="mx-auto w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-400 mb-4">
                   <Calendar className="w-8 h-8" />
               </div>
               <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Events Scheduled</h3>
               <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">Create your first event to start tracking objectives, assigning trainers, and engaging your community.</p>
               <button onClick={() => setShowCreate(true)} className="mt-6 text-blue-600 dark:text-blue-400 font-medium hover:underline">Create an Event now</button>
           </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {events.map((evt) => (
          <div key={evt.id} className="bg-white dark:bg-[#1c1b22] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col">
            {/* Card Header */}
            <div className="p-6 pb-4 flex-1">
                <div className="flex justify-between items-start mb-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${evt.format === 'Online' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}>
                        {evt.format === 'Online' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                        {evt.format}
                    </div>
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded font-mono border border-slate-200 dark:border-slate-700">
                        {evt.partnerCode}
                    </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">{evt.title}</h3>
                
                <div className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-white/5 p-3 rounded-lg">
                    <Target className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                    <p className="italic leading-relaxed text-xs md:text-sm">"{evt.objective}"</p>
                </div>

                <div className="space-y-2.5">
                    <div className="flex items-center text-slate-600 dark:text-slate-300 text-sm font-medium">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        {evt.date}
                    </div>
                    {(evt.startTime || evt.endTime) && (
                        <div className="flex items-center text-slate-600 dark:text-slate-300 text-sm font-medium">
                            <Clock className="w-4 h-4 mr-2 text-slate-400" />
                            {evt.startTime} {evt.endTime ? `- ${evt.endTime}` : ''}
                        </div>
                    )}
                    <div className="flex items-center text-slate-600 dark:text-slate-300 text-sm">
                        {evt.format === 'Online' ? (
                            <a href={evt.meetingLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                                <Globe className="w-4 h-4 mr-1 text-blue-400" />
                                {evt.meetingLink || 'Link TBD'} <ExternalLink className="w-3 h-3" />
                            </a>
                        ) : (
                            <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                                {evt.location}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Facilitators Section */}
            <div className="px-6 py-3 bg-slate-50/50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
                 <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Facilitators</h5>
                 <div className="flex items-center gap-2">
                     {evt.facilitators.length > 0 ? evt.facilitators.map((f, i) => (
                         <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-700 dark:text-slate-300 shadow-sm">
                             <div className="w-4 h-4 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-full flex items-center justify-center text-[9px] font-bold">
                                 {f.charAt(0)}
                             </div>
                             {f}
                         </div>
                     )) : (
                         <span className="text-xs text-slate-400">No facilitators assigned</span>
                     )}
                 </div>
            </div>

            {/* Stats Footer */}
            <div className="px-6 py-4 flex items-center justify-between bg-slate-50 dark:bg-white/5 rounded-b-xl">
              <div className="text-center">
                <div className="text-lg font-bold text-slate-900 dark:text-white">{evt.invitedCount}</div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Invites</div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-white/10"></div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{evt.rsvpedCount}</div>
                <div className="text-[10px] uppercase font-bold text-slate-400">RSVP</div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-white/10"></div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{evt.checkedInCount}</div>
                 <div className="text-[10px] uppercase font-bold text-slate-400">Check-In</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Functional Smart Query Section */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl shadow-lg text-white mt-12">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-white/10 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
                <h3 className="text-lg font-bold">Audience Query Tool</h3>
                <p className="text-slate-400 text-sm">Quickly check potential attendance numbers before creating an event.</p>
            </div>
        </div>

        <div className="bg-white/5 p-6 rounded-lg border border-white/10">
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Filter by Country</label>
                    <select 
                        value={queryCountry}
                        onChange={(e) => setQueryCountry(e.target.value)}
                        className="w-full p-2.5 bg-slate-800 border border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="All">All Countries</option>
                        {availableCountries.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Min. Completion %</label>
                    <select 
                        value={queryProgress}
                        onChange={(e) => setQueryProgress(e.target.value)}
                        className="w-full p-2.5 bg-slate-800 border border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="0">Any Progress (0%+)</option>
                        <option value="25">Started (25%+)</option>
                        <option value="50">Halfway (50%+)</option>
                        <option value="80">Near Completion (80%+)</option>
                        <option value="100">Certified Only (100%)</option>
                    </select>
                </div>
                <button 
                    onClick={handleGenerateList}
                    className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    <Search className="w-4 h-4" />
                    Estimate Audience
                </button>
            </div>
            
            {/* Results Display */}
            {queryResult !== null && (
                <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">ESTIMATE</div>
                        <span className="font-medium text-blue-100">Found <span className="text-white font-bold text-lg">{queryResult}</span> matching candidates</span>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};