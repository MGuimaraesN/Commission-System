import React, { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { DollarSign, TrendingUp, Calendar, Trophy, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { getOrders, getPeriods, getMonthlyStats, getRankings } from '../services/dataService';
import { Period, ServiceOrder } from '../types';
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
    {/* Background Icon Watermark */}
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
  const [periods, setPeriods] = useState<Period[]>([]);
  const [stats, setStats] = useState({
    totalCommission: 0,
    totalService: 0,
    count: 0,
    currentPeriodComm: 0,
    todayComm: 0,
    todayOrders: 0,
    pulseGrowth: 0
  });
  
  const [monthlyStats, setMonthlyStats] = useState<any>({ growth: 0 });
  const [rankings, setRankings] = useState<{ topBrands: any[], topCustomers: any[] }>({ topBrands: [], topCustomers: [] });
  const [bestPeriod, setBestPeriod] = useState<Period | null>(null);

  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [fetchedOrders, fetchedPeriods, fetchedMonthlyStats, fetchedRankings] = await Promise.all([
          getOrders(),
          getPeriods(),
          getMonthlyStats(),
          getRankings()
        ]);

        setOrders(fetchedOrders);
        setPeriods(fetchedPeriods);
        setMonthlyStats(fetchedMonthlyStats);
        setRankings(fetchedRankings);

        const totalCommission = fetchedOrders.reduce((acc, o) => acc + Number(o.commissionValue), 0);
        const totalService = fetchedOrders.reduce((acc, o) => acc + Number(o.serviceValue), 0);

        // Current Period
        const todayStr = new Date().toISOString().split('T')[0];
        // Ensure period dates are compared as strings YYYY-MM-DD (backend sends ISO usually but might be YYYY-MM-DD depending on logic, let's safe parse)
        const currentPeriod = fetchedPeriods.find(p => {
            const start = p.startDate.split('T')[0];
            const end = p.endDate.split('T')[0];
            return start <= todayStr && end >= todayStr;
        });
        const currentPeriodComm = currentPeriod ? Number(currentPeriod.totalCommission) : 0;

        // Today Pulse
        const todayOrders = fetchedOrders.filter(o => o.entryDate.split('T')[0] === todayStr);
        const todayComm = todayOrders.reduce((acc, o) => acc + Number(o.commissionValue), 0);

        // Yesterday Pulse Calculation
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const yesterdayOrders = fetchedOrders.filter(o => o.entryDate.split('T')[0] === yesterdayStr);
        const yesterdayComm = yesterdayOrders.reduce((acc, o) => acc + Number(o.commissionValue), 0);
        const pulseGrowth = yesterdayComm === 0 ? (todayComm > 0 ? 100 : 0) : ((todayComm - yesterdayComm) / yesterdayComm) * 100;

        // Best Period
        const best = [...fetchedPeriods].sort((a, b) => Number(b.totalCommission) - Number(a.totalCommission))[0];
        setBestPeriod(best);

        setStats({
          totalCommission,
          totalService,
          count: fetchedOrders.length,
          currentPeriodComm,
          todayComm,
          todayOrders: todayOrders.length,
          pulseGrowth
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

  // Prepare Chart Data
  const lineData = periods
    .slice(0, 6)
    .reverse()
    .map(p => ({
      name: `${p.startDate.split('T')[0].slice(5)}`,
      commission: Number(p.totalCommission),
      service: Number(p.totalServiceValue)
    }));

  const pieData = [
    { name: t('status.PENDING'), value: orders.filter(o => o.status === 'PENDING').length },
    { name: t('status.PAID'), value: orders.filter(o => o.status === 'PAID').length },
  ];

  const COLORS = ['#6366f1', '#10b981'];

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const isDark = theme === 'dark';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{t('dashboard.title')}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t('dashboard.subtitle')}</p>
        </div>
        {/* Today's Pulse */}
        <div className="bg-white dark:bg-slate-800/60 dark:backdrop-blur-md border border-slate-200 dark:border-white/5 pl-4 pr-6 py-2.5 rounded-2xl flex items-center gap-6 shadow-sm">
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('dashboard.orders')}</span>
                <span className="text-lg font-bold text-slate-800 dark:text-white leading-none">{stats.todayOrders}</span>
             </div>
             <div className="h-8 w-px bg-slate-100 dark:bg-white/10" />
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('dashboard.commission')}</span>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 leading-none">{formatCurrency(stats.todayComm)}</span>
             </div>
             <div className="h-8 w-px bg-slate-100 dark:bg-white/10" />
             <div className={`flex items-center gap-1 text-xs font-bold ${stats.pulseGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                 {stats.pulseGrowth >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                 {Math.abs(stats.pulseGrowth).toFixed(0)}% <span className="text-slate-400 dark:text-slate-600 font-medium ml-1">{t('dashboard.vsYesterday')}</span>
             </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Primary Metric */}
        <StatCard 
          title={t('dashboard.currentMonth')}
          value={formatCurrency(monthlyStats.currentMonth?.total || 0)} 
          subValue={t('dashboard.totalGenerated')}
          icon={TrendingUp} 
          color="text-emerald-500"
          trend={monthlyStats.growth}
          variant="primary"
        />
        
        <StatCard 
          title={t('dashboard.bestPeriod')}
          value={bestPeriod ? formatCurrency(bestPeriod.totalCommission) : '-'} 
          subValue={bestPeriod ? `${bestPeriod.startDate} → ${bestPeriod.endDate}` : t('dashboard.noDataYet')}
          icon={Trophy} 
          color="text-amber-500" 
          variant="highlight"
        />

        <StatCard 
          title={t('dashboard.currentPeriod')} 
          value={formatCurrency(stats.currentPeriodComm)} 
          subValue={t('dashboard.cycleCommission')}
          icon={Calendar} 
          color="text-violet-500" 
        />

        <StatCard 
          title={t('dashboard.totalCommission')}
          value={formatCurrency(stats.totalCommission)} 
          subValue={t('dashboard.allTimeEarnings')}
          icon={DollarSign} 
          color="text-indigo-500" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <Card className="lg:col-span-2 min-h-[400px]" title={t('dashboard.historyTitle')}>
          <div className="h-[320px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={lineData}>
                <defs>
                  <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  {/* Stroke Gradient Definition */}
                  <linearGradient id="strokeComm" x1="0" y1="0" x2="1" y2="0">
                     <stop offset="0%" stopColor="#6366f1" />
                     <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} vertical={false} />
                <XAxis 
                    dataKey="name" 
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    dy={10}
                    tick={{fill: isDark ? '#94a3b8' : '#64748b'}}
                />
                <YAxis 
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `R$${val}`}
                    tick={{fill: isDark ? '#94a3b8' : '#64748b'}}
                />
                <Tooltip 
                    cursor={{ stroke: isDark ? '#334155' : '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ 
                      backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                      borderColor: isDark ? '#1e293b' : '#e2e8f0', 
                      borderRadius: '12px',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    itemStyle={{ color: isDark ? '#e2e8f0' : '#334155', fontWeight: 600 }}
                />
                <Area 
                    type="monotone" 
                    dataKey="commission" 
                    stroke="url(#strokeComm)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorComm)" 
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Donut Chart */}
        <Card title={t('dashboard.orderStatus')}>
          <div className="h-[320px] w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={6}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                      borderColor: isDark ? '#1e293b' : '#e2e8f0', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    itemStyle={{ color: isDark ? '#e2e8f0' : '#334155', fontWeight: 600 }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle"/>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-4xl font-bold text-slate-800 dark:text-white tracking-tighter">{orders.length}</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">{t('dashboard.total')}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Rankings Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title={t('dashboard.topBrands')} subtitle={t('dashboard.byCommission')}>
             <div className="space-y-5 mt-4">
                {rankings.topBrands.map((brand, i) => {
                    // Calculate percentage relative to top item for progress bar
                    const maxVal = rankings.topBrands[0]?.value || 1;
                    const percent = (brand.value / maxVal) * 100;
                    
                    return (
                        <div key={i} className="relative group">
                            {/* Background Bar */}
                            <div 
                                className="absolute inset-y-0 left-0 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg -z-10 transition-all duration-500 ease-out" 
                                style={{ width: `${percent}%` }}
                            />
                            
                            <div className="flex items-center justify-between p-3 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        i === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' : 
                                        i === 1 ? 'bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300' :
                                        i === 2 ? 'bg-amber-100 text-amber-800 dark:bg-amber-700/20 dark:text-amber-500' :
                                        'text-slate-400'
                                    }`}>
                                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                    </div>
                                    <span className="text-slate-700 dark:text-slate-200 font-semibold text-sm">{brand.name}</span>
                                </div>
                                <span className="font-bold text-slate-800 dark:text-white font-mono text-sm">{formatCurrency(brand.value)}</span>
                            </div>
                        </div>
                    );
                })}
                {rankings.topBrands.length === 0 && (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm italic">
                        {t('dashboard.noBrandData')}
                    </div>
                )}
             </div>
          </Card>
          <Card title={t('dashboard.topCustomers')} subtitle={t('dashboard.byVolume')}>
             <div className="space-y-5 mt-4">
                {rankings.topCustomers.map((customer, i) => {
                    const maxVal = rankings.topCustomers[0]?.value || 1;
                    const percent = (customer.value / maxVal) * 100;

                    return (
                        <div key={i} className="relative group">
                             {/* Background Bar */}
                            <div 
                                className="absolute inset-y-0 left-0 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg -z-10 transition-all duration-500 ease-out" 
                                style={{ width: `${percent}%` }}
                            />
                            <div className="flex items-center justify-between p-3 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        i === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' : 
                                        'text-slate-400'
                                    }`}>
                                        {i === 0 ? '🥇' : i + 1}
                                    </div>
                                    <span className="text-slate-700 dark:text-slate-200 font-semibold text-sm truncate max-w-[150px]">{customer.name}</span>
                                </div>
                                <span className="font-bold text-slate-800 dark:text-white font-mono text-sm">{formatCurrency(customer.value)}</span>
                            </div>
                        </div>
                    );
                })}
                 {rankings.topCustomers.length === 0 && (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm italic">
                        {t('dashboard.noCustomerData')}
                    </div>
                 )}
             </div>
          </Card>
      </div>
    </div>
  );
};