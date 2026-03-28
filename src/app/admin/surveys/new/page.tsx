'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  Plus, Trash2, GripVertical, ArrowLeft, Save,
  ChevronDown, ChevronUp, Target
} from 'lucide-react';

const QUESTION_TYPES = [
  { value: 'single_choice',   label: 'Escolha única' },
  { value: 'multiple_choice', label: 'Múltipla escolha' },
  { value: 'scale',           label: 'Escala numérica' },
  { value: 'open_text',       label: 'Texto aberto' },
  { value: 'rating',          label: 'Avaliação (estrelas)' },
];

const DEMOGRAPHIC_KEYS = [
  { value: '',          label: 'Não demográfica' },
  { value: 'gender',    label: 'Gênero' },
  { value: 'age_group', label: 'Faixa etária' },
  { value: 'region',    label: 'Região' },
  { value: 'income',    label: 'Renda' },
  { value: 'education', label: 'Escolaridade' },
];

const DIMENSION_CATEGORIES: Record<string, { label: string; value: string }[]> = {
  gender: [
    { label: 'Masculino', value: 'male' },
    { label: 'Feminino',  value: 'female' },
    { label: 'Outro',     value: 'other' },
  ],
  age_group: [
    { label: '16 a 24 anos',    value: '16-24' },
    { label: '25 a 34 anos',    value: '25-34' },
    { label: '35 a 44 anos',    value: '35-44' },
    { label: '45 a 59 anos',    value: '45-59' },
    { label: '60 anos ou mais', value: '60+' },
  ],
  income: [
    { label: 'Até R$ 1.500',         value: 'ate_1500' },
    { label: 'R$ 1.500 a R$ 3.000',  value: '1500_3000' },
    { label: 'R$ 3.000 a R$ 6.000',  value: '3000_6000' },
    { label: 'R$ 6.000 a R$ 12.000', value: '6000_12000' },
    { label: 'Acima de R$ 12.000',   value: 'acima_12000' },
  ],
  education: [
    { label: 'Sem escolaridade',  value: 'sem_escolaridade' },
    { label: 'Ensino fundamental', value: 'fundamental' },
    { label: 'Ensino médio',      value: 'medio' },
    { label: 'Ensino superior',   value: 'superior' },
    { label: 'Pós-graduação',     value: 'pos_graduacao' },
  ],
  region: [
    { label: 'Norte',        value: 'norte' },
    { label: 'Nordeste',     value: 'nordeste' },
    { label: 'Centro-Oeste', value: 'centro-oeste' },
    { label: 'Sudeste',      value: 'sudeste' },
    { label: 'Sul',          value: 'sul' },
  ],
};

const DEFAULT_PROPORTIONS: Record<string, Record<string, number>> = {
  gender:    { male: 0.482, female: 0.512, other: 0.006 },
  age_group: { '16-24': 0.14, '25-34': 0.22, '35-44': 0.21, '45-59': 0.26, '60+': 0.17 },
  region:    { norte: 0.085, nordeste: 0.275, 'centro-oeste': 0.075, sudeste: 0.425, sul: 0.140 },
  income:    { ate_1500: 0.35, '1500_3000': 0.30, '3000_6000': 0.20, '6000_12000': 0.10, acima_12000: 0.05 },
  education: { sem_escolaridade: 0.05, fundamental: 0.30, medio: 0.38, superior: 0.20, pos_graduacao: 0.07 },
};

const DIM_LABELS: Record<string, string> = {
  gender: 'Gênero', age_group: 'Faixa etária',
  region: 'Região', income: 'Renda', education: 'Escolaridade'
};

