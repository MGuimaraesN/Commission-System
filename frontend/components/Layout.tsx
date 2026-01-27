import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Calendar, 
  Settings, 
  LogOut, 
  Menu,
  X,
  CreditCard,
  Sun,
  Moon,
  Tags,
  FileBarChart,
  Globe
} from 'lucide-react';
import { useTheme } from '../services/theme';
import { useTranslation } from '../services/i18n';
import { getOrders } from '../services/dataService';

const SidebarItem = ({ to, icon: Icon, label, badgeCount }: { to: string, icon: any, label: string, badgeCount?: number }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `
      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative
      ${isActive 
        ? 'bg-indigo-50 dark:bg-white/10 text-indigo-700 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10' 
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'}
    `}
  >
    {({ isActive }) => (
      <>
        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />}
        <Icon size={20} className={`transition-transform duration-300 ${isActive ? 'scale-100' : 'group-hover:scale-110'}`} />
        <span className={`font-medium text-sm ${isActive ? 'font-semibold' : ''}`}>{label}</span>
        {badgeCount !== undefined && badgeCount > 0 && (
          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-sm">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </>
    )}
  </NavLink>
);

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  const toggleLanguage = () => {
    setLanguage(language === 'pt-BR' ? 'en-US' : 'pt-BR');
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Update pending count
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const orders = await getOrders();
        const count = orders.filter(o => o.status === 'PENDING').length;
        setPendingCount(count);
      } catch (error) {
        // Silently fail for badge count updates to avoid blocking UI
        console.warn("Failed to fetch pending count", error);
      }
    };
    
    fetchPending();
    // window.addEventListener('storage', fetchPending); // localStorage listener no longer applies with API
    const interval = setInterval(fetchPending, 10000); // Poll every 10s instead of 2s to save resources

    return () => {
        // window.removeEventListener('storage', fetchPending);
        clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-200 flex overflow-hidden transition-colors duration-300 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-slate-200 dark:border-white/5 bg-white dark:bg-[#0b1221] p-5 relative z-20 transition-colors duration-300">
        <div className="flex items-center gap-3 px-2 py-4 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
            <CreditCard className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-800 dark:text-white tracking-tight leading-tight">Commission<br/>System</h1>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5">
          <SidebarItem to="/" icon={LayoutDashboard} label={t('common.dashboard')} />
          <SidebarItem to="/orders" icon={ClipboardList} label={t('common.serviceOrders')} badgeCount={pendingCount} />
          <SidebarItem to="/periods" icon={Calendar} label={t('common.periods')} />
          <SidebarItem to="/brands" icon={Tags} label={t('common.brands')} />
          <SidebarItem to="/reports" icon={FileBarChart} label={t('common.reports')} />
          <SidebarItem to="/settings" icon={Settings} label={t('common.settings')} />
          <SidebarItem to="/audit" icon={ClipboardList} label="Auditoria" />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-200 dark:border-white/5">
           <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-3 border border-slate-200 dark:border-white/5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-200">
                 A
              </div>
              <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">Admin</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t('common.authenticated')}</p>
              </div>
           </div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden animate-in fade-in" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#0b1221] transform transition-transform duration-300 ease-out md:hidden flex flex-col p-4 shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <div className="flex items-center justify-between mb-8">
            <span className="font-bold text-xl text-slate-800 dark:text-white">{t('common.menu')}</span>
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
              <X size={24} />
            </button>
         </div>
         <nav className="flex-1 space-y-2">
          <SidebarItem to="/" icon={LayoutDashboard} label={t('common.dashboard')} />
          <SidebarItem to="/orders" icon={ClipboardList} label={t('common.serviceOrders')} badgeCount={pendingCount} />
          <SidebarItem to="/periods" icon={Calendar} label={t('common.periods')} />
          <SidebarItem to="/brands" icon={Tags} label={t('common.brands')} />
          <SidebarItem to="/reports" icon={FileBarChart} label={t('common.reports')} />
          <SidebarItem to="/settings" icon={Settings} label={t('common.settings')} />
          <SidebarItem to="/audit" icon={ClipboardList} label="Auditoria" />
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Abstract Background Blobs - Dark mode only */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 hidden dark:block">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-[120px]" />
        </div>

        {/* Header */}
        <header className="h-16 border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-6 md:px-10 z-10 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-md sticky top-0 transition-colors duration-300">
          <button 
            className="md:hidden text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
          
          <div className="ml-auto flex items-center gap-3">
             <button
              onClick={toggleLanguage}
              className="px-3 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/10 flex items-center gap-2"
              title="Toggle Language"
             >
               <Globe size={18} />
               <span className="text-xs font-bold uppercase">{language.split('-')[0]}</span>
             </button>

             <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/10"
              title="Toggle Theme"
             >
               {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
             </button>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 xl:p-10 z-10 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};