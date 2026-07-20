import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useState } from 'react';
import { api } from '../api/client';

type Usuario = {
  id_usuario: number;
  username: string;
  email: string;
  rol: string;
  estado: string;
};

type AuthContextType = {
  usuario: Usuario | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(username: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/login/', { username, password });
      const { access, refresh, usuario: usuarioData } = response.data;

      if (usuarioData.rol !== 'Conductor') {
        setError('Esta aplicacion es solo para conductores.');
        return;
      }

      await AsyncStorage.setItem('access_token', access);
      await AsyncStorage.setItem('refresh_token', refresh);
      setUsuario(usuarioData);
    } catch (err: any) {
      console.error('LOGIN ERROR:', err.message, err.code, err.response?.status, err.response?.data);
      setError(err.response?.data?.detail ?? `Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
