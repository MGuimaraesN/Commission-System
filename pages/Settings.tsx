import React, { useState, useEffect, useRef } from 'react';
import { Save, AlertTriangle, Building, FileText, Download, Upload, CheckCircle, Palette } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { getSettings, saveSettings, getBackupData, restoreBackup } from '../services/dataService';
import { useTranslation } from '../services/i18n';

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [percentage, setPercentage] = useState<string>('10');
  const [company, setCompany] = useState({
    name: '',
    cnpj: '',
    address: '',
    contact: '',
    logoUrl: '',
    primaryColor: '#2c3e50'
  });
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = getSettings();
    setPercentage(s.fixedCommissionPercentage.toString());
    setCompany({
        name: s.companyName || '',
        cnpj: s.companyCnpj || '',
        address: s.companyAddress || '',
        contact: s.companyContact || '',
        logoUrl: s.companyLogoUrl || '',
        primaryColor: s.primaryColor || '#2c3e50'
    });
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(percentage);
    if (isNaN(val) || val < 0 || val > 100) {
      alert("Please enter a valid percentage (0-100)");
      return;
    }
    
    saveSettings({ 
        fixedCommissionPercentage: val,
        companyName: company.name,
        companyCnpj: company.cnpj,
        companyAddress: company.address,
        companyContact: company.contact,
        companyLogoUrl: company.logoUrl,
        primaryColor: company.primaryColor
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportBackup = () => {
      const data = getBackupData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `commission_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result as string;
          if (confirm(t('settings.restoreConfirm'))) {
              const success = restoreBackup(content);
              if (success) {
                  alert(t('settings.restoreSuccess'));
                  window.location.reload();
              } else {
                  alert(t('settings.restoreFail'));
              }
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset input
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t('settings.title')}</h2>
        <p className="text-slate-500 dark:text-slate-400">{t('settings.subtitle')}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card title={t('settings.commConfig')}>
           <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 p-4 rounded-xl flex gap-3 items-start">
                    <AlertTriangle className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
                    <div className="space-y-1">
                        <h4 className="text-sm font-medium text-amber-700 dark:text-amber-300">{t('settings.important')}</h4>
                        <p className="text-sm text-amber-600 dark:text-amber-400/80 leading-relaxed">
                            {t('settings.importantMsg')}
                        </p>
                    </div>
                </div>

                <div className="max-w-xs">
                    <Input 
                        label={t('settings.fixedPercentage')} 
                        type="number" 
                        step="0.1" 
                        min="0"
                        max="100"
                        value={percentage}
                        onChange={e => setPercentage(e.target.value)}
                        icon={<span className="text-sm font-bold text-slate-500">%</span>}
                    />
                </div>
           </div>
        </Card>

        <Card title={t('settings.companyProfile')}>
            <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                    {t('settings.companyInfoMsg')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                        label={t('settings.companyName')}
                        placeholder="My Tech Services Ltd"
                        value={company.name}
                        onChange={e => setCompany({...company, name: e.target.value})}
                        icon={<Building size={16} />}
                    />
                    <Input 
                        label={t('settings.cnpj')}
                        placeholder="00.000.000/0001-00"
                        value={company.cnpj}
                        onChange={e => setCompany({...company, cnpj: e.target.value})}
                        icon={<FileText size={16} />}
                    />
                </div>
                <Input 
                    label={t('settings.address')}
                    placeholder="123 Business Av, Tech City"
                    value={company.address}
                    onChange={e => setCompany({...company, address: e.target.value})}
                />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                        label={t('settings.contact')}
                        placeholder="(11) 99999-9999 / contact@company.com"
                        value={company.contact}
                        onChange={e => setCompany({...company, contact: e.target.value})}
                    />
                    <Input 
                        label={t('settings.logoUrl')}
                        placeholder="https://example.com/logo.png"
                        value={company.logoUrl}
                        onChange={e => setCompany({...company, logoUrl: e.target.value})}
                    />
                </div>
                <div className="grid grid-cols-1 gap-4 pt-2">
                    <div className="flex gap-4 items-end">
                       <Input 
                           label={t('settings.primaryColor')}
                           type="text"
                           placeholder="#2c3e50"
                           value={company.primaryColor}
                           onChange={e => setCompany({...company, primaryColor: e.target.value})}
                           icon={<Palette size={16} />}
                           className="flex-1"
                       />
                       <input 
                           type="color" 
                           value={company.primaryColor} 
                           onChange={e => setCompany({...company, primaryColor: e.target.value})}
                           className="h-[42px] w-[60px] rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-800"
                       />
                    </div>
                </div>
            </div>
        </Card>

        <Card title={t('settings.dataMgmt')}>
            <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('settings.dataMsg')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Button type="button" variant="secondary" onClick={handleExportBackup} icon={<Download size={18} />}>
                        {t('settings.exportBackup')}
                    </Button>
                    
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImportBackup} 
                        accept=".json" 
                        className="hidden"
                    />
                    <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()} icon={<Upload size={18} />}>
                        {t('settings.importBackup')}
                    </Button>
                </div>
            </div>
        </Card>

        <div className="flex items-center gap-4 pt-4 border-t border-slate-200 dark:border-white/5">
            <Button type="submit" icon={<Save size={18} />} disabled={saved}>
                {saved ? t('settings.saved') : t('settings.saveAll')}
            </Button>
            {saved && <span className="text-emerald-500 flex items-center gap-2 text-sm font-medium animate-in fade-in"><CheckCircle size={16}/> {t('settings.saved')}</span>}
        </div>
      </form>
    </div>
  );
};