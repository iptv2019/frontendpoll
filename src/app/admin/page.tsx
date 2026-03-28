'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { surveysApi } from '@/lib/api';
import {
  BarChart3, Users, CheckCircle, Clock, ChevronRight,
  Plus, TrendingUp, AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Survey {
  id: string;
  title: string;
  status: string;
  total_responses: string;
  total_sessions: string;
  created_at: string;
  ends_at: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    draft:  'bg-yellow-100 text-yellow-700',
    closed: 'bg-gray-100 text-gray-600',
  };
  const labels: Record<string, string> = {
    active: 'Ativa', draft: 'Rascunho', closed: 'Encerrada'
  };
  return (
    <span className={`badge ${map[status] || map.draft}`}>
      {labels[status] || status}
    </span>
  );
}

export default function AdminDashboard() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    surveysApi.list()
      .then(r => setSurveys(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const active   = surveys.filter(s => s.status === 'active').length;
  const total    = surveys.reduce((sum, s) => sum + parseInt(s.total_responses || '0'), 0);
  const sessions = surveys.reduce((sum, s) => sum + parseInt(s.total_sessions || '0'), 0);
  const completion = sessions > 0 ? Math.round((total / sessions) * 100) : 0;

  const stats = [
    { label: 'Pesquisas ativas', value: active, icon: BarChart3, color: 'text-brand-600 bg-brand-50' },
    { label: 'Total de respostas', value: total.toLocaleString('pt-BR'), icon: Users, color: 'text-green-600 bg-green-50' },
    { label: 'Taxa de conclusão', value: `${completion}%`, icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
    { label: 'Total de pesquisas', value: surveys.length, icon: CheckCircle, color: 'text-purple-600 bg-purple-50' },
  ];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Visão geral da plataforma</p>
        </div>
        <Link href="/admin/surveys/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Nova Pesquisa
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lista de pesquisas */}
      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Pesquisas recentes</h2>
          <Link href="/admin/surveys" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
            Ver todas <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {surveys.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma pesquisa criada ainda</p>
            <Link href="/admin/surveys/new" className="btn-primary mt-4 inline-flex">
              <Plus className="w-4 h-4" /> Criar primeira pesquisa
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {surveys.slice(0, 8).map(s => (
              <Link key={s.id} href={`/admin/surveys/${s.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 truncate">{s.title}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-xs text-gray-500">
                    Criada {formatDistanceToNow(new Date(s.created_at), { addSuffix: true, locale: ptBR })}
                    {s.ends_at && ` · Encerra ${formatDistanceToNow(new Date(s.ends_at), { addSuffix: true, locale: ptBR })}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{parseInt(s.total_responses || '0').toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-gray-500">respostas</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
