import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { getAuditLogs } from '../services/dataService';
import { AuditLogEntry } from '../types';
import { History, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from '../services/i18n';

export const Audit: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const fetchLogs = async (page: number) => {
    setLoading(true);
    try {
      const data = await getAuditLogs(page);
      setLogs(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <History className="text-slate-400" /> Auditoria
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Registro de atividades do sistema.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr className="border-b border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400">
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Ação</th>
                <th className="px-6 py-4 font-medium">Detalhes</th>
                <th className="px-6 py-4 font-medium">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                    <span className={`px-2 py-1 rounded text-xs ${
                        log.action.includes('CREATED') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                        log.action.includes('UPDATED') ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                        log.action.includes('DELETED') ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                        {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 max-w-md truncate">
                    {log.details}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs uppercase">
                    {log.user?.name || 'System'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
            <span className="text-xs text-slate-500">
                Página {pagination.page} de {pagination.pages} ({pagination.total} registros)
            </span>
            <div className="flex gap-2">
                <button
                    onClick={() => fetchLogs(pagination.page - 1)}
                    disabled={pagination.page <= 1 || loading}
                    className="p-2 rounded hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50"
                >
                    <ArrowLeft size={16} />
                </button>
                <button
                    onClick={() => fetchLogs(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages || loading}
                    className="p-2 rounded hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50"
                >
                    <ArrowRight size={16} />
                </button>
            </div>
        </div>
      </Card>
    </div>
  );
};
