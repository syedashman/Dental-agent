import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance with auth interceptor
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dental_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dental_token');
      localStorage.removeItem('dental_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { api };

// Auth context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('dental_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('dental_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('dental_token', data.token);
    localStorage.setItem('dental_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('dental_token');
    localStorage.removeItem('dental_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
