import { useState, useEffect, createContext, useContext } from 'react';
import { api } from '../lib/api';

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthProvider() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('rm_token');
    if (!token) { setLoading(false); return; }
    api.me()
      .then(setUser)
      .catch(() => localStorage.removeItem('rm_token'))
      .finally(() => setLoading(false));
  }, []);

  function login(token, userData) {
    localStorage.setItem('rm_token', token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('rm_token');
    setUser(null);
  }

  function updateUser(data) {
    setUser(prev => ({ ...prev, ...data }));
  }

  return { user, loading, login, logout, updateUser };
}
