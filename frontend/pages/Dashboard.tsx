import React, { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { DollarSign, TrendingUp, Calendar, Trophy, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { getOrders, getMonthlyStats, getRankings } from '../services/dataService';
import { ServiceOrder } from '../types';
import { useTheme } from '../services/theme';
import { useTranslation } from '../services/i18n';

interface StatCardProps {
    title: string;
    value: string;
    subValue: string;
    icon: any;
    color: string;
    trend?: number;
    variant?: 'default' | 'primary' | 'highlight';
}

const StatCard = ({ title, value, subValue, icon: Icon, color, trend, variant = 'default' }: StatCardProps) => (
  <div className={`
    relative overflow-hidden group transition-all duration-300 ease-out hover:-translate-y-1
    bg-white dark:bg-slate-800/40 dark:backdrop-blur-xl rounded-2xl p-6
    ${variant === 'primary' 
        ? 'ring-2 ring-indigo-500/20 dark:ring-indigo-500/30 shadow-lg dark:shadow-[0_0_30px_-10px_rgba(99,102,241,0.2)]' 
        : variant === 'highlight' 
            ? 'ring-1 ring-amber-500/20 dark:ring-amber-500/30 shadow-md' 
            : 'border border-slate-200 dark:border-white/5 shadow-sm'}
  `}>
    <div className={`absolute right-0 top-0 p-3 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-500 ${color} dark:text-white`}>
      <Icon size={120} />
    </div>

    <div className="relative z-10 flex flex-col h-full justify-between">
      <div className="flex justify-between items-start mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} bg-opacity-10 dark:bg-opacity-20 text-white shadow-inner`}>
             <Icon size={24} className={variant === 'highlight' ? 'text-amber-600 dark:text-amber-400' : (variant === 'primary' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300')} />
          </div>
          {trend !== undefined && (
             <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                 {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                 {Math.abs(trend).toFixed(1)}%
             </div>
          )}
      </div>
      
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{title}</p>
        <h3 className={`text-2xl font-bold mt-1 tracking-tight ${variant === 'primary' ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-800 dark:text-white'}`}>
            {value}
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">{subValue}</p>
      </div>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [stats, setStats] = useState({
    totalServiceValue: 0,
    count: 0,
    todayService: 0,
    todayOrdersCount: 0,
    pulseGrowth: 0,
    bestDayValue: 0,
    bestDayDate: ''
  });
  
  const [monthlyStats, setMonthlyStats] = useState<any>({ growth: 0 });
  const [rankings, setRankings] = useState<{ topBrands: any[], topCustomers: any[] }>({ topBrands: [], topCustomers: [] });

  const { theme } = useTheme();
  const { t, language } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const safeLanguage = language || 'pt-BR';

  // Gráfico Diário de Valor de O.S. (Últimos 7 dias)
  const lineData = React.useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      return {
        dateStr,
        // Data formatada de forma mais elegante (ex: "Seg, 28")
        label: d.toLocaleDateString(safeLanguage, { weekday: 'short', day: 'numeric' }).replace('.', ''),
        serviceValue: 0,
      };
    }).reverse();

    orders.forEach(order => {
      const orderDateStr = order.entryDate.split('T')[0];
      const dayIndex = days.findIndex(d => d.dateStr === orderDateStr);
      if (dayIndex !== -1) {
        days[dayIndex].serviceValue += Number(order.serviceValue);
      }
    });

    return days;
  }, [orders, safeLanguage]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [fetchedOrders, fetchedMonthlyStats, fetchedRankings] = await Promise.all([
          getOrders(),
          getMonthlyStats(),
          getRankings()
        ]);

        setOrders(fetchedOrders);
        setMonthlyStats(fetchedMonthlyStats);
        setRankings(fetchedRankings);

        // Somando Valor de Serviço em vez de Comissão
        const totalServiceValue = fetchedOrders.reduce((acc, o) => acc + Number(o.serviceValue), 0);

        const todayStr = new Date().toISOString().split('T')[0];
        const todayOrders = fetchedOrders.filter(o => o.entryDate.split('T')[0] === todayStr);
        const todayService = todayOrders.reduce((acc, o) => acc + Number(o.serviceValue), 0);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const yesterdayOrders = fetchedOrders.filter(o => o.entryDate.split('T')[0] === yesterdayStr);
        const yesterdayService = yesterdayOrders.reduce((acc, o) => acc + Number(o.serviceValue), 0);
        const pulseGrowth = yesterdayService === 0 ? (todayService > 0 ? 100 : 0) : ((todayService - yesterdayService) / yesterdayService) * 100;

        // Melhor Dia baseado no valor de serviço
        const dailyTotals = fetchedOrders.reduce((acc: {[key: string]: number}, o) => {
          const day = o.entryDate.split('T')[0];
          acc[day] = (acc[day] || 0) + Number(o.serviceValue);
          return acc;
        }, {});
        
        const bestDayValue = Math.max(...Object.values(dailyTotals), 0);
        const bestDayDate = Object.keys(dailyTotals).find(day => dailyTotals[day] === bestDayValue) || '';

        setStats({
          totalServiceValue,
          count: fetchedOrders.length,
          todayService,
          todayOrdersCount: todayOrders.length,
          pulseGrowth,
          bestDayValue,
          bestDayDate
        });
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
    );
  }

  const pieData = [
    { name: t('status.PENDING'), value: orders.filter(o => o.status === 'PENDING').length },
    { name: t('status.PAID'), value: orders.filter(o => o.status === 'PAID').length },
  ];

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat(safeLanguage, { style: 'currency', currency: 'BRL' }).format(val);

  const isDark = theme === 'dark';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{t('dashboard.title')}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t('dashboard.subtitle')}</p>
        </div>
        {/* Today's Pulse - Focado em Valor de O.S. */}
        <div className="bg-white dark:bg-slate-800/60 dark:backdrop-blur-md border border-slate-200 dark:border-white/5 pl-4 pr-6 py-2.5 rounded-2xl flex items-center gap-6 shadow-sm">
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('dashboard.orders')}</span>
                <span className="text-lg font-bold text-slate-800 dark:text-white leading-none">{stats.todayOrdersCount}</span>
             </div>
             <div className="h-8 w-px bg-slate-100 dark:bg-white/10" />
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">VALOR HOJE</span>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 leading-none">{formatCurrency(stats.todayService)}</span>
             </div>
             <div className="h-8 w-px bg-slate-100 dark:bg-white/10" />
             <div className={`flex items-center gap-1 text-xs font-bold ${stats.pulseGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                 {stats.pulseGrowth >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                 {Math.abs(stats.pulseGrowth).toFixed(0)}% <span className="text-slate-400 dark:text-slate-600 font-medium ml-1">{t('dashboard.vsYesterday')}</span>
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Faturamento Mês"
          value={formatCurrency(monthlyStats.currentMonth?.total || 0)} 
          subValue="Total em serviços este mês"
          icon={TrendingUp} 
          color="text-emerald-500"
          trend={monthlyStats.growth}
          variant="primary"
        />
        
        <StatCard 
          title="Recorde Diário" 
          value={formatCurrency(stats.bestDayValue)} 
          subValue={stats.bestDayDate ? new Date(stats.bestDayDate + 'T00:00:00').toLocaleDateString(safeLanguage) : t('dashboard.noDataYet')}
          icon={Trophy} 
          color="text-amber-500" 
          variant="highlight"
        />

        <StatCard 
          title="Faturamento Hoje" 
          value={formatCurrency(stats.todayService)} 
          subValue="Total de O.S. abertas hoje"
          icon={Calendar} 
          color="text-violet-500" 
        />

        <StatCard 
          title="Faturamento Total"
          value={formatCurrency(stats.totalServiceValue)} 
          subValue="Todo o período histórico"
          icon={DollarSign} 
          color="text-indigo-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart Melhorado */}
        <Card className="lg:col-span-2 min-h-[400px]" title="Evolução Diária de Valor (O.S.)">
          <div className="h-[320px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={lineData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="strokeVal" x1="0" y1="0" x2="1" y2="0">
                     <stop offset="0%" stopColor="#6366f1" />
                     <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} vertical={false} />
                <XAxis 
                    dataKey="label" 
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    dy={10}
                />
                <YAxis 
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `R$${val >= 1000 ? (val/1000).toFixed(1)+'k' : val}`}
                />
                <Tooltip 
                    cursor={{ stroke: isDark ? '#334155' : '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ 
                      backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                      borderColor: isDark ? '#1e293b' : '#e2e8f0', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    itemStyle={{ fontWeight: 600 }}
                    formatter={(value: number) => [formatCurrency(value), "Valor Total"]}
                />
                <Area 
                    type="monotone" 
                    dataKey="serviceValue" 
                    stroke="url(#strokeVal)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorVal)" 
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Donut Chart Completo e Popup Bonito */}
        <Card title="Status das O.S">
          <div className="h-[320px] w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  cornerRadius={10} // Deixa as pontas dos segmentos arredondadas
                  innerRadius={82} // Aumentado para uma rosca mais fina e elegante
                  outerRadius={100} // Círculo maior
                  paddingAngle={0} // Garante que o círculo seja contínuo
                  cx="50%"
                  cy="50%"                  
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981'][index % 2]} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                      borderColor: isDark ? '#1e293b' : '#e2e8f0', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    itemStyle={{ fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle"/>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-4xl font-bold text-slate-800 dark:text-white tracking-tighter">{stats.count}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">TOTAL O.S.</span>
            </div>
          </div>
        </Card>
      </div>
      
      {/* ... Seção de Rankings (Mantida conforme original mas usando formatCurrency) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title={t('dashboard.topBrands')} subtitle="Por volume de faturamento">
             <div className="space-y-5 mt-4">
                {rankings.topBrands.map((brand, i) => {
                    const maxVal = rankings.topBrands[0]?.value || 1;
                    const percent = (brand.value / maxVal) * 100;
                    return (
                        <div key={i} className="relative group p-3">
                            <div className="absolute inset-y-0 left-0 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg -z-10" style={{ width: `${percent}%` }} />
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-sm">{brand.name}</span>
                                <span className="font-bold text-sm font-mono">{formatCurrency(brand.value)}</span>
                            </div>
                        </div>
                    );
                })}
             </div>
          </Card>
          <Card title={t('dashboard.topCustomers')} subtitle="Maiores investidores">
             <div className="space-y-5 mt-4">
                {rankings.topCustomers.map((customer, i) => {
                    const maxVal = rankings.topCustomers[0]?.value || 1;
                    const percent = (customer.value / maxVal) * 100;
                    return (
                        <div key={i} className="relative group p-3">
                            <div className="absolute inset-y-0 left-0 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg -z-10" style={{ width: `${percent}%` }} />
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-sm">{customer.name}</span>
                                <span className="font-bold text-sm font-mono">{formatCurrency(customer.value)}</span>
                            </div>
                        </div>
                    );
                })}
             </div>
          </Card>
      </div>
    </div>
  );
};