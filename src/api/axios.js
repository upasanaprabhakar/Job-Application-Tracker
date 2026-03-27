import axios from 'axios';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

let accessToken = null;
let isRefreshing = false;
let failedQueue = [];

export const setAccessToken   = (token) => { accessToken = token; };
export const clearAccessToken = ()       => { accessToken = null; };
export const getAccessToken   = ()       => accessToken;

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
  failedQueue = [];
};

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    // Don't try to refresh on auth routes — avoids 'refresh token required' flash on login
    if (original.url?.includes('/auth/login') || original.url?.includes('/auth/register')) return Promise.reject(err);
    if (err.response?.status !== 401 || original._retry) return Promise.reject(err);

    if (isRefreshing) {
      return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
        .then((token) => { original.headers.Authorization = `Bearer ${token}`; return api(original); })
        .catch((e) => Promise.reject(e));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, {}, { withCredentials: true });
      const newToken = data.accessToken;
      setAccessToken(newToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearAccessToken();
      if (window.location.pathname !== '/login') window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export const initializeAuth = async () => {
  if (accessToken) return true;
  try {
    const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, {}, { withCredentials: true });
    if (data.accessToken) { setAccessToken(data.accessToken); return true; }
    return false;
  } catch {
    return false;
  }
};

export default api;