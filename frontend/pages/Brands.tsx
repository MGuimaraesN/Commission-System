import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, AlertCircle, Tag, X } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { getBrands, addBrand, updateBrand, deleteBrand } from '../services/dataService';
import { Brand } from '../types';
import { useTranslation } from '../services/i18n';

export const Brands: React.FC = () => {
  const { t } = useTranslation();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredBrands(brands.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase())));
    } else {
      setFilteredBrands(brands);
    }
  }, [searchTerm, brands]);

  const loadBrands = () => {
    setBrands(getBrands());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (!formData.name.trim()) throw new Error(t('brands.errorRequired'));

      if (editingId) {
        updateBrand(editingId, formData.name);
      } else {
        addBrand(formData.name);
      }
      
      loadBrands();
      resetForm();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setFormData({ name: brand.name });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('brands.confirmDelete'))) {
      deleteBrand(id);
      loadBrands();
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '' });
    setIsFormOpen(false);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{t('brands.title')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('brands.subtitle')}</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} icon={<Plus size={18} />}>
            {t('brands.newBrand')}
        </Button>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md animate-in zoom-in-95 duration-200" title={editingId ? t('brands.editBrand') : t('brands.newBrand')}>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              
              <Input 
                label={t('brands.brandName')}
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Samsung"
                autoFocus
              />

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={resetForm} className="flex-1">{t('common.cancel')}</Button>
                <Button type="submit" className="flex-1">{t('brands.saveBrand')}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* List */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5">
          <div className="relative max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
             <input 
                type="text" 
                placeholder={t('brands.searchPlaceholder')}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
             />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4 font-semibold">{t('brands.brandName')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredBrands.length === 0 ? (
                <tr>
                    <td colSpan={2} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3">
                                <Tag size={24} />
                            </div>
                            <p className="font-medium text-slate-600 dark:text-slate-300">{t('brands.noBrands')}</p>
                        </div>
                    </td>
                </tr>
              ) : (
                filteredBrands.map(brand => (
                    <tr key={brand.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <Tag size={16} />
                            </div>
                            {brand.name}
                        </td>
                        <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleEdit(brand)}
                                    className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(brand.id)}
                                    className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
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