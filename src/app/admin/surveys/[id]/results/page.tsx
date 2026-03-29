'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API = 'https://pesquisas-backendd.onrender.com';

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('auth_token') || '';
}

async function apiFetch(path: string, opts: any = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, ...(opts.headers||{}) }
  });
  return res.json();
}

// ─── Componente: Barra de resultado estilo pesquisa eleitoral ────────────────
function CandidateBar({ label, pct, rawPct, moe, color, rank }: {
  label: string; pct: number; rawPct: number; moe: number; color: string; rank: number;
}) {
  const lower = Math.max(0, pct - moe);
  const upper = Math.min(100, pct + moe);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 24, height: 24, borderRadius: '50%', background: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 'bold', color: 'white', flexShrink: 0
          }}>{rank}</span>
          <span style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>{label}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 22, fontWeight: 'bold', color: '#111827' }}>{pct.toFixed(1)}%</span>
          <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 6 }}>±{moe.toFixed(1)}%</span>
        </div>
      </div>

      {/* Barra principal */}
      <div style={{ position: 'relative', height: 32, background: '#f3f4f6', borderRadius: 6, overflow: 'visible' }}>
        {/* Barra bruta (fundo) */}
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          width: `${rawPct}%`, background: '#e5e7eb', borderRadius: 6, transition: 'width 0.8s ease'
        }} />
        {/* Barra ponderada */}
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          width: `${pct}%`, background: color, borderRadius: 6,
          transition: 'width 0.8s ease', opacity: 0.9
        }} />
        {/* Intervalo de confiança */}
        <div style={{
          position: 'absolute', top: '25%', height: '50%',
          left: `${lower}%`, width: `${upper - lower}%`,
          background: 'rgba(0,0,0,0.15)', borderRadius: 2
        }} />
      </div>

      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>
          IC 95%: {lower.toFixed(1)}% – {upper.toFixed(1)}%
        </span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>
          Bruto: {rawPct.toFixed(1)}% · Pond.: {pct.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ─── Componente: Card de indicador ───────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px' }}>
      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 'bold', color: color || '#111827', margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{sub}</p>}
    </div>
  );
}

// ─── Componente: Aprovação / Rejeição ────────────────────────────────────────
function ApprovalMeter({ approve, disapprove, dontKnow }: {
  approve: number; disapprove: number; dontKnow: number;
}) {
  return (
    <div>
      <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ width: `${approve}%`, background: '#16a34a', transition: 'width 0.8s ease' }} />
        <div style={{ width: `${dontKnow}%`, background: '#d1d5db' }} />
        <div style={{ width: `${disapprove}%`, background: '#dc2626', transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: '#16a34a' }} />
          <span style={{ fontSize: 13, color: '#374151' }}>Aprova <strong>{approve.toFixed(1)}%</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: '#d1d5db' }} />
          <span style={{ fontSize: 13, color: '#374151' }}>Não sabe <strong>{dontKnow.toFixed(1)}%</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: '#dc2626' }} />
          <span style={{ fontSize: 13, color: '#374151' }}>Rejeita <strong>{disapprove.toFixed(1)}%</strong></span>
        </div>
      </div>
    </div>
  );
}

