import axios from 'axios';


let _accessToken = null;

export const setAccessToken = (t) => { _accessToken = t; };
export const getAccessToken = () => _accessToken;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true, // send httpOnly refresh cookie
});

// Attach bearer token
api.interceptors.request.use((config) => {
  if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`;
  return config;
});

// Auto-refresh on 401 — skip the refresh endpoint itself to avoid loops
let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const isRefreshCall = original.url?.includes('/api/auth/refresh');
    if (error.response?.status === 401 && !original._retry && !isRefreshCall) {
      original._retry = true;
      if (!refreshing) {
        refreshing = api.post('/api/auth/refresh').finally(() => { refreshing = null; });
      }
      try {
        const { data } = await refreshing;
        setAccessToken(data.token);
        original.headers.Authorization = `Bearer ${data.token}`;
        return api(original);
      } catch {
        setAccessToken(null);
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
