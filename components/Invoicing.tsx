import React, { useState, useMemo } from 'react';
import { Invoice, InvoiceStatus, DeveloperRecord, CommunityAgreement, PaymentModel, BillingCycle, Currency, PaymentMethod, InvoiceLineItem, AdminUser, UserRole } from '../types';
import { Plus, Edit3, Trash2, Wallet, CreditCard, FileText, Check, AlertCircle, Save, Users, Award, TrendingUp, DollarSign, Calendar, Upload, File, X, Shield, Search, ChevronDown } from 'lucide-react';

interface InvoicingProps {
    data: DeveloperRecord[];
    admins: AdminUser[];
    invoices: Invoice[];
    setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
    agreements: CommunityAgreement[];
    setAgreements: React.Dispatch<React.SetStateAction<CommunityAgreement[]>>;
}

export const Invoicing: React.FC<InvoicingProps> = ({ data, admins, invoices, setInvoices, agreements, setAgreements }) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'partners'>('invoices');
  
  // Invoice State
  const [isEditingInvoice, setIsEditingInvoice] = useState<string | null>(null);
  const [filterCommunity, setFilterCommunity] = useState('');
  const [billingMonth, setBillingMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // Partner View State
  const [selectedPartnerCode, setSelectedPartnerCode] = useState<string | null>(null);
  const [editingAgreement, setEditingAgreement] = useState<string | null>(null);
  const [tempAgreement, setTempAgreement] = useState<Partial<CommunityAgreement>>({});
  const [tempDoc, setTempDoc] = useState('');
  
  // Search states for custom dropdown
  const [adminSearch, setAdminSearch] = useState('');
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);

  const partners = useMemo(() => {
      const unique = new Set(data.map(d => d.partnerCode).filter(p => p && p !== 'UNKNOWN'));
      return Array.from(unique).sort();
  }, [data]);

  // Helper to get active agreement for logic
  const getActiveAgreement = (code: string) => {
      return agreements.find(a => a.partnerCode === code && a.isActive);
  };

  const handleGenerateDraft = () => {
      if (!filterCommunity) return;
      const agr = getActiveAgreement(filterCommunity);
      const certsInMonth = data.filter(d => d.partnerCode === filterCommunity && d.finalGrade === 'Pass' && d.completedAt && d.completedAt.startsWith(billingMonth)).length;

      const items: InvoiceLineItem[] = [];
      if (agr && agr.paymentModel === 'Fixed_Recurring') {
           items.push({ id: `i_${Date.now()}`, description: `Fixed Fee (${billingMonth})`, quantity: 1, unitPrice: agr.unitPrice, total: agr.unitPrice });
      } else {
           items.push({ id: `i_${Date.now()}`, description: `Certifications (${billingMonth})`, quantity: certsInMonth, unitPrice: agr?.unitPrice || 100, total: certsInMonth * (agr?.unitPrice || 100) });
      }

      const subtotal = items.reduce((acc, item) => acc + item.total, 0);
      const newInvoice: Invoice = {
          id: `INV-${Date.now()}`,
          invoiceNumber: `INV-${filterCommunity.substring(0,3)}-${billingMonth.replace('-','')}`,
          partnerCode: filterCommunity,
          billingPeriod: billingMonth,
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
          currency: agr?.currency || 'USD',
          items, subtotal, taxRate: 0, taxAmount: 0, totalAmount: subtotal,
          status: InvoiceStatus.DRAFT, notes: '', publicMemo: `Services for ${billingMonth}`,
      };
      setInvoices([newInvoice, ...invoices]);
      setIsEditingInvoice(newInvoice.id);
  };

  const handleSaveAgreement = () => {
      if (!tempAgreement.partnerCode) return;
      
      const newAgr: CommunityAgreement = {
          id: tempAgreement.id || `agr_${Date.now()}`,
          partnerCode: tempAgreement.partnerCode,
          partnerName: tempAgreement.partnerName || tempAgreement.partnerCode,
          contactName: tempAgreement.contactName || '',
          contactEmail: tempAgreement.contactEmail || '',
          assignedAdminId: tempAgreement.assignedAdminId,
          billingAddress: tempAgreement.billingAddress || '',
          startDate: tempAgreement.startDate || new Date().toISOString().split('T')[0],
          endDate: tempAgreement.endDate || '',
          isActive: tempAgreement.isActive !== undefined ? tempAgreement.isActive : true,
          paymentModel: tempAgreement.paymentModel || 'Per_Certification',
          unitPrice: Number(tempAgreement.unitPrice) || 0,
          currency: tempAgreement.currency || 'USD',
          billingCycle: tempAgreement.billingCycle || 'Monthly',
          preferredMethod: tempAgreement.preferredMethod || 'Bank_Transfer',
          paymentTerms: tempAgreement.paymentTerms || 'Net 30',
          description: tempAgreement.description || '',
          documents: tempAgreement.documents || [],
          lastUpdated: new Date().toISOString()
      };

      if (editingAgreement && editingAgreement !== 'new') {
          setAgreements(agreements.map(a => a.id === editingAgreement ? newAgr : a));
      } else {
          setAgreements([...agreements, newAgr]);
      }
      setEditingAgreement(null);
      setTempAgreement({});
  };

  const startEditAgreement = (agr?: CommunityAgreement, code?: string) => {
      if (agr) {
          setEditingAgreement(agr.id);
          setTempAgreement({ ...agr });
      } else {
          setEditingAgreement('new');
          setTempAgreement({ 
            partnerCode: code || partners[0], 
            partnerName: code || partners[0],
            currency: 'USD', 
            paymentModel: 'Per_Certification', 
            unitPrice: 0,
            isActive: true,
            documents: []
          });
      }
      setAdminSearch('');
      setIsAdminDropdownOpen(false);
  };

  const handleAddDocument = () => {
      if(tempDoc.trim()) {
          setTempAgreement({ ...tempAgreement, documents: [...(tempAgreement.documents || []), tempDoc] });
          setTempDoc('');
      }
  }

  const getPartnerStats = (code: string) => {
      const communityData = data.filter(d => d.partnerCode === code);
      const registered = communityData.length;
      const certified = communityData.filter(d => d.finalGrade === 'Pass').length;
      const rate = registered > 0 ? (certified / registered) * 100 : 0;
      return { registered, certified, rate };
  };

  // Logic to sort admins: Explicitly assigned first, then Global Super Admins
  const getEligibleAdmins = (partnerCode?: string) => {
      if (!partnerCode) return admins;
      const eligible = [...admins].sort((a, b) => {
          const aAssigned = a.assignedCodes.includes(partnerCode);
          const bAssigned = b.assignedCodes.includes(partnerCode);
          if (aAssigned && !bAssigned) return -1;
          if (!aAssigned && bAssigned) return 1;
          return 0;
      }).filter(a => a.assignedCodes.includes(partnerCode) || a.role === UserRole.SUPER_ADMIN);
      
      if (!adminSearch) return eligible;
      return eligible.filter(a => a.name.toLowerCase().includes(adminSearch.toLowerCase()) || a.email.toLowerCase().includes(adminSearch.toLowerCase()));
  };

  const selectAdmin = (admin: AdminUser) => {
      setTempAgreement({...tempAgreement, assignedAdminId: admin.id});
      setIsAdminDropdownOpen(false);
  };

  // Invoice Editor Component
  const InvoiceEditor = ({ invoiceId }: { invoiceId: string }) => {
      const invIndex = invoices.findIndex(i => i.id === invoiceId);
      if (invIndex === -1) return null;
      const inv = invoices[invIndex];

      const updateInvoice = (updates: Partial<Invoice>) => {
          const newInvoices = [...invoices];
          const items = updates.items || inv.items;
          const taxRate = updates.taxRate !== undefined ? updates.taxRate : inv.taxRate;
          const subtotal = items.reduce((acc, i) => acc + i.total, 0);
          const taxAmount = subtotal * (taxRate / 100);
          newInvoices[invIndex] = { ...inv, ...updates, items, subtotal, taxAmount, totalAmount: subtotal + taxAmount };
          setInvoices(newInvoices);
      };

      const updateLineItem = (id: string, field: keyof InvoiceLineItem, val: any) => {
          const newItems = inv.items.map(i => i.id === id ? { ...i, [field]: val, total: field === 'quantity' || field === 'unitPrice' ? (field === 'quantity' ? Number(val) : i.quantity) * (field === 'unitPrice' ? Number(val) : i.unitPrice) : i.total } : i);
          updateInvoice({ items: newItems });
      };

      return (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
                  {/* Header */}
                  <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
                      <div>
                          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Invoice {inv.invoiceNumber}</h2>
                          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Partner: <span className="font-semibold text-[#2a00ff] dark:text-cyan-400">{inv.partnerCode}</span></p>
                      </div>
                      <div className="flex gap-3">
                           <button onClick={() => setIsEditingInvoice(null)} className="px-5 py-2 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors">Close</button>
                           <button onClick={() => { updateInvoice({ status: InvoiceStatus.SENT }); setIsEditingInvoice(null); }} className="px-6 py-2 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 shadow-lg shadow-cyan-900/20 transition-all">Save & Send</button>
                      </div>
                  </div>
                  <div className="p-8 space-y-8">
                      <div className="grid grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-white/5">
                          {['issueDate', 'dueDate'].map(f => (
                              <div key={f}>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{f}</label>
                                  <input type="date" value={(inv as any)[f]} onChange={e => updateInvoice({ [f]: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-cyan-500 outline-none shadow-sm" />
                              </div>
                          ))}
                          <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Currency</label>
                              <select value={inv.currency} onChange={e => updateInvoice({ currency: e.target.value as Currency })} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white font-medium outline-none shadow-sm"><option>USD</option><option>HBAR</option><option>USDC</option><option>EUR</option></select>
                          </div>
                      </div>
                      
                      {/* Items Table */}
                      <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Line Items</h4>
                          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                              <table className="w-full text-sm text-left">
                                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700"><tr><th className="px-4 py-3">Description</th><th className="px-4 py-3 w-24">Qty</th><th className="px-4 py-3 w-32 text-right">Price</th><th className="px-4 py-3 w-32 text-right">Total</th><th className="w-10"></th></tr></thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">{inv.items.map(item => (
                                      <tr key={item.id} className="bg-white dark:bg-slate-900">
                                          <td className="p-3"><input value={item.description} onChange={e => updateLineItem(item.id, 'description', e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white focus:border-cyan-500 outline-none" /></td>
                                          <td className="p-3"><input type="number" value={item.quantity} onChange={e => updateLineItem(item.id, 'quantity', e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-center text-slate-900 dark:text-white focus:border-cyan-500 outline-none" /></td>
                                          <td className="p-3"><input type="number" value={item.unitPrice} onChange={e => updateLineItem(item.id, 'unitPrice', e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-right text-slate-900 dark:text-white focus:border-cyan-500 outline-none" /></td>
                                          <td className="p-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{item.total.toLocaleString()}</td>
                                          <td className="p-3 text-center"><button onClick={() => updateInvoice({ items: inv.items.filter(i => i.id !== item.id) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                                      </tr>
                                  ))}</tbody>
                              </table>
                              <button onClick={() => updateInvoice({ items: [...inv.items, { id: `i_${Date.now()}`, description: '', quantity: 1, unitPrice: 0, total: 0 }] })} className="w-full py-3 text-center text-sm font-bold text-cyan-600 dark:text-cyan-400 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-t border-slate-200 dark:border-slate-700">+ Add Line Item</button>
                          </div>
                      </div>

                      {/* Totals */}
                      <div className="flex justify-end">
                          <div className="w-64 space-y-3">
                              <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400"><span>Subtotal</span><span>{inv.subtotal.toLocaleString()} {inv.currency}</span></div>
                              <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400"><span>Tax Rate (%)</span><input type="number" value={inv.taxRate} onChange={e => updateInvoice({ taxRate: Number(e.target.value) })} className="w-16 p-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-center text-slate-900 dark:text-white" /></div>
                              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between text-xl font-bold text-slate-900 dark:text-white"><span>Total</span><span className="text-[#2a00ff] dark:text-cyan-400 text-shadow-glow">{inv.totalAmount.toLocaleString()} {inv.currency}</span></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-8 fade-in-up">
      <div className="glass-panel p-6 rounded-2xl flex flex-wrap gap-4 items-center bg-white dark:bg-[#1c1b22]">
         <div className="flex border-r border-slate-200 dark:border-white/10 pr-4 gap-2">
            <button onClick={() => setActiveTab('invoices')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'invoices' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>Invoices</button>
            <button onClick={() => { setActiveTab('partners'); setSelectedPartnerCode(null); }} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'partners' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>Partners</button>
         </div>
         {activeTab === 'invoices' && (
             <>
                 <input type="month" value={billingMonth} onChange={e => setBillingMonth(e.target.value)} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500 shadow-sm" />
                 <select value={filterCommunity} onChange={e => setFilterCommunity(e.target.value)} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500 min-w-[200px] shadow-sm">
                     <option value="">Filter by Partner...</option>
                     {partners.map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
                 <button onClick={handleGenerateDraft} disabled={!filterCommunity} className="ml-auto px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 disabled:opacity-50 flex items-center gap-2 transition-all hover:-translate-y-0.5"><Plus className="w-4 h-4" /> New Invoice</button>
             </>
         )}
      </div>

      {activeTab === 'invoices' && (
          <div className="glass-card rounded-2xl overflow-hidden bg-white dark:bg-transparent border border-slate-200 dark:border-white/5">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-white/5"><tr><th className="px-6 py-4">Invoice #</th><th className="px-6 py-4">Partner</th><th className="px-6 py-4">Date</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Edit</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">{invoices.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-slate-500">No invoices found. Generate a draft above.</td></tr> : invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"><td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400">{inv.invoiceNumber}</td><td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{inv.partnerCode}</td><td className="px-6 py-4 text-slate-500 dark:text-slate-400">{inv.issueDate}</td><td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">{inv.totalAmount.toLocaleString()} {inv.currency}</td><td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-600 dark:text-slate-300">{inv.status}</span></td><td className="px-6 py-4 text-right"><button onClick={() => setIsEditingInvoice(inv.id)} className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:border-cyan-500 text-slate-400 hover:text-cyan-500 transition-colors"><Edit3 className="w-4 h-4" /></button></td></tr>
                  ))}</tbody>
              </table>
          </div>
      )}

      {activeTab === 'partners' && (
          <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-220px)]">
              
              {/* LEFT: PARTNER LIST */}
              <div className="w-full lg:w-1/3 glass-card rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-white/5 font-bold text-slate-700 dark:text-slate-200">
                      Active Communities ({partners.length})
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {partners.map(code => {
                          const stats = getPartnerStats(code);
                          const isActive = selectedPartnerCode === code;
                          const activeAgr = agreements.filter(a => a.partnerCode === code && a.isActive).length;

                          return (
                              <button 
                                key={code} 
                                onClick={() => setSelectedPartnerCode(code)}
                                className={`w-full text-left p-3 rounded-lg transition-all border ${isActive ? 'bg-indigo-50 dark:bg-[#2a00ff]/10 border-indigo-200 dark:border-[#2a00ff]/30' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}
                              >
                                  <div className="flex justify-between items-center mb-1">
                                      <span className={`font-bold text-sm ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{code}</span>
                                      {activeAgr > 0 && <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded">Active</span>}
                                  </div>
                                  <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                                      <span>{stats.registered} Devs</span>
                                      <span>•</span>
                                      <span>{stats.certified} Certs</span>
                                  </div>
                              </button>
                          );
                      })}
                  </div>
              </div>

              {/* RIGHT: DETAILS & AGREEMENTS */}
              <div className="w-full lg:w-2/3 space-y-6 overflow-y-auto pr-1">
                  {selectedPartnerCode ? (
                      <>
                          {/* Agreements List */}
                          <div className="glass-card p-6 rounded-xl border border-slate-200 dark:border-white/5">
                              <div className="flex justify-between items-center mb-6">
                                  <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        Agreements & Contracts
                                        <span className="text-xs font-normal px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">{selectedPartnerCode}</span>
                                    </h3>
                                  </div>
                                  <button onClick={() => startEditAgreement(undefined, selectedPartnerCode)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 flex items-center gap-2 shadow-md">
                                      <Plus className="w-3 h-3" /> Add New Agreement
                                  </button>
                              </div>

                              <div className="space-y-4">
                                  {agreements.filter(a => a.partnerCode === selectedPartnerCode).map(agr => {
                                      const admin = admins.find(ad => ad.id === agr.assignedAdminId);
                                      return (
                                        <div key={agr.id} className={`p-4 rounded-xl border ${agr.isActive ? 'bg-slate-50 dark:bg-slate-800/40 border-indigo-200 dark:border-indigo-900/50' : 'bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 opacity-70'}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-200">{agr.description || 'General Agreement'}</h4>
                                                        {agr.isActive ? 
                                                            <span className="text-[10px] font-bold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">Active</span> : 
                                                            <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded">Expired</span>
                                                        }
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {agr.startDate} → {agr.endDate || 'Ongoing'}</span>
                                                        {admin && <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold"><Shield className="w-3 h-3" /> {admin.name}</span>}
                                                    </div>
                                                </div>
                                                <button onClick={() => startEditAgreement(agr, selectedPartnerCode)} className="text-slate-400 hover:text-indigo-500 p-1"><Edit3 className="w-4 h-4" /></button>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-3 border-t border-slate-200 dark:border-white/5">
                                                <div>
                                                    <div className="text-slate-400 mb-0.5">Model</div>
                                                    <div className="font-medium text-slate-700 dark:text-slate-300">{agr.paymentModel.replace('_', ' ')}</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-400 mb-0.5">Price</div>
                                                    <div className="font-medium text-indigo-600 dark:text-indigo-400">{agr.unitPrice} {agr.currency}</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-400 mb-0.5">Payment</div>
                                                    <div className="font-medium text-slate-700 dark:text-slate-300">{agr.billingCycle}</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-400 mb-0.5">Documents</div>
                                                    <div className="font-medium text-slate-700 dark:text-slate-300 flex flex-wrap gap-1">
                                                        {agr.documents && agr.documents.length > 0 ? agr.documents.map((d,i) => (
                                                            <span key={i} className="underline cursor-pointer hover:text-indigo-500 truncate max-w-[80px] block">{d}</span>
                                                        )) : '-'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                      )
                                  })}
                                  {agreements.filter(a => a.partnerCode === selectedPartnerCode).length === 0 && (
                                      <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                          No agreements recorded for this community.
                                      </div>
                                  )}
                              </div>
                          </div>
                      </>
                  ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                          Select a community from the list to manage agreements.
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* AGREEMENT EDITOR MODAL */}
      {editingAgreement && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {editingAgreement === 'new' ? 'Create Partner Agreement' : 'Edit Agreement'}
                     </h3>
                     <button onClick={() => setEditingAgreement(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      {/* General Info */}
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Partner Code</label>
                              <input 
                                disabled 
                                value={tempAgreement.partnerCode || ''} 
                                className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-500"
                              />
                          </div>
                          
                          {/* Custom Searchable Admin Dropdown */}
                          <div className="relative">
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Responsible Admin</label>
                              <button 
                                type="button"
                                onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
                                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500 flex justify-between items-center"
                              >
                                  {admins.find(a => a.id === tempAgreement.assignedAdminId)?.name || "Select Responsible Person..."}
                                  <ChevronDown className="w-4 h-4 text-slate-400" />
                              </button>
                              
                              {isAdminDropdownOpen && (
                                  <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-60 overflow-hidden flex flex-col">
                                      <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                                          <div className="relative">
                                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                              <input 
                                                  autoFocus
                                                  placeholder="Search admin..."
                                                  value={adminSearch}
                                                  onChange={e => setAdminSearch(e.target.value)}
                                                  className="w-full pl-7 p-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded border border-transparent focus:border-cyan-500 outline-none"
                                              />
                                          </div>
                                      </div>
                                      <div className="overflow-y-auto flex-1">
                                          {getEligibleAdmins(tempAgreement.partnerCode).map(a => {
                                              const isAssigned = a.assignedCodes.includes(tempAgreement.partnerCode || '') || a.role === UserRole.SUPER_ADMIN;
                                              if (!isAssigned) return null;
                                              return (
                                                  <button
                                                      key={a.id}
                                                      onClick={() => selectAdmin(a)}
                                                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between group"
                                                  >
                                                      <div>
                                                          <div className="font-medium text-slate-900 dark:text-white">{a.name}</div>
                                                          <div className="text-xs text-slate-500">{a.email}</div>
                                                      </div>
                                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${a.role === UserRole.SUPER_ADMIN ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'}`}>
                                                          {a.role === UserRole.SUPER_ADMIN ? 'Global' : 'Assigned'}
                                                      </span>
                                                  </button>
                                              );
                                          })}
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Description */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Agreement Description / Title</label>
                          <input 
                              value={tempAgreement.description || ''}
                              onChange={e => setTempAgreement({...tempAgreement, description: e.target.value})}
                              placeholder="e.g. 2025 Strategic Growth Contract"
                              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                          />
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-3 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Start Date</label>
                              <input type="date" value={tempAgreement.startDate || ''} onChange={e => setTempAgreement({...tempAgreement, startDate: e.target.value})} className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">End Date (Optional)</label>
                              <input type="date" value={tempAgreement.endDate || ''} onChange={e => setTempAgreement({...tempAgreement, endDate: e.target.value})} className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500" />
                          </div>
                          <div className="flex items-end pb-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={tempAgreement.isActive} onChange={e => setTempAgreement({...tempAgreement, isActive: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Agreement Active</span>
                              </label>
                          </div>
                      </div>

                      {/* Financials */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Financial Terms</h4>
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Payment Model</label>
                                <select value={tempAgreement.paymentModel} onChange={e => setTempAgreement({...tempAgreement, paymentModel: e.target.value as any})} className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500">
                                    <option value="Per_Certification">Per Certification</option>
                                    <option value="Fixed_Recurring">Fixed Recurring</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Amount</label>
                                <input type="number" value={tempAgreement.unitPrice} onChange={e => setTempAgreement({...tempAgreement, unitPrice: Number(e.target.value)})} className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Currency</label>
                                <select value={tempAgreement.currency} onChange={e => setTempAgreement({...tempAgreement, currency: e.target.value as any})} className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"><option>USD</option><option>HBAR</option><option>USDC</option><option>EUR</option></select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Billing Contact Email</label>
                                  <input value={tempAgreement.contactEmail || ''} onChange={e => setTempAgreement({...tempAgreement,contactEmail: e.target.value})} className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500" />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Billing Cycle</label>
                                  <select value={tempAgreement.billingCycle} onChange={e => setTempAgreement({...tempAgreement, billingCycle: e.target.value as any})} className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500">
                                      <option value="Monthly">Monthly</option>
                                      <option value="Quarterly">Quarterly</option>
                                  </select>
                              </div>
                          </div>
                      </div>

                      {/* Documents */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Attached Documents</label>
                          <div className="flex gap-2">
                              <input 
                                  value={tempDoc} 
                                  onChange={e => setTempDoc(e.target.value)} 
                                  placeholder="Document Name or URL..."
                                  className="flex-1 p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                              />
                              <button onClick={handleAddDocument} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600">Attach</button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                              {tempAgreement.documents?.map((d, i) => (
                                  <div key={i} className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                      <File className="w-3 h-3" /> {d} 
                                      <button onClick={() => setTempAgreement({...tempAgreement, documents: tempAgreement.documents?.filter((_, idx) => idx !== i)})} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>
                                  </div>
                              ))}
                          </div>
                      </div>

                  </div>
                  <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                      <button onClick={() => setEditingAgreement(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">Cancel</button>
                      <button onClick={handleSaveAgreement} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-colors">Save Agreement</button>
                  </div>
              </div>
          </div>
      )}

      {/* Modals */}
      {isEditingInvoice && <InvoiceEditor invoiceId={isEditingInvoice} />}
    </div>
  );
};