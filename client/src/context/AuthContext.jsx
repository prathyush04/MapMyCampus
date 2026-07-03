import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '../api';
import { setAccessToken } from '../api/axios';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    api.post('/api/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.token);
        const payload = JSON.parse(atob(data.token.split('.')[1]));
        setUser({ id: payload.id, email: payload.email, role: payload.role, name: payload.name });
        setLoading(false);
      })
      .catch(() => {
        
        api.post('/api/auth/guest')
          .then(({ data }) => {
            setAccessToken(data.token);
            setUser(data.user);
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      });
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await apiLogin({ email, password });
    setAccessToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const { data } = await apiRegister({ email, password, name });
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
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
