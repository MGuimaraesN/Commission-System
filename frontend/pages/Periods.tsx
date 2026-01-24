import React, { useEffect, useState } from 'react';
import { CheckCircle, Lock, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getPeriods, markPeriodAsPaid, initializeData } from '../services/dataService';
import { Period } from '../types';
import { useTranslation } from '../services/i18n';

export const Periods: React.FC = () => {
  const { t } = useTranslation();
  const [periods, setPeriods] = useState<Period[]>([]);

  useEffect(() => {
    // Initialize data for demo purposes if empty
    initializeData();
    refreshPeriods();
  }, []);

  const refreshPeriods = async () => {
    try {
      const data = await getPeriods();
      setPeriods(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (confirm(t('periods.confirmClose'))) {
      try {
        await markPeriodAsPaid(id);
        refreshPeriods();
      } catch (error: any) {
        alert(error.message || "Error closing period");
      }
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{t('periods.title')}</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t('periods.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {periods.map(period => (
          <Card key={period.id} className={`group ${period.paid ? 'opacity-80' : 'ring-1 ring-indigo-500/30'}`}>
            <div className="flex justify-between items-start mb-4">
               <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${period.paid ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}`}>
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg tracking-tight">{period.startDate} → {period.endDate}</h3>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${period.paid ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                        {period.paid ? t('periods.closedPaid') : t('periods.openPeriod')}
                    </p>
                  </div>
               </div>
               {period.paid && <Lock size={18} className="text-slate-400 dark:text-slate-500" />}
            </div>

            <div className="space-y-3 py-2">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{t('periods.serviceOrders')}</span>
                    <span className="text-slate-800 dark:text-white font-bold">{period.totalOrders}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{t('periods.totalVolume')}</span>
                    <span className="text-slate-800 dark:text-white font-bold">{formatCurrency(period.totalServiceValue)}</span>
                </div>
                 <div className="pt-4 mt-2 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-300 font-semibold">{t('periods.commissionTotal')}</span>
                    <span className={`text-xl font-bold tracking-tight ${period.paid ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                        {formatCurrency(period.totalCommission)}
                    </span>
                </div>
            </div>

            <div className="mt-6">
                {period.paid ? (
                     <div className="w-full py-2.5 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                        <CheckCircle size={16} />
                        <span className="text-sm font-semibold">{t('periods.paidOn')} {period.paidAt?.split('T')[0]}</span>
                     </div>
                ) : (
                    <Button 
                        className="w-full" 
                        onClick={() => handleMarkPaid(period.id)}
                        disabled={period.totalOrders === 0}
                    >
                        {t('periods.markAsPaid')}
                    </Button>
                )}
            </div>
          </Card>
        ))}

        {periods.length === 0 && (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-500">
                    <Calendar size={32} />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{t('periods.noPeriods')}</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">{t('periods.noPeriodsMsg')}</p>
            </div>
        )}
      </div>
    </div>
  );
};