function QuestionEditor({ index, onRemove, register, watch, setValue }: any) {
  const [expanded, setExpanded] = useState(true);
  const type = watch(`questions.${index}.type`);

  const addOption = () => {
    const opts = watch(`questions.${index}.options`) || [];
    setValue(`questions.${index}.options`, [...opts, { label: '', value: '' }]);
  };
  const removeOption = (i: number) => {
    const opts = watch(`questions.${index}.options`) || [];
    setValue(`questions.${index}.options`, opts.filter((_: any, j: number) => j !== i));
  };

  return (
    <div style={{borderLeft:'4px solid #4F46E5', borderRadius:8, background:'white', border:'1px solid #e5e7eb', marginBottom:8}}>
      <div style={{display:'flex', alignItems:'center', gap:12, padding:16}}>
        <span style={{fontSize:12, fontWeight:'bold', color:'#9ca3af', width:20}}>{index+1}</span>
        <div style={{flex:1, minWidth:0}}>
          <p style={{fontWeight:500, color:'#111827', fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
            {watch(`questions.${index}.text`) || 'Nova pergunta'}
          </p>
          <p style={{fontSize:11, color:'#9ca3af'}}>{QUESTION_TYPES.find(t=>t.value===type)?.label}</p>
        </div>
        <button type="button" onClick={()=>setExpanded(!expanded)} style={{padding:4, color:'#9ca3af', background:'none', border:'none', cursor:'pointer'}}>
          {expanded ? '▲' : '▼'}
        </button>
        <button type="button" onClick={onRemove} style={{padding:4, color:'#9ca3af', background:'none', border:'none', cursor:'pointer'}}>
          🗑
        </button>
      </div>

      {expanded && (
        <div style={{padding:'0 16px 16px', borderTop:'1px solid #f3f4f6'}}>
          <div style={{marginTop:12}}>
            <label style={{display:'block', fontSize:13, fontWeight:500, color:'#374151', marginBottom:4}}>Texto da pergunta *</label>
            <input {...register(`questions.${index}.text`, {required:true})}
              style={{width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:14, boxSizing:'border-box'}}
              placeholder="Digite a pergunta..." />
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12}}>
            <div>
              <label style={{display:'block', fontSize:13, fontWeight:500, color:'#374151', marginBottom:4}}>Tipo</label>
              <select {...register(`questions.${index}.type`)} style={{width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:14}}>
                {QUESTION_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:'block', fontSize:13, fontWeight:500, color:'#374151', marginBottom:4}}>Variável demográfica</label>
              <select {...register(`questions.${index}.demographic_key`)} style={{width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:14}}>
                {DEMOGRAPHIC_KEYS.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>

          {(type==='single_choice'||type==='multiple_choice') && (
            <div style={{marginTop:12}}>
              <label style={{display:'block', fontSize:13, fontWeight:500, color:'#374151', marginBottom:4}}>Opções</label>
              {(watch(`questions.${index}.options`)||[]).map((opt:any,i:number)=>(
                <div key={i} style={{display:'flex', gap:8, marginBottom:8}}>
                  <input value={opt.label}
                    onChange={e=>{
                      const opts=[...(watch(`questions.${index}.options`)||[])];
                      opts[i]={label:e.target.value, value:e.target.value.toLowerCase().replace(/\s+/g,'_')};
                      setValue(`questions.${index}.options`, opts);
                    }}
                    style={{flex:1, padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:14}}
                    placeholder={`Opção ${i+1}`} />
                  <button type="button" onClick={()=>removeOption(i)} style={{padding:8, color:'#9ca3af', background:'none', border:'none', cursor:'pointer'}}>🗑</button>
                </div>
              ))}
              <button type="button" onClick={addOption}
                style={{padding:'6px 12px', border:'1px solid #d1d5db', borderRadius:8, background:'white', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:4}}>
                + Adicionar opção
              </button>
            </div>
          )}

          {type==='scale' && (
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginTop:12}}>
              {['min','max','step'].map(k=>(
                <div key={k}>
                  <label style={{display:'block', fontSize:13, fontWeight:500, color:'#374151', marginBottom:4}}>{k==='min'?'Mínimo':k==='max'?'Máximo':'Passo'}</label>
                  <input type="number" {...register(`questions.${index}.settings.${k}`, {valueAsNumber:true})}
                    defaultValue={k==='max'?10:1}
                    style={{width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:14, boxSizing:'border-box'}} />
                </div>
              ))}
            </div>
          )}

          <label style={{display:'flex', alignItems:'center', gap:8, fontSize:14, color:'#374151', cursor:'pointer', marginTop:12}}>
            <input type="checkbox" {...register(`questions.${index}.required`)} defaultChecked />
            Resposta obrigatória
          </label>
        </div>
      )}
    </div>
  );
}

