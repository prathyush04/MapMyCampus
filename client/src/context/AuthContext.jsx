import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout, sendOtp as apiSendOtp } from '../api';
import { setAccessToken } from '../api/axios';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, attempt silent token refresh
  useEffect(() => {
    api.post('/api/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.token);
        // Decode user from token payload (base64)
        const payload = JSON.parse(atob(data.token.split('.')[1]));
        setUser({ id: payload.id, email: payload.email, role: payload.role });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await apiLogin({ email, password });
    setAccessToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const sendOtp = useCallback(async (email) => {
    await apiSendOtp({ email });
  }, []);

  const register = useCallback(async (email, password, name, otp) => {
    const { data } = await apiRegister({ email, password, name, otp });
    setAccessToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout().catch(() => {});
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, sendOtp }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
