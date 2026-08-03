import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

export type EstadoGate = 'verificando' | 'bloqueado' | 'ok';

export interface LocationGate {
  estado: EstadoGate;
  /** Si false, el permiso quedo denegado "para siempre" — el dialogo nativo ya no sirve, hay que ir a Ajustes. */
  puedePedirPermisoDeNuevo: boolean;
  reintentar: () => Promise<void>;
  abrirAjustes: () => void;
}

// Gate de ubicacion: bloquea TODA la app (incluido el Login) mientras el
// telefono no tenga permiso de ubicacion Y el GPS encendido. Antes esto se
// avisaba con un banner despues del login — se decidio moverlo a un paso
// previo obligatorio, ya que sin GPS el conductor no puede trabajar.
export function useLocationGate(): LocationGate {
  const [estado, setEstado] = useState<EstadoGate>('verificando');
  const [puedePedirPermisoDeNuevo, setPuedePedirPermisoDeNuevo] = useState(true);

  const verificar = useCallback(async () => {
    setEstado((actual) => (actual === 'ok' ? actual : 'verificando'));

    // getForegroundPermissionsAsync (no pide, solo consulta) — el pedido
    // real ocurre unicamente al presionar "Intentalo de nuevo".
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    const gpsActivo = await Location.hasServicesEnabledAsync();

    if (status === 'granted' && gpsActivo) {
      setEstado('ok');
      return;
    }
    setPuedePedirPermisoDeNuevo(status === 'granted' ? true : canAskAgain);
    setEstado('bloqueado');
  }, []);

  useEffect(() => {
    verificar();
  }, [verificar]);

  const reintentar = useCallback(async () => {
    // enableNetworkProviderAsync es Android-only: abre el dialogo nativo
    // para encender el GPS de alta precision. En iOS no existe equivalente
    // programatico — si el GPS esta apagado ahi, solo Ajustes lo resuelve.
    if (Platform.OS === 'android') {
      try {
        await Location.enableNetworkProviderAsync();
      } catch {
        // El usuario rechazo encender el GPS desde el dialogo nativo —
        // igual seguimos e intentamos el permiso, por si eso era lo unico que faltaba.
      }
    }
    await Location.requestForegroundPermissionsAsync();
    await verificar();
  }, [verificar]);

  const abrirAjustes = useCallback(() => {
    Linking.openSettings();
  }, []);

  return { estado, puedePedirPermisoDeNuevo, reintentar, abrirAjustes };
}
