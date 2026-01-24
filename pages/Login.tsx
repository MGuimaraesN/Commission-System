import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../services/auth';
import { useTranslation } from '../services/i18n';

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      // Mock login success
      login(email);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#020617] flex items-center justify-center relative overflow-hidden transition-colors duration-300">
      {/* Background Decor - Dark Only */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 blur-[120px] rounded-full hidden dark:block" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-600/20 blur-[120px] rounded-full hidden dark:block" />
      
      {/* Background Decor - Light Only */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-300/30 blur-[120px] rounded-full dark:hidden" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-300/30 blur-[120px] rounded-full dark:hidden" />

      <div className="w-full max-w-md relative z-10 px-4">
        <div className="text-center mb-8 space-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/30 mb-6">
                <CreditCard className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">{t('login.welcome')}</h1>
            <p className="text-slate-500 dark:text-slate-400">{t('login.subtitle')}</p>
        </div>

        <div className="bg-white dark:bg-slate-800/40 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-xl dark:shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <Input 
                label={t('login.email')} 
                type="email" 
                placeholder="admin@commission.sys"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
            />
            <Input 
                label={t('login.password')}
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
            />
            
            <Button className="w-full py-2.5 mt-2" size="lg" icon={<ArrowRight size={18} />}>
                {t('login.signIn')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-500">
                {t('login.mockEnv')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};