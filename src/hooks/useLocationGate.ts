import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

// Cada cuanto se re-verifica permiso+GPS mientras la app esta en primer
// plano. No hay evento nativo "el usuario apago el GPS" al que suscribirse
// desde JS, asi que un polling corto es lo que permite reaccionar "en
// cualquier momento o pantalla" sin que el conductor tenga que reabrir la app.
const INTERVALO_VERIFICACION_MS = 3000;

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
  // Evita que el polling en segundo plano haga parpadear la pantalla a
  // 'verificando' (blanco) cuando ya se sabe el resultado — solo se usa ese
  // estado en la primerísima verificacion al abrir la app.
  const yaVerificoAlMenosUnaVez = useRef(false);

  const verificar = useCallback(async () => {
    if (!yaVerificoAlMenosUnaVez.current) {
      setEstado('verificando');
    }

    // getForegroundPermissionsAsync (no pide, solo consulta) — el pedido
    // real ocurre unicamente al presionar "Intentalo de nuevo".
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    const gpsActivo = await Location.hasServicesEnabledAsync();
    yaVerificoAlMenosUnaVez.current = true;

    if (status === 'granted' && gpsActivo) {
      setEstado('ok');
      return;
    }
    setPuedePedirPermisoDeNuevo(status === 'granted' ? true : canAskAgain);
    setEstado('bloqueado');
  }, []);

  useEffect(() => {
    verificar();

    // Polling continuo: no existe un evento nativo al que suscribirse desde
    // JS cuando el usuario apaga el GPS o revoca el permiso desde Ajustes
    // mientras usa la app — por eso se re-verifica periodicamente, sin
    // importar en que pantalla este (este hook vive en la raiz de App.tsx).
    const intervaloId = setInterval(verificar, INTERVALO_VERIFICACION_MS);

    // Ademas, se re-verifica de inmediato al volver a primer plano — cubre
    // el caso de "conceder permiso / activar GPS y volver a la app", que
    // suele disparar un cambio de AppState antes de que toque el proximo tick.
    const subscripcion = AppState.addEventListener('change', (siguiente) => {
      if (siguiente === 'active') verificar();
    });

    return () => {
      clearInterval(intervaloId);
      subscripcion.remove();
    };
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
