'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { surveysApi, statsApi, exportApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell
} from 'recharts';
import {
  ArrowLeft, Globe, Edit, Download, Play, RefreshCw,
  Users, CheckCircle, TrendingUp, AlertTriangle, Clock,
  BarChart3, FileText, Table, FileJson
} from 'lucide-react';

const COLORS = ['#4F46E5','#7C3AED','#2563EB','#0891B2','#059669','#D97706','#DC2626'];

export default function SurveyDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [survey, setSurvey] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [runningWeight, setRunningWeight] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview'|'questions'|'weighting'>('overview');

  useEffect(() => {
    Promise.all([surveysApi.get(id), statsApi.dashboard(id)])
      .then(([s, d]) => { setSurvey(s.data); setDashboard(d.data); })
      .catch(() => toast.error('Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRunWeighting = async () => {
    setRunningWeight(true);
    try {
      const { data } = await statsApi.runWeighting(id, {
        max_iterations: 100, convergence_tol: 0.001, weight_trim_max: 5.0
      });
      toast.success(
        data.converged
          ? `✅ Raking convergiu em ${data.iterations_used} iterações!`
          : `⚠️ Raking concluído (não convergiu) — ${data.iterations_used} iterações`
      );
      const d = await statsApi.dashboard(id);
      setDashboard(d.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao executar ponderação.');
    } finally {
      setRunningWeight(false);
    }
  };

  const downloadExport = (type: 'csv'|'excel'|'json') => {
    const urls = { csv: exportApi.csv(id), excel: exportApi.excel(id), json: exportApi.json(id) };
    const token = localStorage.getItem('auth_token');
    // Download autenticado
    fetch(urls[type], { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `pesquisa_${id.slice(0,8)}.${type === 'excel' ? 'xlsx' : type}`;
        a.click();
      })
      .catch(() => toast.error('Erro ao exportar.'));
  };

  if (loading) return (
    <div className="p-8 flex justify-center items-center min-h-screen">
      <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!survey) return <div className="p-8"><p>Pesquisa não encontrada.</p></div>;

  const ov = dashboard?.overview || {};
  const lw = dashboard?.last_weighting;

  const kpis = [
    { label: 'Respondentes', value: ov.completed?.toLocaleString('pt-BR') || '0', icon: Users, color: 'text-brand-600 bg-brand-50' },
    { label: 'Taxa conclusão', value: `${ov.completion_rate || 0}%`, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
    { label: 'Tempo médio', value: ov.avg_response_time_min ? `${ov.avg_response_time_min} min` : '—', icon: Clock, color: 'text-orange-600 bg-orange-50' },
    { label: 'Bots detectados', value: ov.suspected_bots || 0, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  ];

  // Agrupar respostas por pergunta/opção para o gráfico
  const questionCharts = survey.questions?.filter((q: any) =>
    ['single_choice','multiple_choice'].includes(q.type)
  ).map((q: any) => {
    const answers = (dashboard?.demographics || [])
      .filter(() => true); // simplificado — em prod filtraria por pergunta
    return { question: q, answers };
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 truncate">{survey.title}</h1>
            <span className={`badge ${survey.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {survey.status === 'active' ? 'Ativa' : survey.status === 'draft' ? 'Rascunho' : 'Encerrada'}
            </span>
          </div>
          <p className="text-gray-500 text-sm font-mono">{id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/survey/${id}`} target="_blank" className="btn-secondary">
            <Globe className="w-4 h-4" /> Ver formulário
          </Link>
          <Link href={`/admin/surveys/${id}/edit`} className="btn-secondary">
            <Edit className="w-4 h-4" /> Editar
          </Link>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {(['overview','questions','weighting'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}>
            {tab === 'overview' ? 'Visão Geral' : tab === 'questions' ? 'Resultados' : 'Ponderação'}
          </button>
        ))}
      </div>

      {/* ── Tab: Visão Geral ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map(({ label, value, icon: Icon, color }) => (
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

          {/* Gráfico de respostas por dia */}
          {dashboard?.responses_by_day?.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Respostas por dia</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dashboard.responses_by_day}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Distribuição demográfica */}
          {dashboard?.demographics?.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Distribuição demográfica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(
                  dashboard.demographics.reduce((acc: any, d: any) => {
                    if (!acc[d.demographic_key]) acc[d.demographic_key] = [];
                    acc[d.demographic_key].push({ name: d.category, value: parseInt(d.count) });
                    return acc;
                  }, {})
                ).map(([key, data]: any) => (
                  <div key={key}>
                    <p className="text-sm font-medium text-gray-700 capitalize mb-2">{key.replace('_', ' ')}</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={data} layout="vertical">
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {data.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exportação */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Exportar dados</h3>
            <div className="flex gap-3">
              <button onClick={() => downloadExport('csv')} className="btn-secondary">
                <FileText className="w-4 h-4" /> CSV
              </button>
              <button onClick={() => downloadExport('excel')} className="btn-secondary">
                <Table className="w-4 h-4" /> Excel
              </button>
              <button onClick={() => downloadExport('json')} className="btn-secondary">
                <FileJson className="w-4 h-4" /> JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Resultados ── */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {survey.questions?.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-gray-500">Nenhuma pergunta cadastrada.</p>
            </div>
          ) : (
            survey.questions?.map((q: any, i: number) => (
              <div key={q.id} className="card p-6">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{q.text}</p>
                    <span className="text-xs text-gray-400 capitalize">{q.type?.replace('_',' ')}</span>
                  </div>
                </div>
                {q.options && (
                  <div className="space-y-2">
                    {q.options.map((opt: any) => (
                      <div key={opt.value} className="flex items-center gap-3">
                        <div className="w-24 text-xs text-gray-600 truncate">{opt.label}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="bg-brand-500 h-2 rounded-full" style={{ width: '40%' }} />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-10 text-right">—</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Tab: Ponderação ── */}
      {activeTab === 'weighting' && (
        <div className="space-y-6">
          {/* Executar raking */}
          <div className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Algoritmo de Raking (IPF)</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Ajusta automaticamente os pesos dos respondentes para refletir
                  a distribuição real da população.
                </p>
              </div>
              <button onClick={handleRunWeighting} disabled={runningWeight} className="btn-primary">
                {runningWeight
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Calculando...</>
                  : <><Play className="w-4 h-4" /> Executar Raking</>
                }
              </button>
            </div>

            {lw && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">N efetivo</p>
                  <p className="font-bold text-gray-900">{lw.summary?.n_effective?.toLocaleString() || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Design Effect</p>
                  <p className="font-bold text-gray-900">{lw.summary?.design_effect?.toFixed(3) || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Iterações</p>
                  <p className="font-bold text-gray-900">{lw.iterations_used}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Convergiu?</p>
                  <p className={`font-bold ${lw.converged ? 'text-green-600' : 'text-orange-600'}`}>
                    {lw.converged ? 'Sim ✓' : 'Não ⚠'}
                  </p>
                </div>
                {lw.summary?.weight_stats && (
                  <>
                    <div>
                      <p className="text-xs text-gray-500">Peso mínimo</p>
                      <p className="font-bold text-gray-900">{lw.summary.weight_stats.min?.toFixed(3)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Peso máximo</p>
                      <p className="font-bold text-gray-900">{lw.summary.weight_stats.max?.toFixed(3)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Peso médio</p>
                      <p className="font-bold text-gray-900">{lw.summary.weight_stats.mean?.toFixed(3)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Pesos cortados</p>
                      <p className="font-bold text-gray-900">{lw.summary.trimmed_count}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Alvos populacionais */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Alvos populacionais</h3>
            <p className="text-sm text-gray-500 mb-4">
              Proporções da população usadas como referência para o raking.
            </p>
            {survey.population_targets?.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
                <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Nenhum alvo definido.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Use a rota <code className="bg-gray-100 px-1 rounded">POST /api/surveys/{'{id}'}/population-targets</code> para configurar.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(
                  (survey.population_targets || []).reduce((acc: any, t: any) => {
                    if (!acc[t.dimension]) acc[t.dimension] = [];
                    acc[t.dimension].push(t);
                    return acc;
                  }, {})
                ).map(([dim, targets]: any) => (
                  <div key={dim}>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{dim}</p>
                    <div className="space-y-1.5">
                      {targets.map((t: any) => (
                        <div key={t.category} className="flex items-center gap-3">
                          <span className="text-sm text-gray-700 w-28">{t.category}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-brand-500 h-1.5 rounded-full"
                              style={{ width: `${(parseFloat(t.proportion) * 100).toFixed(1)}%` }} />
                          </div>
                          <span className="text-sm font-medium text-gray-600 w-12 text-right">
                            {(parseFloat(t.proportion) * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
