
import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, Loader2, AlertTriangle, History, Trash2, Database } from 'lucide-react';
import { DeveloperRecord, DatasetVersion } from '../types';
import { processIngestedData } from '../services/dataProcessing';

interface CsvUploaderProps {
  onDataLoaded: (data: DeveloperRecord[], fileName: string) => void;
  versions?: DatasetVersion[];
  activeVersionId?: string;
  onVersionSelect?: (id: string) => void;
  onDeleteVersion?: (id: string) => void;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({ 
    onDataLoaded, 
    versions = [], 
    activeVersionId, 
    onVersionSelect, 
    onDeleteVersion 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Robust Stateful CSV Parser
  const parseCSV = (text: string, onProgress: (percentage: number) => void): Promise<DeveloperRecord[]> => {
      return new Promise((resolve, reject) => {
          setTimeout(() => {
              try {
                  // 1. Handle BOM
                  let content = text;
                  if (content.charCodeAt(0) === 0xFEFF) {
                      content = content.slice(1);
                  }

                  const lines = content.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
                  if (lines.length < 2) throw new Error("File is empty or missing data rows.");

                  // 2. Detect Delimiter (Comma, Semicolon, Tab)
                  const firstLine = lines[0];
                  const commaCount = (firstLine.match(/,/g) || []).length;
                  const semiCount = (firstLine.match(/;/g) || []).length;
                  const tabCount = (firstLine.match(/\t/g) || []).length;
                  
                  let delimiter = ',';
                  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
                  if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

                  console.log(`Detected delimiter: '${delimiter}'`);

                  // 3. Split Function
                  const splitLine = (line: string): string[] => {
                      const result: string[] = [];
                      let current = '';
                      let inQuotes = false;
                      
                      for (let i = 0; i < line.length; i++) {
                          const char = line[i];
                          if (char === '"' && line[i+1] === '"') {
                              current += '"';
                              i++;
                              continue;
                          }
                          
                          if (char === '"') {
                              inQuotes = !inQuotes;
                          } else if (char === delimiter && !inQuotes) {
                              result.push(current.trim());
                              current = '';
                          } else {
                              current += char;
                          }
                      }
                      result.push(current.trim());
                      
                      return result.map(val => {
                          if (val.startsWith('"') && val.endsWith('"')) {
                              return val.slice(1, -1);
                          }
                          return val;
                      });
                  };

                  // 4. Parse Headers
                  const headers = splitLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, ' ').trim());
                  
                  // 5. Map Columns per PRD Section 3.1
                  const findIndex = (candidates: string[]) => {
                      const normalizedCandidates = candidates.map(c => c.toLowerCase());
                      let idx = headers.findIndex(h => normalizedCandidates.includes(h));
                      if (idx === -1) {
                          idx = headers.findIndex(h => normalizedCandidates.some(c => h.includes(c) || c.includes(h)));
                      }
                      return idx;
                  };

                  const map = {
                      email: findIndex(['email']),
                      firstName: findIndex(['first name', 'firstname']),
                      lastName: findIndex(['last name', 'lastname']),
                      phone: findIndex(['phone number', 'phone']),
                      country: findIndex(['country']),
                      // Expanded keywords for membership
                      membership: findIndex(['accepted membership', 'membership', 'is member', 'member status', 'membership status']),
                      marketing: findIndex(['accepted marketing', 'marketing']),
                      wallet: findIndex(['wallet address', 'wallet']),
                      // Explicit mapping: Code -> partnerCode, Partner -> partnerName
                      partnerCode: findIndex(['code', 'partner code']), 
                      partnerName: findIndex(['partner', 'community', 'partner name']),
                      percentage: findIndex(['percentage completed', 'percentage']),
                      createdAt: findIndex(['created at', 'start date']),
                      completedAt: findIndex(['completed at', 'completion date']),
                      finalScore: findIndex(['final score']),
                      finalGrade: findIndex(['final grade', 'grade']),
                      caStatus: findIndex(['ca status'])
                  };

                  // Fallback Logic: If Code is missing but Partner Name exists, use Name as Code (and vice versa)
                  if (map.partnerCode === -1 && map.partnerName !== -1) {
                      map.partnerCode = map.partnerName;
                  }
                  if (map.partnerName === -1 && map.partnerCode !== -1) {
                      map.partnerName = map.partnerCode;
                  }

                  if (map.email === -1) {
                       if (map.partnerCode !== -1 && headers.length < 5) {
                          throw new Error("It looks like you uploaded a Community Registry file. Use Admin Settings > Registry.");
                      }
                      throw new Error(`Column 'Email' not found. Found: ${headers.join(', ')}`);
                  }

                  // 6. Process Rows
                  const parsedData: DeveloperRecord[] = [];
                  const totalRows = lines.length - 1;
                  const CHUNK_SIZE = 5000; 
                  const batchId = `batch_${Date.now()}`;

                  let currentIndex = 1;

                  const processBatch = () => {
                      const end = Math.min(currentIndex + CHUNK_SIZE, lines.length);
                      
                      for (let i = currentIndex; i < end; i++) {
                          const cols = splitLine(lines[i]);
                          if (cols.length < 2) continue; 

                          const getVal = (idx: number) => (idx !== -1 && cols[idx] !== undefined ? cols[idx] : '');

                          // ROBUST BOOLEAN PARSING (Supports French: Vrai/Oui)
                          const parseBool = (str: string) => {
                              if (!str) return false;
                              const s = str.trim().toLowerCase();
                              // Capture variants: "vrai", "oui", "active", "member", "checked", "joined", "1", "true", "yes"
                              return ['true', 'yes', '1', 'y', 'on', 'active', 'member', 'checked', 'joined', 'vrai', 'oui'].includes(s);
                          };
                          
                          const parseDate = (str: string) => {
                              if (!str) return '';
                              if (str.includes('/')) {
                                  const parts = str.split(/[\/\s]/);
                                  const p0 = parseInt(parts[0]);
                                  if (!isNaN(p0) && p0 > 12) {
                                      // DD/MM/YYYY
                                      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).toISOString();
                                  }
                              }
                              const d = new Date(str);
                              return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
                          };

                          const parseIntSafe = (str: string) => {
                              if (!str) return 0;
                              const clean = str.replace(/[^0-9.-]/g, '');
                              const v = parseFloat(clean);
                              return isNaN(v) ? 0 : Math.round(v);
                          };

                          const parseGrade = (str: string): 'Pass' | 'Fail' | 'Pending' => {
                              if (!str) return 'Pending';
                              const s = str.trim().toLowerCase();
                              if (s === 'pass' || s === 'passed' || s.includes('pass') || s === 'réussi' || s === 'reussi' || s === 'succès') return 'Pass';
                              if (s === 'fail' || s === 'failed' || s === 'échoué' || s === 'echoue') return 'Fail';
                              return 'Pending';
                          };

                          let pCode = getVal(map.partnerCode);
                          // Clean up if code looks like "HEDERA-FR - Paris"
                          if (pCode && pCode.includes(' - ')) pCode = pCode.split(' - ')[0];

                          let pName = getVal(map.partnerName);
                          // If Name is empty but Code exists, fallback
                          if (!pName && pCode) pName = pCode;

                          parsedData.push({
                              id: `row_${i}_${Date.now()}`,
                              email: getVal(map.email) || `unknown_${i}@noemail.com`,
                              firstName: getVal(map.firstName),
                              lastName: getVal(map.lastName),
                              phone: getVal(map.phone),
                              country: getVal(map.country) || 'Unknown',
                              acceptedMembership: parseBool(getVal(map.membership)),
                              acceptedMarketing: parseBool(getVal(map.marketing)),
                              walletAddress: getVal(map.wallet),
                              partnerCode: pCode || 'UNKNOWN',
                              partnerName: pName || 'UNKNOWN',
                              percentageCompleted: parseIntSafe(getVal(map.percentage)),
                              createdAt: parseDate(getVal(map.createdAt)),
                              completedAt: getVal(map.completedAt) ? parseDate(getVal(map.completedAt)) : null,
                              finalScore: parseIntSafe(getVal(map.finalScore)),
                              finalGrade: parseGrade(getVal(map.finalGrade)),
                              caStatus: getVal(map.caStatus),
                              computed_riskFlags: [], // Populated in dataProcessing
                              ingestionBatchId: batchId
                          });
                      }

                      currentIndex = end;
                      onProgress(Math.round(((currentIndex - 1) / totalRows) * 100));

                      if (currentIndex < lines.length) {
                          setTimeout(processBatch, 0);
                      } else {
                          resolve(parsedData);
                      }
                  };

                  processBatch();

              } catch (err: any) {
                  reject(err);
              }
          }, 100);
      });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fName = file.name;
    setFileName(fName);
    setIsProcessing(true);
    setProgress(0);
    setLoadedCount(0);
    setErrorMsg(null);
    setStatusMessage('Reading file...');

