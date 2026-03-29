'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell
} from 'recharts';
import { Globe, Edit, Download, Play, RefreshCw, Users, CheckCircle, Clock, AlertTriangle, FileText, Table, FileJson } from 'lucide-react';

const API = 'https://pesquisas-backendd.onrender.com';
const COLORS = ['#4F46E5','#0891b2','#16a34a','#d97706','#dc2626','#7c3aed','#db2777'];

function tok() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('auth_token') || '';
}

async function get(path: string) {
  const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${tok()}` } });
  return r.json();
}

async function post(path: string, body: any) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
    body: JSON.stringify(body)
  });
  return r.json();
}

function StatCard({ label, value, sub, color }: any) {
  return (
    <div style={{ background:'white', border:'1px solid #e5e7eb', borderRadius:10, padding:'16px 20px' }}>
      <p style={{ fontSize:12, color:'#6b7280', margin:'0 0 4px' }}>{label}</p>
      <p style={{ fontSize:24, fontWeight:'bold', color: color||'#111827', margin:0 }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:'#9ca3af', margin:'2px 0 0' }}>{sub}</p>}
    </div>
  );
}

function CandidateBar({ label, pct, rawPct, moe, color, rank }: any) {
  const lower = Math.max(0, pct - moe);
  const upper = Math.min(100, pct + moe);
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ width:24, height:24, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:'bold', color:'white', flexShrink:0 }}>{rank}</span>
          <span style={{ fontWeight:600, color:'#111827', fontSize:15 }}>{label}</span>
        </div>
        <div style={{ textAlign:'right' }}>
          <span style={{ fontSize:22, fontWeight:'bold', color:'#111827' }}>{pct.toFixed(1)}%</span>
          <span style={{ fontSize:12, color:'#6b7280', marginLeft:6 }}>±{moe.toFixed(1)}%</span>
        </div>
      </div>
      <div style={{ position:'relative', height:32, background:'#f3f4f6', borderRadius:6 }}>
        <div style={{ position:'absolute', top:0, left:0, height:'100%', width:`${rawPct}%`, background:'#e5e7eb', borderRadius:6 }} />
        <div style={{ position:'absolute', top:0, left:0, height:'100%', width:`${pct}%`, background:color, borderRadius:6, opacity:0.9 }} />
        <div style={{ position:'absolute', top:'25%', height:'50%', left:`${lower}%`, width:`${upper-lower}%`, background:'rgba(0,0,0,0.15)', borderRadius:2 }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        <span style={{ fontSize:11, color:'#9ca3af' }}>IC 95%: {lower.toFixed(1)}% – {upper.toFixed(1)}%</span>
        <span style={{ fontSize:11, color:'#9ca3af' }}>Bruto: {rawPct.toFixed(1)}% · Pond.: {pct.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export default function SurveyDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [survey, setSurvey]       = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [weightedResults, setWeightedResults] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [running, setRunning]     = useState(false);
  const [tab, setTab]             = useState<'overview'|'results'|'weighting'>('overview');
  const [msg, setMsg]             = useState('');
  const [msgType, setMsgType]     = useState<'ok'|'err'>('ok');

  const load = async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([get(`/api/surveys/${id}`), get(`/api/stats/${id}/dashboard`)]);
      setSurvey(s);
      setDashboard(d);

      // Buscar resultados ponderados para perguntas de escolha
      const choiceQs = (s.questions || []).filter((q: any) =>
        ['single_choice','multiple_choice'].includes(q.type) && !q.demographic_key
      );
      const allQs = (s.questions || []).filter((q: any) =>
        ['single_choice','multiple_choice'].includes(q.type)
      );

      const res = await Promise.all(
        allQs.map((q: any) =>
          get(`/api/stats/${id}/question/${q.id}/weighted`)
            .then((r: any) => ({ question: q, data: r }))
            .catch(() => ({ question: q, data: null }))
        )
      );
      setWeightedResults(res.filter(r => r.data?.results?.length > 0));
    } catch(e) {
      setMsg('Erro ao carregar dados.'); setMsgType('err');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleRaking = async () => {
    setRunning(true); setMsg('');
    try {
      const r = await post(`/api/stats/${id}/run-weighting`, {
        max_iterations: 100, convergence_tol: 0.001, weight_trim_max: 5.0
      });
      if (r.error) throw new Error(r.error);
      setMsg(r.converged ? `✅ Raking convergiu em ${r.iterations_used} iterações!` : `⚠️ Concluído sem convergir — ${r.iterations_used} iterações`);
      setMsgType(r.converged ? 'ok' : 'err');
      await load();
    } catch(e: any) {
      setMsg(e.message || 'Erro ao executar raking.'); setMsgType('err');
    }
    setRunning(false);
  };

  const downloadExport = (type: string) => {
    const url = `${API}/api/export/${id}/${type}`;
    fetch(url, { headers: { Authorization: `Bearer ${tok()}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `pesquisa_${id.slice(0,8)}.${type === 'excel' ? 'xlsx' : type}`;
        a.click();
      });
  };

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}>
      <div style={{ width:36, height:36, border:'4px solid #e5e7eb', borderTopColor:'#4F46E5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const ov = dashboard?.overview || {};
  const lw = dashboard?.last_weighting;
  const nEff = lw?.summary?.n_effective || ov.completed || 0;
  const deff = lw?.summary?.design_effect || 1;
  const moePct = nEff > 0 ? (1.96 * Math.sqrt(0.25 / nEff) * 100) : 0;

  const statusColor: any = { active:'#dcfce7', draft:'#fef9c3', closed:'#f3f4f6' };
  const statusText: any  = { active:'Ativa', draft:'Rascunho', closed:'Encerrada' };
  const statusFg: any    = { active:'#15803d', draft:'#854d0e', closed:'#374151' };

  return (
    <div style={{ padding:32, maxWidth:860, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <button onClick={()=>router.back()} style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, background:'white', cursor:'pointer' }}>←</button>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <h1 style={{ fontSize:20, fontWeight:'bold', color:'#111827', margin:0 }}>{survey?.title}</h1>
              <span style={{ padding:'2px 10px', borderRadius:999, fontSize:12, fontWeight:500,
                background: statusColor[survey?.status] || '#f3f4f6',
                color: statusFg[survey?.status] || '#374151' }}>
                {statusText[survey?.status] || survey?.status}
              </span>
            </div>
            <p style={{ fontSize:12, color:'#9ca3af', margin:'2px 0 0', fontFamily:'monospace' }}>{id}</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <a href={`/survey/${id}`} target="_blank"
            style={{ padding:'7px 14px', border:'1px solid #e5e7eb', borderRadius:8, background:'white', cursor:'pointer', fontSize:13, textDecoration:'none', color:'#374151', display:'flex', alignItems:'center', gap:6 }}>
            🌐 Ver formulário
          </a>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display:'flex', gap:4, background:'#f3f4f6', borderRadius:10, padding:4, width:'fit-content', marginBottom:24 }}>
        {(['overview','results','weighting'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)}
            style={{ padding:'7px 18px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'none',
              background: tab===t ? 'white' : 'transparent',
              color: tab===t ? '#111827' : '#6b7280',
              boxShadow: tab===t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            {t==='overview' ? 'Visão Geral' : t==='results' ? 'Resultados' : 'Ponderação'}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ padding:12, borderRadius:8, marginBottom:16, fontSize:13,
          background: msgType==='ok' ? '#dcfce7' : '#fee2e2',
          color: msgType==='ok' ? '#15803d' : '#dc2626',
          border: `1px solid ${msgType==='ok' ? '#86efac' : '#fca5a5'}` }}>
          {msg}
        </div>
      )}

      {/* ── Visão Geral ── */}
      {tab === 'overview' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
            <StatCard label="Respondentes" value={ov.completed || 0} sub="respostas completas" />
            <StatCard label="Taxa conclusão" value={`${ov.completion_rate || 0}%`} sub="das sessões iniciadas" />
            <StatCard label="Tempo médio" value={ov.avg_response_time_min ? `${ov.avg_response_time_min} min` : '—'} />
            <StatCard label="Bots detectados" value={ov.suspected_bots || 0} color={ov.suspected_bots > 0 ? '#dc2626' : '#111827'} />
          </div>

          {/* Respostas por dia */}
          {dashboard?.responses_by_day?.length > 0 && (
            <div style={{ background:'white', border:'1px solid #e5e7eb', borderRadius:12, padding:24, marginBottom:16 }}>
              <p style={{ fontWeight:600, color:'#111827', marginBottom:16, marginTop:0 }}>Respostas por dia</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={dashboard.responses_by_day}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize:11 }} />
                  <YAxis tick={{ fontSize:11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Exportação */}
          <div style={{ background:'white', border:'1px solid #e5e7eb', borderRadius:12, padding:24 }}>
            <p style={{ fontWeight:600, color:'#111827', marginBottom:16, marginTop:0 }}>Exportar dados</p>
            <div style={{ display:'flex', gap:10 }}>
              {[['csv','📄 CSV'],['excel','📊 Excel'],['json','📋 JSON']].map(([type, label]) => (
                <button key={type} onClick={()=>downloadExport(type)}
                  style={{ padding:'8px 16px', border:'1px solid #e5e7eb', borderRadius:8, background:'white', cursor:'pointer', fontSize:13 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Resultados Ponderados ── */}
      {tab === 'results' && (
        <div>
          {!lw && (
            <div style={{ padding:14, background:'#fef9c3', border:'1px solid #fde047', borderRadius:8, marginBottom:20, fontSize:13, color:'#854d0e' }}>
              ⚠️ Raking ainda não executado — vá na aba <strong>Ponderação</strong> e clique em <strong>Executar Raking</strong> para ponderar os resultados.
            </div>
          )}

          {/* KPIs de qualidade */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
            <StatCard label="N efetivo" value={nEff > 0 ? String(nEff) : '—'} sub={lw ? `DEFF: ${deff.toFixed(2)}` : 'execute o raking'} />
            <StatCard label="Margem de erro" value={moePct > 0 ? `±${moePct.toFixed(1)}%` : '—'} sub="IC 95% · pior caso" color={moePct > 5 ? '#dc2626' : '#16a34a'} />
            <StatCard label="Status" value={lw ? (lw.converged ? '✅ Convergiu' : '⚠️ Não convergiu') : 'Pendente'}
              sub={lw ? `${lw.iterations_used} iterações` : ''} />
          </div>

          {weightedResults.length === 0 ? (
            <div style={{ textAlign:'center', padding:48, border:'2px dashed #e5e7eb', borderRadius:12 }}>
              <p style={{ color:'#9ca3af', fontSize:14, margin:0 }}>
                Nenhum resultado disponível.<br/>Aguarde respostas e execute o raking.
              </p>
            </div>
          ) : (
            weightedResults.map(({ question, data }) => {
              const items = data?.results || [];
              const nEffQ = data?.n_effective || nEff;
              const total = items.reduce((s: number, i: any) => s + parseInt(i.raw_count||0), 0);

              const withMoe = items.map((item: any) => {
                const p = parseFloat(item.weighted_proportion) || 0;
                const moe = nEffQ > 0 ? (1.96 * Math.sqrt(Math.max(p*(1-p),0.0001) / nEffQ) * 100) : 0;
                const rawPct = total > 0 ? (parseInt(item.raw_count||0) / total * 100) : 0;
                return { ...item, moe, pct: p * 100, rawPct };
              }).sort((a: any, b: any) => b.pct - a.pct);

              return (
                <div key={question.id}
                  style={{ background:'white', border:'1px solid #e5e7eb', borderRadius:12, padding:24, marginBottom:20 }}>
                  <div style={{ marginBottom:20 }}>
                    <p style={{ fontWeight:600, color:'#111827', fontSize:16, margin:'0 0 4px' }}>{question.text}</p>
                    <div style={{ display:'flex', gap:16, fontSize:12, color:'#9ca3af' }}>
                      <span>N = {total} respostas</span>
                      {nEffQ > 0 && <span>N efetivo = {nEffQ}</span>}
                    </div>
                  </div>

                  <p style={{ fontSize:12, color:'#6b7280', marginBottom:12 }}>
                    Barra colorida = ponderado · Barra cinza = bruto (sem raking)
                  </p>

                  {withMoe.map((item: any, i: number) => (
                    <CandidateBar
                      key={item.choice}
                      rank={i + 1}
                      label={item.choice || '(sem resposta)'}
                      pct={item.pct}
                      rawPct={item.rawPct}
                      moe={item.moe}
                      color={COLORS[i % COLORS.length]}
                    />
                  ))}

                  <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid #f3f4f6', fontSize:11, color:'#9ca3af' }}>
                    {lw ? `Ponderado via Raking IPF · ${lw.iterations_used} iterações · DEFF ${deff.toFixed(2)} · IC 95%`
                        : 'Resultado bruto — execute o raking para ponderar'}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Ponderação ── */}
      {tab === 'weighting' && (
        <div>
          {/* Executar raking */}
          <div style={{ background:'white', border:'1px solid #e5e7eb', borderRadius:12, padding:24, marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
              <div>
                <p style={{ fontWeight:600, color:'#111827', margin:'0 0 4px' }}>Algoritmo de Raking (IPF)</p>
                <p style={{ fontSize:13, color:'#6b7280', margin:0 }}>
                  Ajusta automaticamente os pesos dos respondentes para refletir a distribuição real da população.
                </p>
              </div>
              <button onClick={handleRaking} disabled={running}
                style={{ padding:'8px 18px', background: running?'#818cf8':'#4F46E5', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, whiteSpace:'nowrap', marginLeft:16 }}>
                {running ? '⟳ Calculando...' : '⚖️ Executar Raking'}
              </button>
            </div>

            {lw && (
              <div style={{ marginTop:16, padding:14, background:'#f8fafc', borderRadius:8, display:'flex', gap:24, flexWrap:'wrap' }}>
                {[
                  ['N efetivo', lw.summary?.n_effective],
                  ['Design Effect', lw.summary?.design_effect?.toFixed(3)],
                  ['Iterações', lw.iterations_used],
                  ['Convergiu', lw.converged ? 'Sim ✓' : 'Não ⚠'],
                  ['Peso mín.', lw.summary?.weight_stats?.min?.toFixed(3)],
                  ['Peso máx.', lw.summary?.weight_stats?.max?.toFixed(3)],
                  ['Peso médio', lw.summary?.weight_stats?.mean?.toFixed(3)],
                  ['Pesos cortados', lw.summary?.trimmed_count],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <span style={{ fontSize:11, color:'#64748b', display:'block' }}>{label}</span>
                    <span style={{ fontWeight:600, color:'#1e293b' }}>{value ?? '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alvos populacionais */}
          <div style={{ background:'white', border:'1px solid #e5e7eb', borderRadius:12, padding:24 }}>
            <p style={{ fontWeight:600, color:'#111827', margin:'0 0 4px' }}>Alvos populacionais</p>
            <p style={{ fontSize:13, color:'#6b7280', margin:'0 0 16px' }}>Proporções da população usadas como referência para o raking.</p>

            {!survey?.population_targets?.length ? (
              <div style={{ textAlign:'center', padding:32, border:'2px dashed #e5e7eb', borderRadius:8 }}>
                <p style={{ color:'#9ca3af', fontSize:13, margin:0 }}>Nenhum alvo definido. Configure ao criar a pesquisa.</p>
              </div>
            ) : (
              Object.entries(
                (survey.population_targets || []).reduce((acc: any, t: any) => {
                  if (!acc[t.dimension]) acc[t.dimension] = [];
                  acc[t.dimension].push(t);
                  return acc;
                }, {})
              ).map(([dim, targets]: any) => (
                <div key={dim} style={{ marginBottom:20 }}>
                  <p style={{ fontSize:12, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:1, margin:'0 0 10px' }}>{dim}</p>
                  {targets.map((t: any) => (
                    <div key={t.category} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                      <span style={{ fontSize:13, color:'#374151', width:160 }}>{t.category}</span>
                      <div style={{ flex:1, background:'#f3f4f6', borderRadius:4, height:8 }}>
                        <div style={{ width:`${(parseFloat(t.proportion)*100).toFixed(1)}%`, background:'#4F46E5', height:8, borderRadius:4 }} />
                      </div>
                      <span style={{ fontSize:13, fontWeight:500, color:'#374151', width:48, textAlign:'right' }}>
                        {(parseFloat(t.proportion)*100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
