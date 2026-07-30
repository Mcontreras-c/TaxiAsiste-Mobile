import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const INTERVALO_PING_MS = 12000;

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

  // Reporta la ubicacion del conductor cada INTERVALO_PING_MS mientras la app
  // este abierta y logueado; al cerrar sesion / desmontar, borra su posicion
  // para que desaparezca del mapa de la Central de inmediato.
  useEffect(() => {
    if (!usuario) return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let activo = true;

    async function enviarUbicacion() {
      try {
        const posicion = await Location.getCurrentPositionAsync({});
        if (!activo) return;
        const velocidadKmh = posicion.coords.speed != null && posicion.coords.speed >= 0
          ? posicion.coords.speed * 3.6
          : null;
        await api.post('/ubicaciones/mia/', {
          lat: posicion.coords.latitude,
          lng: posicion.coords.longitude,
          heading: posicion.coords.heading ?? null,
          velocidad_kmh: velocidadKmh,
        });
      } catch {
        // Sin permiso o sin GPS: se reintenta en el proximo ciclo, no bloquea la app.
      }
    }

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !activo) return;
      await enviarUbicacion();
      intervalId = setInterval(enviarUbicacion, INTERVALO_PING_MS);
    })();

    return () => {
      activo = false;
      if (intervalId) clearInterval(intervalId);
      api.delete('/ubicaciones/mia/').catch(() => {});
    };
  }, [usuario]);

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