    const reader = new FileReader();
    
    reader.onload = async (event) => {
        const text = event.target?.result as string;
        if (!text) {
            setErrorMsg("Failed to read file content.");
            setIsProcessing(false);
            return;
        }

        setStatusMessage('Parsing CSV structure...');
        
        try {
            const rawData = await parseCSV(text, (pct) => setProgress(pct));
            
            setStatusMessage('Running Logic (Fraud Detection & Time Fixes)...');
            
            setTimeout(() => {
                const processed = processIngestedData(rawData);
                setLoadedCount(processed.length);
                onDataLoaded(processed, fName); 
                setIsProcessing(false);
                setStatusMessage('Complete');
            }, 50);

        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || "Unknown parsing error");
            setIsProcessing(false);
        }
    };

    reader.onerror = () => {
        setErrorMsg('Error reading file from disk.');
        setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  const triggerUpload = () => {
      fileInputRef.current?.value ? (fileInputRef.current.value = '') : null;
      fileInputRef.current?.click();
  }

  return (
    <div className="space-y-6">
        <div className="w-full bg-white dark:bg-[#1c1b22] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="p-6 flex flex-col items-center justify-center text-center space-y-4">
            
            <div className={`p-4 rounded-full transition-colors ${isProcessing ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : errorMsg ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400'}`}>
            {isProcessing ? <Loader2 className="w-8 h-8 animate-spin" /> : errorMsg ? <AlertTriangle className="w-8 h-8" /> : <FileSpreadsheet className="w-8 h-8" />}
            </div>

            <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isProcessing ? 'Processing Dataset...' : 'Ingest Developer Data'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md mx-auto leading-relaxed">
                {errorMsg ? (
                    <span className="text-red-600 dark:text-red-400 font-medium block mt-1">{errorMsg}</span>
                ) : isProcessing ? (
                    statusMessage
                ) : (
                    "Upload the Master CSV (Max 100MB). Matches 'Email', 'Code', 'Partner', 'Wallet' and auto-corrects timestamps."
                )}
            </p>
            </div>

            {isProcessing && (
                <div className="w-full max-w-md space-y-2">
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                        <span>Progress</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div 
                            className="bg-[#2a00ff] h-2.5 rounded-full transition-all duration-200 ease-out" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            )}
            
            {!isProcessing && (
            <div className="flex gap-4">
                <button 
                    onClick={triggerUpload}
                    className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 flex items-center gap-2 shadow-lg shadow-slate-900/20 dark:shadow-white/10 transition-all hover:scale-105"
                >
                    <Upload className="w-4 h-4" />
                    {fileName ? 'Upload Different File' : 'Select CSV File'}
                </button>
            </div>
            )}

            {fileName && !isProcessing && !errorMsg && (
                <div className="mt-2 flex items-center gap-2 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 px-4 py-2 rounded-lg text-sm font-medium border border-green-100 dark:border-green-800 animate-fade-in">
                    <CheckCircle className="w-4 h-4" />
                    {loadedCount.toLocaleString()} records loaded successfully.
                </div>
            )}
        </div>
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".csv,.txt" 
            onChange={handleFileChange}
        />
        </div>

        {/* VERSION HISTORY */}
        {versions.length > 0 && (
             <div className="bg-white dark:bg-[#1c1b22] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden animate-fade-in">
                 <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex items-center gap-2">
                     <History className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                     <h3 className="font-bold text-slate-800 dark:text-white">Dataset Version History</h3>
                 </div>
                 <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
                         <tr>
                             <th className="px-6 py-3">File Name</th>
                             <th className="px-6 py-3">Upload Date</th>
                             <th className="px-6 py-3">Records</th>
                             <th className="px-6 py-3 text-right">Actions</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                         {versions.map(v => (
                             <tr key={v.id} className={v.id === activeVersionId ? 'bg-blue-50 dark:bg-[#2a00ff]/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}>
                                 <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                     {v.id === activeVersionId && <CheckCircle className="w-4 h-4 text-[#2a00ff]" />}
                                     {v.fileName}
                                 </td>
                                 <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{new Date(v.uploadDate).toLocaleString()}</td>
                                 <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">{v.recordCount.toLocaleString()}</td>
                                 <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                                     {v.id !== activeVersionId && onVersionSelect && (
                                         <button 
                                            onClick={() => onVersionSelect(v.id)}
                                            className="text-[#2a00ff] hover:text-blue-500 font-bold text-xs flex items-center gap-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                         >
                                             <Database className="w-3 h-3" /> Switch
                                         </button>
                                     )}
                                     {onDeleteVersion && (
                                         <button 
                                            onClick={() => onDeleteVersion(v.id)}
                                            className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                         >
                                             <Trash2 className="w-4 h-4" />
                                         </button>
                                     )}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        )}
    </div>
  );
};