function PopulationTargetsEditor({ targets, setTargets }: { targets: any[]; setTargets: (t:any[])=>void }) {
  const [activeDimensions, setActiveDimensions] = useState<string[]>([]);

  const toggleDimension = (dim: string) => {
    if (activeDimensions.includes(dim)) {
      setActiveDimensions(activeDimensions.filter(d=>d!==dim));
      setTargets(targets.filter(t=>t.dimension!==dim));
    } else {
      setActiveDimensions([...activeDimensions, dim]);
      const cats = DIMENSION_CATEGORIES[dim]||[];
      const defaults = DEFAULT_PROPORTIONS[dim]||{};
      const newT = cats.map(c=>({dimension:dim, category:c.value, proportion: defaults[c.value]||parseFloat((1/cats.length).toFixed(3))}));
      setTargets([...targets.filter(t=>t.dimension!==dim), ...newT]);
    }
  };

  const updateProp = (dim: string, cat: string, val: number) => {
    setTargets(targets.map(t=>t.dimension===dim&&t.category===cat?{...t,proportion:val}:t));
  };

  const sumByDim = (dim: string) => targets.filter(t=>t.dimension===dim).reduce((s,t)=>s+(t.proportion||0),0);

  return (
    <div style={{background:'white', borderRadius:12, border:'1px solid #e5e7eb', padding:24}}>
      <h2 style={{fontWeight:600, color:'#111827', marginBottom:4, display:'flex', alignItems:'center', gap:8}}>
        🎯 Alvos populacionais para Raking
      </h2>
      <p style={{fontSize:13, color:'#6b7280', marginBottom:16}}>
        Selecione as dimensões e defina as proporções. Valores pré-preenchidos com dados do IBGE.
      </p>

      <div style={{display:'flex', flexWrap:'wrap', gap:8, marginBottom:16}}>
        {Object.keys(DIMENSION_CATEGORIES).map(dim=>(
          <button key={dim} type="button" onClick={()=>toggleDimension(dim)}
            style={{
              padding:'6px 16px', borderRadius:999, fontSize:13, fontWeight:500, cursor:'pointer',
              background: activeDimensions.includes(dim) ? '#4F46E5' : 'white',
              color: activeDimensions.includes(dim) ? 'white' : '#374151',
              border: activeDimensions.includes(dim) ? '1px solid #4F46E5' : '1px solid #d1d5db',
            }}>
            {DIM_LABELS[dim]}
          </button>
        ))}
      </div>

      {activeDimensions.map(dim=>{
        const sum = sumByDim(dim);
        const valid = Math.abs(sum-1.0)<0.01;
        return (
          <div key={dim} style={{border:'1px solid #e5e7eb', borderRadius:8, padding:16, marginBottom:12}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
              <p style={{fontWeight:500, color:'#1f2937'}}>{DIM_LABELS[dim]}</p>
              <span style={{fontSize:12, padding:'2px 8px', borderRadius:999, background: valid?'#dcfce7':'#fee2e2', color: valid?'#15803d':'#dc2626'}}>
                Soma: {(sum*100).toFixed(1)}% {valid?'✓':'≠ 100%'}
              </span>
            </div>
            {(DIMENSION_CATEGORIES[dim]||[]).map(cat=>{
              const t = targets.find(t=>t.dimension===dim&&t.category===cat.value);
              const pct = ((t?.proportion||0)*100);
              return (
                <div key={cat.value} style={{display:'flex', alignItems:'center', gap:12, marginBottom:8}}>
                  <span style={{fontSize:13, color:'#374151', width:160, flexShrink:0}}>{cat.label}</span>
                  <input type="range" min="0" max="100" step="0.1" value={pct}
                    onChange={e=>updateProp(dim,cat.value,parseFloat(e.target.value)/100)}
                    style={{flex:1, accentColor:'#4F46E5'}} />
                  <div style={{display:'flex', alignItems:'center', gap:4}}>
                    <input type="number" min="0" max="100" step="0.1" value={pct.toFixed(1)}
                      onChange={e=>updateProp(dim,cat.value,parseFloat(e.target.value)/100)}
                      style={{width:60, padding:'4px 8px', border:'1px solid #d1d5db', borderRadius:6, fontSize:12}} />
                    <span style={{fontSize:12, color:'#9ca3af'}}>%</span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {activeDimensions.length===0 && (
        <div style={{textAlign:'center', padding:'24px', border:'2px dashed #e5e7eb', borderRadius:8}}>
          <p style={{fontSize:13, color:'#9ca3af'}}>Selecione ao menos uma dimensão para configurar os alvos</p>
        </div>
      )}
    </div>
  );
}

export default function NewSurveyPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [populationTargets, setPopulationTargets] = useState<any[]>([]);
  const [error, setError] = useState('');

  const { register, handleSubmit, control, watch, setValue } = useForm({
    defaultValues: {
      status: 'draft', allow_anonymous: true,
      randomize_questions: false, max_responses_per_ip: 1,
      questions: [{
        type: 'single_choice', text: '', description: '', required: true,
        demographic_key: '', options: [{label:'Sim',value:'sim'},{label:'Não',value:'nao'}],
        settings: {min:1, max:10, step:1}
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({control, name:'questions'});

  const onSubmit = async (data: any) => {
    const dims = Array.from(new Set(populationTargets.map((t:any)=>t.dimension)));
    for (const dim of dims) {
      const sum = populationTargets.filter((t:any)=>t.dimension===dim).reduce((s:number,t:any)=>s+t.proportion,0);
      if (Math.abs(sum-1.0)>0.01) {
        setError(`Proporções de "${DIM_LABELS[dim]}" somam ${(sum*100).toFixed(1)}% — devem somar 100%.`);
        return;
      }
    }
    setError('');
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('https://pesquisas-backendd.onrender.com/api/surveys', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body: JSON.stringify({...data, population_targets: populationTargets})
      });
      const survey = await res.json();
      if (!res.ok) throw new Error(survey.error||'Erro');
      router.push(`/admin/surveys/${survey.id}`);
    } catch(err:any) {
      setError(err.message||'Erro ao criar pesquisa.');
    } finally {
      setSaving(false);
    }
  };

  const s = (label: string) => ({display:'block', fontSize:13, fontWeight:500, color:'#374151', marginBottom:4});
  const inputStyle = {width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:14, boxSizing:'border-box' as const};

  return (
    <div style={{padding:32, maxWidth:720, margin:'0 auto'}}>
      <div style={{display:'flex', alignItems:'center', gap:16, marginBottom:32}}>
        <button onClick={()=>router.back()} style={{padding:8, background:'none', border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer'}}>←</button>
        <div>
          <h1 style={{fontSize:24, fontWeight:'bold', color:'#111827', margin:0}}>Nova Pesquisa</h1>
          <p style={{fontSize:13, color:'#6b7280', margin:0}}>Configure e publique sua pesquisa</p>
        </div>
      </div>

      {error && <div style={{padding:12, background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, color:'#dc2626', fontSize:13, marginBottom:16}}>{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Básico */}
        <div style={{background:'white', borderRadius:12, border:'1px solid #e5e7eb', padding:24, marginBottom:16}}>
          <h2 style={{fontWeight:600, color:'#111827', marginBottom:16}}>Informações básicas</h2>
          <div style={{marginBottom:12}}>
            <label style={s('Título')}>Título da pesquisa *</label>
            <input {...register('title',{required:true})} style={inputStyle} placeholder="Ex: Pesquisa de Opinião 2026" />
          </div>
          <div style={{marginBottom:12}}>
            <label style={s('Desc')}>Descrição</label>
            <textarea {...register('description')} rows={2} style={{...inputStyle, resize:'none'}} placeholder="Breve descrição..." />
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12}}>
            <div>
              <label style={s('Status')}>Status</label>
              <select {...register('status')} style={inputStyle}>
                <option value="draft">Rascunho</option>
                <option value="active">Ativa</option>
                <option value="closed">Encerrada</option>
              </select>
            </div>
            <div>
              <label style={s('Início')}>Início</label>
              <input type="datetime-local" {...register('starts_at')} style={inputStyle} />
            </div>
            <div>
              <label style={s('Fim')}>Encerramento</label>
              <input type="datetime-local" {...register('ends_at')} style={inputStyle} />
            </div>
          </div>
          <div style={{display:'flex', gap:24}}>
            <label style={{display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#374151', cursor:'pointer'}}>
              <input type="checkbox" {...register('allow_anonymous')} defaultChecked /> Respostas anônimas
            </label>
            <label style={{display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#374151', cursor:'pointer'}}>
              <input type="checkbox" {...register('randomize_questions')} /> Randomizar perguntas
            </label>
          </div>
        </div>

        {/* Alvos populacionais */}
        <div style={{marginBottom:16}}>
          <PopulationTargetsEditor targets={populationTargets} setTargets={setPopulationTargets} />
        </div>

        {/* Perguntas */}
        <div style={{marginBottom:16}}>
          <h2 style={{fontWeight:600, color:'#111827', marginBottom:12}}>Perguntas ({fields.length})</h2>
          {fields.map((field,index)=>(
            <QuestionEditor key={field.id} index={index} onRemove={()=>remove(index)}
              register={register} watch={watch} setValue={setValue} />
          ))}
          <button type="button"
            onClick={()=>append({type:'single_choice',text:'',description:'',required:true,demographic_key:'',options:[{label:'Opção 1',value:'opcao_1'}],settings:{min:1,max:10,step:1}})}
            style={{width:'100%', padding:'12px', border:'2px dashed #d1d5db', borderRadius:8, background:'white', cursor:'pointer', fontSize:14, color:'#6b7280', marginTop:8}}>
            + Adicionar pergunta
          </button>
        </div>

        {/* Ações */}
        <div style={{display:'flex', justifyContent:'flex-end', gap:12, paddingBottom:32}}>
          <button type="button" onClick={()=>router.back()}
            style={{padding:'8px 16px', border:'1px solid #d1d5db', borderRadius:8, background:'white', cursor:'pointer', fontSize:14}}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            style={{padding:'8px 20px', background:'#4F46E5', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:500, opacity:saving?0.7:1}}>
            {saving ? 'Salvando...' : '💾 Salvar Pesquisa'}
          </button>
        </div>
      </form>
    </div>
  );
}
