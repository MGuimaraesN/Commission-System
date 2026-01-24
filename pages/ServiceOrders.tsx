import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Trash2, Edit2, AlertCircle, Download, Filter, X, CheckCircle, DollarSign, CheckSquare, Square, Copy, History, CreditCard, Clock, FileText } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { createOrder, getOrders, getSettings, updateOrder, deleteOrder, getBrands, updateOrderStatus, bulkUpdateOrderStatus, bulkDeleteOrders, duplicateOrder } from '../services/dataService';
import { ServiceOrder, Brand, AuditLogEntry } from '../types';
import { useTranslation } from '../services/i18n';

export const ServiceOrders: React.FC = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ServiceOrder[]>([]);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('PENDING');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  
  const [brandsList, setBrandsList] = useState<Brand[]>([]);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // UI State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<AuditLogEntry[]>([]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, id: string | null, isBulk: boolean }>({
    isOpen: false,
    id: null,
    isBulk: false
  });

  // Refs for shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    osNumber: '',
    entryDate: new Date().toISOString().split('T')[0],
    customerName: 'Consumidor Padrão',
    brand: '',
    serviceValue: '',
    paymentMethod: ''
  });

  const settings = getSettings();
  const estimatedCommission = formData.serviceValue 
    ? (parseFloat(formData.serviceValue) * settings.fixedCommissionPercentage) / 100 
    : 0;

  useEffect(() => {
    refreshData();
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
              if (e.key === 'Escape') {
                  (e.target as HTMLElement).blur();
                  setIsFormOpen(false);
              }
              return; 
          }

          switch(e.key.toLowerCase()) {
              case 'n':
                  e.preventDefault();
                  openNewForm();
                  break;
              case 'f':
                  e.preventDefault();
                  searchInputRef.current?.focus();
                  break;
              case 'p':
                  if (selectedIds.size > 0) {
                      e.preventDefault();
                      handleBulkPay();
                  }
                  break;
              case 'escape':
                  setSelectedIds(new Set());
                  setIsFormOpen(false);
                  setIsHistoryOpen(false);
                  setDeleteConfirm({ isOpen: false, id: null, isBulk: false });
                  break;
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds]);

  // Update selection when filtered list changes to avoid selecting invisible items
  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter, brandFilter, searchTerm]);

  useEffect(() => {
    let result = orders;

    // Search term
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(o => 
        o.customerName.toLowerCase().includes(lowerTerm) ||
        o.brand.toLowerCase().includes(lowerTerm) ||
        o.osNumber.toString().includes(lowerTerm)
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(o => o.status === statusFilter);
    }

    // Brand filter
    if (brandFilter !== 'ALL') {
      result = result.filter(o => o.brand === brandFilter);
    }

    setFilteredOrders(result);
  }, [searchTerm, statusFilter, brandFilter, orders]);

  const refreshData = () => {
    const data = getOrders();
    data.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
    setOrders(data);
    setBrandsList(getBrands());
    setSelectedIds(new Set()); 
  };

  const handleExportCSV = () => {
    const headers = [
      t('orders.date'), "Time", t('orders.osNumber'), t('orders.customer'), 
      t('orders.brand'), t('orders.value'), "Commission Value", "Status", 
      "Paid At", t('orders.paymentMethod'), "Period"
    ];
    
    const rows = filteredOrders.map(order => {
        const formatBRL = (num: number) => num.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const escape = (str: string) => `"${str.replace(/"/g, '""')}"`;
        return [
            order.entryDate, 
            "00:00", 
            order.osNumber,
            escape(order.customerName),
            escape(order.brand),
            escape(formatBRL(order.serviceValue)),
            escape(formatBRL(order.commissionValue)),
            t(`status.${order.status}`),
            order.paidAt ? order.paidAt.split('T')[0] : '-',
            order.paymentMethod || '-',
            order.periodId ? "Period Set" : "-"
        ].join(';');
    });
    const csvContent = "\uFEFF" + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `service_orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (!formData.osNumber || !formData.serviceValue || !formData.brand) {
        throw new Error(t('orders.errorRequired'));
      }
      
      const val = parseFloat(formData.serviceValue);
      if (val <= 0) {
        throw new Error(t('orders.errorPositive'));
      }

      const today = new Date();
      today.setHours(0,0,0,0);
      const entryDate = new Date(formData.entryDate);
      if (entryDate > today) {
        throw new Error(t('orders.errorFuture'));
      }

      const payload = {
        osNumber: parseInt(formData.osNumber),
        entryDate: formData.entryDate,
        customerName: formData.customerName,
        brand: formData.brand,
        serviceValue: val,
        paymentMethod: formData.paymentMethod as any
      };

      if (editingId) {
        updateOrder(editingId, payload);
      } else {
        createOrder(payload);
      }
      
      refreshData();
      resetForm();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (order: ServiceOrder) => {
    try {
        if (order.status === 'PAID') {
            alert("This order is PAID and cannot be edited.");
            return;
        }

        setEditingId(order.id);
        setFormData({
            osNumber: order.osNumber.toString(),
            entryDate: order.entryDate,
            customerName: order.customerName,
            brand: order.brand,
            serviceValue: order.serviceValue.toString(),
            paymentMethod: order.paymentMethod || ''
        });
        setIsFormOpen(true);
    } catch(e: any) {
        alert(e.message);
    }
  };

  const handleDuplicate = (id: string) => {
      try {
          duplicateOrder(id);
          refreshData();
      } catch (e: any) {
          alert(e.message);
      }
  }

  const handleShowHistory = (order: ServiceOrder) => {
      setSelectedHistory(order.history || []);
      setIsHistoryOpen(true);
  }

  const handleTogglePaid = (order: ServiceOrder) => {
    if (order.status === 'PAID') return;
    if (confirm(`Mark Order #${order.osNumber} as PAID?`)) {
        try {
            updateOrderStatus(order.id, 'PAID');
            refreshData(); 
        } catch (e: any) {
            alert(e.message);
        }
    }
  };

  const confirmDelete = () => {
    try {
      if (deleteConfirm.isBulk) {
         bulkDeleteOrders(Array.from(selectedIds));
      } else if (deleteConfirm.id) {
         deleteOrder(deleteConfirm.id);
      }
      refreshData();
    } catch (e: any) {
      alert(e.message);
    }
    setDeleteConfirm({ isOpen: false, id: null, isBulk: false });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleSelectRow = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkPay = () => {
      if (selectedIds.size === 0) return;
      if (confirm(`Mark ${selectedIds.size} selected orders as PAID?`)) {
          bulkUpdateOrderStatus(Array.from(selectedIds), 'PAID');
          refreshData();
      }
  };

  const handleBulkDelete = () => {
      if (selectedIds.size === 0) return;
      setDeleteConfirm({ isOpen: true, id: null, isBulk: true });
  };

  const resetForm = () => {
    setEditingId(null);
    const defaultBrand = brandsList.length > 0 ? brandsList[0].name : '';
    setFormData({
      osNumber: '',
      entryDate: new Date().toISOString().split('T')[0],
      customerName: 'Consumidor Padrão',
      brand: defaultBrand,
      serviceValue: '',
      paymentMethod: ''
    });
    setIsFormOpen(false);
    setError(null);
  };

  const openNewForm = () => {
      const defaultBrand = brandsList.length > 0 ? brandsList[0].name : '';
      setFormData(prev => ({ ...prev, brand: defaultBrand }));
      setIsFormOpen(true);
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getHistoryColor = (action: string) => {
      if (action.includes('CREATED')) return 'bg-emerald-500';
      if (action.includes('STATUS')) return 'bg-amber-500';
      if (action.includes('DUPLICATED')) return 'bg-violet-500';
      return 'bg-blue-500';
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{t('orders.title')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('orders.subtitle')}</p>
        </div>
        <div className="flex gap-2">
            <Button 
                variant="secondary" 
                onClick={handleExportCSV} 
                icon={<Download size={18} />}
            >
                {t('orders.exportCsv')}
            </Button>
            <Button onClick={openNewForm} icon={<Plus size={18} />}>
                {t('orders.newOrder')}
            </Button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-5 border border-white/10">
              <span className="font-medium text-sm">{selectedIds.size} {t('orders.bulkSelected')}</span>
              <div className="h-4 w-px bg-white/20" />
              <div className="flex gap-2">
                 <button 
                    onClick={handleBulkPay}
                    className="flex items-center gap-2 hover:text-emerald-400 text-sm font-medium transition-colors"
                 >
                    <CheckCircle size={16} /> {t('orders.markPaid')}
                 </button>
                 <button 
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 hover:text-red-400 text-sm font-medium transition-colors ml-2"
                 >
                    <Trash2 size={16} /> {t('common.delete')}
                 </button>
              </div>
          </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
                <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-500 dark:text-red-400">
                        <Trash2 size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {deleteConfirm.isBulk ? t('orders.deleteBulkTitle', { count: selectedIds.size }) : t('orders.deleteTitle')}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t('orders.deleteMsg')}
                    </p>
                </div>
                <div className="flex gap-3 pt-2">
                    <Button variant="secondary" onClick={() => setDeleteConfirm({isOpen: false, id: null, isBulk: false})} className="flex-1">
                        {t('common.cancel')}
                    </Button>
                    <Button variant="danger" onClick={confirmDelete} className="flex-1">
                        {t('common.delete')}
                    </Button>
                </div>
             </div>
         </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-0 max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <History size={18} /> {t('orders.auditLog')}
                    </h3>
                    <button onClick={() => setIsHistoryOpen(false)}><X size={20} className="text-slate-400" /></button>
                </div>
                <div className="max-h-96 overflow-y-auto p-6 space-y-2">
                    {selectedHistory.length === 0 ? (
                        <p className="text-center text-slate-500 text-sm py-4">{t('orders.noHistory')}</p>
                    ) : (
                        [...selectedHistory].reverse().map((entry, i) => (
                            <div key={i} className="flex gap-4 relative">
                                <div className="flex flex-col items-center">
                                    <div className={`w-3 h-3 rounded-full mt-1.5 ring-2 ring-white dark:ring-slate-900 ${getHistoryColor(entry.action)}`} />
                                    {i < selectedHistory.length - 1 && <div className="w-px h-full bg-slate-200 dark:bg-white/10 my-1" />}
                                </div>
                                <div className="pb-6">
                                    <p className="text-xs text-slate-400 font-mono mb-1">{new Date(entry.timestamp).toLocaleString()}</p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{entry.action}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{entry.details}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 font-medium uppercase tracking-wide">{entry.user}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
             </div>
          </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg animate-in zoom-in-95 duration-200" title={editingId ? t('orders.editTitle') : t('orders.newTitle')}>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label={t('orders.osNumber')} 
                  type="number" 
                  required
                  value={formData.osNumber}
                  onChange={e => setFormData({...formData, osNumber: e.target.value})}
                  placeholder="e.g. 1001"
                />
                <Input 
                  label={t('orders.date')} 
                  type="date" 
                  required
                  value={formData.entryDate}
                  onChange={e => setFormData({...formData, entryDate: e.target.value})}
                />
              </div>

              <Input 
                label={t('orders.customer')} 
                value={formData.customerName}
                onChange={e => setFormData({...formData, customerName: e.target.value})}
                placeholder="Consumidor Padrão"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">{t('orders.brand')}</label>
                    <div className="relative">
                        <select 
                            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                            value={formData.brand}
                            onChange={e => setFormData({...formData, brand: e.target.value})}
                            required
                        >
                            <option value="" disabled>{t('orders.selectBrand')}</option>
                            {brandsList.map(b => (
                                <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={16} />
                    </div>
                </div>

                <Input 
                    label={t('orders.value')} 
                    type="number" 
                    step="0.01"
                    required
                    value={formData.serviceValue}
                    onChange={e => setFormData({...formData, serviceValue: e.target.value})}
                    placeholder="0.00"
                />
              </div>

              {/* Payment Method - New Field */}
              <div className="flex flex-col gap-1.5">
                   <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">{t('orders.paymentMethod')} ({t('common.optional')})</label>
                   <div className="relative">
                       <select 
                           className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                           value={formData.paymentMethod}
                           onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                       >
                           <option value="">{t('orders.none')}</option>
                           <option value="PIX">PIX</option>
                           <option value="CASH">Cash</option>
                           <option value="CARD">Card</option>
                           <option value="TRANSFER">Bank Transfer</option>
                       </select>
                       <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={16} />
                   </div>
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-4 flex justify-between items-center">
                <span className="text-sm text-indigo-600 dark:text-indigo-300">{t('orders.calcCommission')} ({settings.fixedCommissionPercentage}%)</span>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(estimatedCommission)}</span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={resetForm} className="flex-1">{t('common.cancel')}</Button>
                <Button type="submit" className="flex-1">{t('orders.saveOrder')}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Table Section */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
             <input 
                ref={searchInputRef}
                type="text" 
                placeholder={t('orders.searchPlaceholder')}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
             />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
             <div className="relative">
                <select 
                    className="appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                    <option value="ALL">{t('status.ALL')}</option>
                    <option value="PENDING">{t('status.PENDING')}</option>
                    <option value="PAID">{t('status.PAID')}</option>
                </select>
                <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
             </div>

             <div className="relative">
                <select 
                    className="appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer max-w-[150px]"
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                >
                    <option value="ALL">{t('orders.allBrands')}</option>
                    {brandsList.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                </select>
                <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
             </div>
             
             {(statusFilter !== 'PENDING' || brandFilter !== 'ALL' || searchTerm) && (
                 <button 
                    onClick={() => {
                        setStatusFilter('PENDING');
                        setBrandFilter('ALL');
                        setSearchTerm('');
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title={t('orders.resetFilters')}
                 >
                     <X size={18} />
                 </button>
             )}
          </div>
        </div>

        {/* Filter Indicator Badge */}
        {(statusFilter !== 'ALL' || brandFilter !== 'ALL' || searchTerm) && (
            <div className="px-6 py-2 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('common.filtersActive')}</span>
                <div className="flex gap-2">
                    {statusFilter !== 'ALL' && <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">{t(`status.${statusFilter}`)}</span>}
                    {brandFilter !== 'ALL' && <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">{brandFilter}</span>}
                    {searchTerm && <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">"{searchTerm}"</span>}
                </div>
            </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4 w-12 text-center">
                    <button onClick={handleSelectAll} className="flex items-center justify-center text-slate-400 hover:text-indigo-500">
                        {filteredOrders.length > 0 && selectedIds.size === filteredOrders.length ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                </th>
                <th className="px-6 py-4 font-semibold">{t('orders.date')}</th>
                <th className="px-6 py-4 font-semibold">{t('orders.osNumber')}</th>
                <th className="px-6 py-4 font-semibold">{t('orders.customer')}</th>
                <th className="px-6 py-4 font-semibold">{t('orders.brand')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('common.value')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('dashboard.commission')}</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredOrders.length === 0 ? (
                <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3">
                                <FileText size={24} />
                            </div>
                            <p className="font-medium text-slate-600 dark:text-slate-300">{t('orders.noOrdersFound')}</p>
                            <p className="text-sm">{t('orders.noOrdersMsg')}</p>
                        </div>
                    </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                    <tr key={order.id} className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group ${selectedIds.has(order.id) ? 'bg-indigo-50/50 dark:bg-indigo-500/10' : ''}`}>
                    <td className="px-6 py-4 text-center">
                         <button onClick={() => handleSelectRow(order.id)} className={`flex items-center justify-center ${selectedIds.has(order.id) ? 'text-indigo-500' : 'text-slate-300 hover:text-slate-500'}`}>
                            {selectedIds.has(order.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {order.entryDate}
                        {order.paidAt && <span className="block text-[10px] text-emerald-500">{t('orders.paidOn')}: {order.paidAt.split('T')[0]}</span>}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">#{order.osNumber}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {order.customerName}
                        {order.paymentMethod && <span className="block text-[10px] text-slate-400">{order.paymentMethod}</span>}
                    </td>
                    <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300">
                            {order.brand}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300 font-medium">{formatCurrency(order.serviceValue)}</td>
                    <td className="px-6 py-4 text-right font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(order.commissionValue)}</td>
                    <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${
                            order.status === 'PAID' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}>
                            {order.status === 'PAID' ? <CheckCircle size={12} /> : <Clock size={12} />}
                            {t(`status.${order.status}`)}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {order.status === 'PENDING' && (
                                <button
                                    onClick={() => handleTogglePaid(order)}
                                    className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                    title={t('orders.markPaid')}
                                >
                                    <DollarSign size={16} />
                                </button>
                            )}
                             <button 
                                onClick={() => handleDuplicate(order.id)}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors"
                                title="Duplicate"
                            >
                                <Copy size={16} />
                            </button>
                            <button 
                                onClick={() => handleEdit(order)}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                disabled={order.status === 'PAID'}
                                title={t('common.edit')}
                            >
                                <Edit2 size={16} />
                            </button>
                            <button 
                                onClick={() => handleShowHistory(order)}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                                title={t('orders.auditLog')}
                            >
                                <History size={16} />
                            </button>
                            <button 
                                onClick={() => setDeleteConfirm({ isOpen: true, id: order.id, isBulk: false })}
                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                disabled={order.status === 'PAID'}
                                title={t('common.delete')}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};