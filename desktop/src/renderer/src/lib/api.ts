import axios, { AxiosInstance } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // Only force-logout on 401 when NOT already on login page —
    // prevents background refetch from interfering with re-login after logout
    if (error.response?.status === 401 && !window.location.hash.includes('/login')) {
      localStorage.removeItem('auth_token');
      window.location.hash = '#/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Typed API helpers
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/api/auth/login', { username, password }),
  me: () => api.get('/api/auth/me'),
};

export const ordersApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/orders', { params }),
  get: (id: string) => api.get(`/api/orders/${id}`),
  create: (data: Record<string, unknown>) => api.post('/api/orders', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/api/orders/${id}`, data),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/api/orders/${id}/status`, { status, notes }),
  getHistory: (id: string) => api.get(`/api/orders/${id}/history`),
  delete: (id: string) => api.delete(`/api/orders/${id}`),
};

export const customersApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/customers', { params }),
  get: (id: string) => api.get(`/api/customers/${id}`),
  create: (data: Record<string, unknown>) => api.post('/api/customers', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/customers/${id}`, data),
  saveMeasurements: (id: string, data: Record<string, unknown>) =>
    api.post(`/api/customers/${id}/measurements`, data),
  deleteAll: () => api.delete('/api/customers/all'),
};

export const branchesApi = {
  list: () => api.get('/api/branches'),
  create: (data: Record<string, unknown>) => api.post('/api/branches', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/branches/${id}`, data),
};

export const usersApi = {
  list: () => api.get('/api/users'),
  create: (data: Record<string, unknown>) => api.post('/api/users', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/users/${id}`, data),
};

export const settingsApi = {
  getDropdowns: (categories?: string) =>
    api.get('/api/settings/dropdowns', { params: { category: categories } }),
  addDropdown: (data: Record<string, unknown>) => api.post('/api/settings/dropdowns', data),
  updateDropdown: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/settings/dropdowns/${id}`, data),
  getSystem: () => api.get('/api/settings/system'),
  saveSystem: (data: Record<string, unknown>) => api.put('/api/settings/system', data),
};

export const reportsApi = {
  summary: () => api.get('/api/reports/summary'),
  ordersByBranch: () => api.get('/api/reports/orders-by-branch'),
  ordersByStatus: () => api.get('/api/reports/orders-by-status'),
};

export const whatsappApi = {
  getStatus: () => api.get('/api/whatsapp/status'),
  getBranchStatus: (branchCode: string) => api.get(`/api/whatsapp/status/${branchCode}`),
  reconnect: (branchCode: string) => api.post(`/api/whatsapp/reconnect/${branchCode}`),
};
