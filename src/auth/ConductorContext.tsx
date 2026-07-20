import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

type Movil = {
  id_movil: number;
  patente: string;
  estado_operativo: string;
};

type Socio = {
  id_socio: number;
  nombre: string;
  apellido: string;
};

type PerfilConductor = {
  socio: Socio | null;
  movil: Movil | null;
  solicitudes_hoy: any[];
  cuotas: any[];
  fecha: string;
};

type ConductorContextType = {
  perfil: PerfilConductor | null;
  loading: boolean;
  error: string | null;
  recargar: () => Promise<void>;
};

const ConductorContext = createContext<ConductorContextType | null>(null);

export function ConductorProvider({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();
  const [perfil, setPerfil] = useState<PerfilConductor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!usuario) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/usuarios/perfil_conductor/');
      setPerfil(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'No se pudo cargar el perfil de conductor.');
    } finally {
      setLoading(false);
    }
  }, [usuario]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return (
    <ConductorContext.Provider value={{ perfil, loading, error, recargar }}>
      {children}
    </ConductorContext.Provider>
  );
}

export function useConductor() {
  const context = useContext(ConductorContext);
  if (!context) throw new Error('useConductor debe usarse dentro de ConductorProvider');
  return context;
}
