'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { surveysApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus, Search, Copy, Trash2, Eye, BarChart3,
  ChevronRight, Edit, Globe
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Survey {
  id: string; title: string; status: string;
  total_responses: string; total_sessions: string;
  created_at: string; ends_at: string | null;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active: { label: 'Ativa',      cls: 'bg-green-100 text-green-700' },
  draft:  { label: 'Rascunho',   cls: 'bg-yellow-100 text-yellow-700' },
  closed: { label: 'Encerrada',  cls: 'bg-gray-100 text-gray-600' },
};

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [filtered, setFiltered] = useState<Survey[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    surveysApi.list()
      .then(r => { setSurveys(r.data); setFiltered(r.data); })
      .catch(() => toast.error('Erro ao carregar pesquisas'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    let data = surveys;
    if (statusFilter !== 'all') data = data.filter(s => s.status === statusFilter);
    if (search) data = data.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));
    setFiltered(data);
  }, [search, statusFilter, surveys]);

  const handleDuplicate = async (id: string) => {
    try {
      await surveysApi.duplicate(id);
      toast.success('Pesquisa duplicada!');
      load();
    } catch { toast.error('Erro ao duplicar.'); }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Excluir "${title}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await surveysApi.delete(id);
      toast.success('Pesquisa excluída.');
      load();
    } catch { toast.error('Erro ao excluir.'); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pesquisas</h1>
          <p className="text-gray-500 text-sm mt-1">{surveys.length} pesquisa(s) no total</p>
        </div>
        <Link href="/admin/surveys/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Nova Pesquisa
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar pesquisas..."
            className="input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input w-40"
        >
          <option value="all">Todos status</option>
          <option value="active">Ativas</option>
          <option value="draft">Rascunhos</option>
          <option value="closed">Encerradas</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma pesquisa encontrada</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Título</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Respostas</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Conclusão</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Criada</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(s => {
                const sessions = parseInt(s.total_sessions || '0');
                const completed = parseInt(s.total_responses || '0');
                const rate = sessions > 0 ? Math.round((completed / sessions) * 100) : 0;
                const st = STATUS_LABELS[s.status] || STATUS_LABELS.draft;

                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{s.title}</p>
                      <p className="text-xs text-gray-500 font-mono">{s.id.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-semibold text-gray-900">{completed.toLocaleString('pt-BR')}</span>
                      <span className="text-gray-400 text-xs"> / {sessions}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div className="bg-brand-600 h-1.5 rounded-full" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-sm text-gray-600">{rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {formatDistanceToNow(new Date(s.created_at), { addSuffix: true, locale: ptBR })}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <Link href={`/survey/${s.id}`} target="_blank"
                          title="Ver formulário" className="p-1.5 text-gray-400 hover:text-brand-600 rounded transition-colors">
                          <Globe className="w-4 h-4" />
                        </Link>
                        <Link href={`/admin/surveys/${s.id}`}
                          title="Ver detalhes" className="p-1.5 text-gray-400 hover:text-brand-600 rounded transition-colors">
                          <BarChart3 className="w-4 h-4" />
                        </Link>
                        <Link href={`/admin/surveys/${s.id}/edit`}
                          title="Editar" className="p-1.5 text-gray-400 hover:text-green-600 rounded transition-colors">
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDuplicate(s.id)}
                          title="Duplicar" className="p-1.5 text-gray-400 hover:text-orange-600 rounded transition-colors">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s.id, s.title)}
                          title="Excluir" className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
