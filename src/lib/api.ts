/**
 * Cliente HTTP centralizado
 * Injeta o token JWT automaticamente em todas as requisições autenticadas
 */

import axios from 'axios';

const api = axios.create({
  baseURL: 'https://pesquisas-backendd.onrender.com',
  timeout: 15000,
});

// Injeta token JWT no header Authorization
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redireciona para login se token expirar
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Funções da API ──────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  me: () => api.get('/api/auth/me'),
};

export const surveysApi = {
  list: () => api.get('/api/surveys'),
  get: (id: string) => api.get(`/api/surveys/${id}`),
  create: (data: any) => api.post('/api/surveys', data),
  update: (id: string, data: any) => api.put(`/api/surveys/${id}`, data),
  delete: (id: string) => api.delete(`/api/surveys/${id}`),
  duplicate: (id: string) => api.post(`/api/surveys/${id}/duplicate`),
  setPopulationTargets: (id: string, targets: any[]) =>
    api.post(`/api/surveys/${id}/population-targets`, { targets }),
};

export const responsesApi = {
  getSurveyPublic: (surveyId: string) =>
    api.get(`/api/responses/survey/${surveyId}/public`),
  startSession: (surveyId: string, data: any) =>
    api.post(`/api/responses/survey/${surveyId}/start`, data),
  submit: (surveyId: string, data: any) =>
    api.post(`/api/responses/survey/${surveyId}/submit`, data),
  getStats: (surveyId: string) =>
    api.get(`/api/responses/survey/${surveyId}/stats`),
};

export const statsApi = {
  dashboard: (surveyId: string) =>
    api.get(`/api/stats/${surveyId}/dashboard`),
  runWeighting: (surveyId: string, opts: any) =>
    api.post(`/api/stats/${surveyId}/run-weighting`, opts),
  weightedResults: (surveyId: string, questionId: string) =>
    api.get(`/api/stats/${surveyId}/question/${questionId}/weighted`),
  weightingHistory: (surveyId: string) =>
    api.get(`/api/stats/${surveyId}/weighting-history`),
};

export const exportApi = {
  json:  (surveyId: string) => `${process.env.NEXT_PUBLIC_API_URL}/api/export/${surveyId}/json`,
  csv:   (surveyId: string) => `${process.env.NEXT_PUBLIC_API_URL}/api/export/${surveyId}/csv`,
  excel: (surveyId: string) => `${process.env.NEXT_PUBLIC_API_URL}/api/export/${surveyId}/excel`,
};
