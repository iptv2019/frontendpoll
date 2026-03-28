'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { responsesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { CheckCircle, AlertCircle, ChevronRight, BarChart3, Loader2 } from 'lucide-react';

interface Question {
  id: string; type: string; text: string; description: string;
  required: boolean; options: { label: string; value: string }[];
  settings: { min: number; max: number; step: number; };
  order_index: number;
}
interface Survey {
  id: string; title: string; description: string;
  allow_anonymous: boolean; randomize_questions: boolean;
}

function ScaleInput({ question, value, onChange }: any) {
  const min  = question.settings?.min  ?? 1;
  const max  = question.settings?.max  ?? 10;
  const step = question.settings?.step ?? 1;
  const nums = [];
  for (let i = min; i <= max; i += step) nums.push(i);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {nums.map(n => (
          <button key={n} type="button"
            onClick={() => onChange(n)}
            className={`w-10 h-10 rounded-lg border-2 text-sm font-semibold transition-all ${
              value === n
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>Discordo totalmente</span>
        <span>Concordo totalmente</span>
      </div>
    </div>
  );
}

function RatingInput({ value, onChange }: any) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={`text-3xl transition-transform hover:scale-110 ${
            star <= (hover || value) ? 'text-yellow-400' : 'text-gray-200'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function QuestionCard({ question, index, register, watch, setValue }: any) {
  const value = watch(question.id);

  return (
    <div className="card p-6">
      <div className="flex gap-3 mb-4">
        <span className="flex-shrink-0 w-7 h-7 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold">
          {index + 1}
        </span>
        <div>
          <p className="font-medium text-gray-900 leading-snug">
            {question.text}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </p>
          {question.description && (
            <p className="text-sm text-gray-500 mt-1">{question.description}</p>
          )}
        </div>
      </div>

      <div className="ml-10">
        {/* Escolha única */}
        {question.type === 'single_choice' && (
          <div className="space-y-2">
            {question.options?.map((opt: any) => (
              <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                value === opt.value
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}>
                <input
                  type="radio"
                  {...register(question.id, { required: question.required })}
                  value={opt.value}
                  className="w-4 h-4 text-brand-600 border-gray-300"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        )}

        {/* Múltipla escolha */}
        {question.type === 'multiple_choice' && (
          <div className="space-y-2">
            {question.options?.map((opt: any) => {
              const checked = (value || []).includes(opt.value);
              return (
                <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  checked ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => {
                      const current = value || [];
                      if (e.target.checked) setValue(question.id, [...current, opt.value]);
                      else setValue(question.id, current.filter((v: string) => v !== opt.value));
                    }}
                    className="w-4 h-4 text-brand-600 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              );
            })}
          </div>
        )}

        {/* Escala */}
        {question.type === 'scale' && (
          <ScaleInput question={question} value={value}
            onChange={(v: number) => setValue(question.id, v)} />
        )}

        {/* Rating */}
        {question.type === 'rating' && (
          <RatingInput value={value} onChange={(v: number) => setValue(question.id, v)} />
        )}

        {/* Texto aberto */}
        {question.type === 'open_text' && (
          <textarea
            {...register(question.id, { required: question.required })}
            rows={3}
            placeholder="Digite sua resposta..."
            className="input resize-none"
          />
        )}
      </div>
    </div>
  );
}

export default function SurveyPage() {
  const { id } = useParams() as { id: string };
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const [state, setState] = useState<'loading'|'ready'|'submitting'|'done'|'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    responsesApi.getSurveyPublic(id)
      .then(async ({ data }) => {
        setSurvey(data.survey);
        setQuestions(data.questions);

        // Tentar geolocalização opcional
        let geo: any = {};
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
          );
          geo = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        } catch {}

        // Iniciar sessão
        const { data: session } = await responsesApi.startSession(id, {
          fingerprint: navigator.userAgent + screen.width + screen.height,
          ...geo
        });
        setSessionId(session.session_id);
        setState('ready');
      })
      .catch(err => {
        setErrorMsg(err.response?.data?.error || 'Esta pesquisa não está disponível.');
        setState('error');
      });
  }, [id]);

  const onSubmit = async (formData: any) => {
    if (!sessionId) return;
    setState('submitting');

    const answers = questions.map(q => {
      const raw = formData[q.id];
      let value: any = {};

      if (q.type === 'single_choice')   value = { choice: raw };
      else if (q.type === 'multiple_choice') value = { choices: raw || [] };
      else if (q.type === 'scale')       value = { score: raw };
      else if (q.type === 'rating')      value = { score: raw };
      else if (q.type === 'open_text')   value = { text: raw };

      return { question_id: q.id, value };
    });

    try {
      await responsesApi.submit(id, {
        session_id: sessionId,
        answers,
        time_to_complete: Date.now() - startTime
      });
      setState('done');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao enviar. Tente novamente.');
      setState('ready');
    }
  };

  // ── Estados ──────────────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Pesquisa indisponível</h2>
          <p className="text-gray-500 text-sm">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Resposta registrada!</h2>
          <p className="text-gray-500">
            Obrigado pela sua participação. Suas respostas foram salvas com sucesso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header da pesquisa */}
        <div className="card p-6 mb-6 border-t-4 border-t-brand-600">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-brand-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{survey?.title}</h1>
          </div>
          {survey?.description && (
            <p className="text-gray-600 text-sm leading-relaxed">{survey.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-3">{questions.length} pergunta(s)</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id} question={q} index={i}
              register={register} watch={watch} setValue={setValue}
            />
          ))}

          {/* Botão de submit */}
          <div className="card p-6">
            <button
              type="submit"
              disabled={state === 'submitting'}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {state === 'submitting' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Enviar respostas</>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              Suas respostas são anônimas e seguras.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
