'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { surveysApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, GripVertical, ArrowLeft, Save,
  ChevronDown, ChevronUp, Eye
} from 'lucide-react';

const QUESTION_TYPES = [
  { value: 'single_choice',   label: 'Escolha única' },
  { value: 'multiple_choice', label: 'Múltipla escolha' },
  { value: 'scale',           label: 'Escala numérica' },
  { value: 'open_text',       label: 'Texto aberto' },
  { value: 'rating',          label: 'Avaliação (estrelas)' },
];

const DEMOGRAPHIC_KEYS = [
  { value: '',           label: 'Não demográfica' },
  { value: 'gender',     label: 'Gênero' },
  { value: 'age_group',  label: 'Faixa etária' },
  { value: 'region',     label: 'Região' },
  { value: 'income',     label: 'Renda' },
  { value: 'education',  label: 'Escolaridade' },
];

interface Option { label: string; value: string; }
interface Question {
  type: string; text: string; description: string;
  required: boolean; demographic_key: string;
  options: Option[];
  settings: { min: number; max: number; step: number; };
}
interface FormData {
  title: string; description: string; status: string;
  starts_at: string; ends_at: string;
  allow_anonymous: boolean; randomize_questions: boolean;
  max_responses_per_ip: number;
  questions: Question[];
}

function QuestionEditor({ index, question, onRemove, register, control, watch, setValue }: any) {
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
    <div className="card border-l-4 border-l-brand-500">
      {/* Header da pergunta */}
      <div className="flex items-center gap-3 p-4">
        <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
        <span className="text-xs font-bold text-gray-400 w-6">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">
            {watch(`questions.${index}.text`) || 'Nova pergunta'}
          </p>
          <p className="text-xs text-gray-400">{QUESTION_TYPES.find(t => t.value === type)?.label}</p>
        </div>
        <button type="button" onClick={() => setExpanded(!expanded)}
          className="p-1 text-gray-400 hover:text-gray-600">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button type="button" onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-4">
          {/* Texto da pergunta */}
          <div>
            <label className="label">Texto da pergunta *</label>
            <input {...register(`questions.${index}.text`, { required: true })}
              className="input" placeholder="Digite a pergunta..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Tipo */}
            <div>
              <label className="label">Tipo</label>
              <select {...register(`questions.${index}.type`)} className="input">
                {QUESTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {/* Chave demográfica */}
            <div>
              <label className="label">Variável demográfica</label>
              <select {...register(`questions.${index}.demographic_key`)} className="input">
                {DEMOGRAPHIC_KEYS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Opções (para choice) */}
          {(type === 'single_choice' || type === 'multiple_choice') && (
            <div>
              <label className="label">Opções de resposta</label>
              <div className="space-y-2">
                {(watch(`questions.${index}.options`) || []).map((opt: Option, i: number) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={opt.label}
                      onChange={e => {
                        const opts = [...(watch(`questions.${index}.options`) || [])];
                        opts[i] = { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') };
                        setValue(`questions.${index}.options`, opts);
                      }}
                      className="input flex-1" placeholder={`Opção ${i + 1}`}
                    />
                    <button type="button" onClick={() => removeOption(i)}
                      className="p-2 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addOption}
                  className="btn-secondary text-xs py-1.5">
                  <Plus className="w-3 h-3" /> Adicionar opção
                </button>
              </div>
            </div>
          )}

          {/* Configuração de escala */}
          {type === 'scale' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Mínimo</label>
                <input type="number" {...register(`questions.${index}.settings.min`, { valueAsNumber: true })}
                  defaultValue={1} className="input" />
              </div>
              <div>
                <label className="label">Máximo</label>
                <input type="number" {...register(`questions.${index}.settings.max`, { valueAsNumber: true })}
                  defaultValue={10} className="input" />
              </div>
              <div>
                <label className="label">Passo</label>
                <input type="number" {...register(`questions.${index}.settings.step`, { valueAsNumber: true })}
                  defaultValue={1} className="input" />
              </div>
            </div>
          )}

          {/* Obrigatória */}
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" {...register(`questions.${index}.required`)}
              defaultChecked className="rounded border-gray-300 text-brand-600" />
            Resposta obrigatória
          </label>
        </div>
      )}
    </div>
  );
}

export default function NewSurveyPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      status: 'draft',
      allow_anonymous: true,
      randomize_questions: false,
      max_responses_per_ip: 1,
      questions: [{
        type: 'single_choice', text: '', description: '', required: true,
        demographic_key: '', options: [
          { label: 'Sim', value: 'sim' },
          { label: 'Não', value: 'nao' }
        ],
        settings: { min: 1, max: 10, step: 1 }
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const { data: survey } = await surveysApi.create(data);
      toast.success('Pesquisa criada com sucesso!');
      router.push(`/admin/surveys/${survey.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao criar pesquisa.');
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => append({
    type: 'single_choice', text: '', description: '', required: true,
    demographic_key: '', options: [{ label: 'Opção 1', value: 'opcao_1' }],
    settings: { min: 1, max: 10, step: 1 }
  });

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nova Pesquisa</h1>
          <p className="text-gray-500 text-sm">Configure e publique sua pesquisa</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Dados básicos */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Informações básicas</h2>

          <div>
            <label className="label">Título da pesquisa *</label>
            <input {...register('title', { required: 'Título obrigatório' })}
              className="input" placeholder="Ex: Pesquisa de Opinião — Eleições 2026" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Descrição</label>
            <textarea {...register('description')} rows={2}
              className="input resize-none" placeholder="Breve descrição para os respondentes..." />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Status</label>
              <select {...register('status')} className="input">
                <option value="draft">Rascunho</option>
                <option value="active">Ativa</option>
                <option value="closed">Encerrada</option>
              </select>
            </div>
            <div>
              <label className="label">Início</label>
              <input type="datetime-local" {...register('starts_at')} className="input" />
            </div>
            <div>
              <label className="label">Encerramento</label>
              <input type="datetime-local" {...register('ends_at')} className="input" />
            </div>
          </div>

          {/* Configurações */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Configurações de coleta</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" {...register('allow_anonymous')}
                  className="rounded border-gray-300 text-brand-600" />
                Permitir respostas anônimas
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" {...register('randomize_questions')}
                  className="rounded border-gray-300 text-brand-600" />
                Randomizar ordem das perguntas
              </label>
            </div>
            <div className="w-48">
              <label className="label">Máx. respostas por IP</label>
              <input type="number" {...register('max_responses_per_ip', { valueAsNumber: true })}
                min={0} max={100} className="input" />
            </div>
          </div>
        </div>

        {/* Perguntas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Perguntas ({fields.length})</h2>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <QuestionEditor
                key={field.id} index={index}
                question={field} onRemove={() => remove(index)}
                register={register} control={control}
                watch={watch} setValue={setValue}
              />
            ))}
          </div>

          <button type="button" onClick={addQuestion}
            className="btn-secondary w-full mt-3 justify-center py-3 border-dashed">
            <Plus className="w-4 h-4" /> Adicionar pergunta
          </button>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Pesquisa'}
          </button>
        </div>
      </form>
    </div>
  );
}