const COLORS = ['#4F46E5','#0891b2','#16a34a','#d97706','#dc2626','#7c3aed','#db2777','#374151'];

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SurveyResultsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [survey, setSurvey]       = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [results, setResults]     = useState<any[]>([]);   // resultados ponderados por pergunta
  const [running, setRunning]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [lastRun, setLastRun]     = useState<any>(null);
  const [error, setError]         = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([
        apiFetch(`/api/surveys/${id}`),
        apiFetch(`/api/stats/${id}/dashboard`)
      ]);
      setSurvey(s);
      setDashboard(d);
      setLastRun(d.last_weighting);

      // Buscar resultados ponderados para cada pergunta de escolha
      const choiceQs = (s.questions || []).filter((q: any) =>
        ['single_choice','multiple_choice'].includes(q.type)
      );
      const resultsArr = await Promise.all(
        choiceQs.map((q: any) =>
          apiFetch(`/api/stats/${id}/question/${q.id}/weighted`)
            .then((r: any) => ({ question: q, data: r }))
            .catch(() => ({ question: q, data: null }))
        )
      );
      setResults(resultsArr.filter(r => r.data));
    } catch (e) {
      setError('Erro ao carregar dados.');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleRunRaking = async () => {
    setRunning(true);
    setError('');
    try {
      const r = await apiFetch(`/api/stats/${id}/run-weighting`, {
        method: 'POST',
        body: JSON.stringify({ max_iterations: 100, convergence_tol: 0.001, weight_trim_max: 5.0 })
      });
      if (r.error) throw new Error(r.error);
      await load();
    } catch (e: any) {
      setError(e.message || 'Erro ao executar raking.');
    }
    setRunning(false);
  };

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}>
      <div style={{ width:36, height:36, border:'4px solid #e5e7eb', borderTopColor:'#4F46E5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const ov = dashboard?.overview || {};
  const nEff = lastRun?.summary?.n_effective || ov.completed || 0;
  const deff = lastRun?.summary?.design_effect || 1;
  // Margem de erro geral (proporção 50% = pior caso)
  const moePct = nEff > 0 ? (1.96 * Math.sqrt(0.25 / nEff) * 100) : 0;

  return (
    <div style={{ padding: 32, maxWidth: 820, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <button onClick={()=>router.back()}
            style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, background:'white', cursor:'pointer', fontSize:14 }}>
            ←
          </button>
          <div>
            <h1 style={{ fontSize:22, fontWeight:'bold', color:'#111827', margin:0 }}>
              Resultados Ponderados
            </h1>
            <p style={{ fontSize:13, color:'#6b7280', margin:'2px 0 0' }}>{survey?.title}</p>
          </div>
        </div>
        <button onClick={handleRunRaking} disabled={running}
          style={{
            padding:'8px 18px', background: running ? '#818cf8' : '#4F46E5',
            color:'white', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500
          }}>
          {running ? '⟳ Calculando...' : '⚖️ Executar Raking'}
        </button>
      </div>

      {error && (
        <div style={{ padding:12, background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, color:'#dc2626', fontSize:13, marginBottom:16 }}>
          {error}
        </div>
      )}

      {!lastRun && (
        <div style={{ padding:16, background:'#fef9c3', border:'1px solid #fde047', borderRadius:8, marginBottom:20, fontSize:13, color:'#854d0e' }}>
          ⚠️ Raking ainda não foi executado. Clique em <strong>"Executar Raking"</strong> para ponderar os resultados.
          Os resultados abaixo são brutos (sem ponderação).
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        <StatCard label="Respondentes" value={String(ov.completed || 0)} sub="respostas completas" />
        <StatCard label="N efetivo" value={nEff > 0 ? String(nEff) : '—'}
          sub={lastRun ? `DEFF: ${deff.toFixed(2)}` : 'execute o raking'} />
        <StatCard label="Margem de erro" value={moePct > 0 ? `±${moePct.toFixed(1)}%` : '—'}
          sub="IC 95% · pior caso" color={moePct > 5 ? '#dc2626' : '#16a34a'} />
        <StatCard label="Status raking"
          value={lastRun ? (lastRun.converged ? 'Convergiu' : 'Não convergiu') : 'Pendente'}
          sub={lastRun ? `${lastRun.iterations_used} iterações` : ''}
          color={lastRun ? (lastRun.converged ? '#16a34a' : '#d97706') : '#6b7280'} />
      </div>

      {/* Raking info */}
      {lastRun?.summary?.weight_stats && (
        <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'14px 20px', marginBottom:24, display:'flex', gap:32, flexWrap:'wrap' }}>
          <div>
            <span style={{ fontSize:11, color:'#64748b', display:'block' }}>Peso mínimo</span>
            <span style={{ fontWeight:600, color:'#1e293b' }}>{lastRun.summary.weight_stats.min?.toFixed(3)}</span>
          </div>
          <div>
            <span style={{ fontSize:11, color:'#64748b', display:'block' }}>Peso máximo</span>
            <span style={{ fontWeight:600, color:'#1e293b' }}>{lastRun.summary.weight_stats.max?.toFixed(3)}</span>
          </div>
          <div>
            <span style={{ fontSize:11, color:'#64748b', display:'block' }}>Peso médio</span>
            <span style={{ fontWeight:600, color:'#1e293b' }}>{lastRun.summary.weight_stats.mean?.toFixed(3)}</span>
          </div>
          <div>
            <span style={{ fontSize:11, color:'#64748b', display:'block' }}>Pesos cortados</span>
            <span style={{ fontWeight:600, color:'#1e293b' }}>{lastRun.summary.trimmed_count}</span>
          </div>
          <div>
            <span style={{ fontSize:11, color:'#64748b', display:'block' }}>Erro final</span>
            <span style={{ fontWeight:600, color:'#1e293b' }}>{parseFloat(lastRun.final_error).toFixed(5)}</span>
          </div>
        </div>
      )}

      {/* Resultados por pergunta */}
      {results.length === 0 ? (
        <div style={{ textAlign:'center', padding:48, border:'2px dashed #e5e7eb', borderRadius:12 }}>
          <p style={{ color:'#9ca3af', fontSize:14 }}>
            Nenhum resultado disponível ainda.<br />
            Aguarde respostas e execute o raking.
          </p>
        </div>
      ) : (
        results.map(({ question, data }) => {
          const items = (data?.results || []);
          const nEffQ = data?.n_effective || nEff;
          if (!items.length) return null;

          // Detectar se é pergunta de aprovação
          const isApproval = question.demographic_key === null &&
            items.some((i: any) => ['aprova','aprovo','approve','sim','yes'].includes((i.choice||'').toLowerCase()));

          // Calcular margem de erro por item
          const withMoe = items.map((item: any) => {
            const p = parseFloat(item.weighted_proportion) || 0;
            const moe = nEffQ > 0 ? (1.96 * Math.sqrt(p * (1 - p) / nEffQ) * 100) : 0;
            const rawProp = items.reduce((s: number, i: any) => s + parseFloat(i.raw_count || 0), 0);
            const rawPct = rawProp > 0 ? (parseFloat(item.raw_count || 0) / rawProp * 100) : 0;
            return { ...item, moe, pct: p * 100, rawPct };
          }).sort((a: any, b: any) => b.pct - a.pct);

          // Detectar aprovação/rejeição para exibição especial
          const approveItem   = withMoe.find((i: any) => ['aprova','aprovo','approve','sim','yes'].includes((i.choice||'').toLowerCase()));
          const disapproveItem = withMoe.find((i: any) => ['reprova','reprovado','desaprova','nao','não','no','reject'].includes((i.choice||'').toLowerCase()));
          const dontKnowItem  = withMoe.find((i: any) => ['nao_sei','não_sei','nao sei','não sei','indeciso','dontknow'].includes((i.choice||'').toLowerCase()));

          const showApprovalMeter = approveItem && disapproveItem;

          return (
            <div key={question.id}
              style={{ background:'white', border:'1px solid #e5e7eb', borderRadius:12, padding:24, marginBottom:20 }}>
              {/* Cabeçalho da pergunta */}
              <div style={{ marginBottom:20 }}>
                <p style={{ fontWeight:600, color:'#111827', fontSize:16, margin:'0 0 4px' }}>
                  {question.text}
                </p>
                <div style={{ display:'flex', gap:16, fontSize:12, color:'#9ca3af' }}>
                  <span>N = {items.reduce((s: number, i: any) => s + parseInt(i.raw_count||0), 0)} respostas</span>
                  {nEffQ > 0 && <span>N efetivo = {nEffQ}</span>}
                  {withMoe[0]?.moe > 0 && <span>Maior MoE: ±{withMoe[0].moe.toFixed(1)}%</span>}
                </div>
              </div>

              {/* Medidor de aprovação (se aplicável) */}
              {showApprovalMeter && (
                <div style={{ marginBottom:20 }}>
                  <p style={{ fontSize:12, color:'#6b7280', marginBottom:8 }}>Aprovação / Rejeição</p>
                  <ApprovalMeter
                    approve={approveItem.pct}
                    disapprove={disapproveItem.pct}
                    dontKnow={dontKnowItem?.pct || 0}
                  />
                </div>
              )}

              {/* Barras por candidato/opção */}
              <div style={{ marginTop: showApprovalMeter ? 20 : 0 }}>
                {!showApprovalMeter && (
                  <p style={{ fontSize:12, color:'#6b7280', marginBottom:12 }}>
                    Resultado ponderado · A barra cinza mostra o resultado bruto (sem raking)
                  </p>
                )}
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
              </div>

              {/* Nota metodológica */}
              <div style={{ marginTop:16, paddingTop:12, borderTop:'1px solid #f3f4f6', fontSize:11, color:'#9ca3af' }}>
                {lastRun
                  ? `Resultado ponderado via Raking IPF · ${lastRun.iterations_used} iterações · DEFF ${deff.toFixed(2)} · IC 95%`
                  : 'Resultado bruto — execute o raking para ponderar os dados'}
              </div>
            </div>
          );
        })
      )}

      {/* Legenda metodológica */}
      <div style={{ background:'#f8fafc', borderRadius:10, padding:'16px 20px', fontSize:12, color:'#64748b', marginTop:8 }}>
        <strong style={{ color:'#334155' }}>Nota metodológica:</strong>{' '}
        Os resultados ponderados utilizam o algoritmo de Raking IPF (Iterative Proportional Fitting)
        para ajustar a amostra às proporções populacionais. A margem de erro considera o Design Effect
        (DEFF) da ponderação. IC 95% indica que em 95 de cada 100 pesquisas realizadas com a mesma
        metodologia, o resultado verdadeiro estará dentro do intervalo apresentado.
      </div>
    </div>
  );
}
