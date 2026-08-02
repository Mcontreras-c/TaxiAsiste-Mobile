import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import * as Location from 'expo-location';
import { postUbicacion, type UbicacionPayload } from '../api/moviles';

// El backend considera "offline" a un movil sin reportes en los ultimos 45s
// (SEGUNDOS_ONLINE) y lo saca del mapa. El envio debe ir bien por debajo de
// ese limite para tolerar algun ping perdido por red sin desaparecer.
const INTERVALO_ENVIO_MS = 12000;

// Mientras el GPS del telefono este apagado, se revisa periodicamente si el
// conductor lo reactivo — asi el tracking se recupera solo, sin que tenga
// que volver a abrir la app.
const INTERVALO_REVISION_GPS_MS = 8000;

export type EstadoTracking =
  | 'verificando'
  | 'inactivo'          // conductor sin movil asignado — no aplica GPS
  | 'permiso_denegado'  // el usuario rechazo el permiso de ubicacion
  | 'gps_desactivado'   // permiso concedido, pero el GPS del telefono esta apagado
  | 'activo';           // reportando posicion normalmente

export interface TrackingUbicacion {
  estado: EstadoTracking;
  /** Si false, el permiso quedo denegado "para siempre" — hay que ir a Ajustes, ya no sirve volver a pedirlo. */
  puedePedirPermisoDeNuevo: boolean;
  /** Reintenta el flujo completo (pedir permiso / revisar GPS) — para el boton "Reintentar" del aviso. */
  reintentar: () => void;
  /** Abre la pantalla de ajustes de la app (permiso denegado permanentemente). */
  abrirAjustes: () => void;
}

// Envia la posicion GPS del conductor mientras la app esta abierta (foreground).
// Tracking en segundo plano (app cerrada/pantalla apagada) requiere un
// development build con expo-task-manager — no funciona dentro de Expo Go
// (ver docs.expo.dev/versions/v57.0.0/sdk/location/).
export function useTrackingUbicacion(idMovil: number | null): TrackingUbicacion {
  const [estado, setEstado] = useState<EstadoTracking>('verificando');
  const [puedePedirPermisoDeNuevo, setPuedePedirPermisoDeNuevo] = useState(true);
  const [intento, setIntento] = useState(0);

  const subscripcionRef = useRef<Location.LocationSubscription | null>(null);
  const ultimaPosicionRef = useRef<UbicacionPayload | null>(null);

  useEffect(() => {
    let cancelado = false;
    let intervaloEnvioId: ReturnType<typeof setInterval> | null = null;
    let intervaloRevisionGpsId: ReturnType<typeof setInterval> | null = null;

    async function iniciarTracking() {
      subscripcionRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (loc) => {
          ultimaPosicionRef.current = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            heading: loc.coords.heading ?? null,
            velocidad_kmh: loc.coords.speed != null ? loc.coords.speed * 3.6 : null,
          };
        },
      );

      const enviar = () => {
        const posicion = ultimaPosicionRef.current;
        if (!posicion || !idMovil) return;
        postUbicacion(idMovil, posicion).catch(() => {
          // Fallo puntual de red: se reintenta solo con el siguiente latido.
        });
      };
      enviar();
      intervaloEnvioId = setInterval(enviar, INTERVALO_ENVIO_MS);
    }

    async function verificar() {
      if (!idMovil) { setEstado('inactivo'); return; }
      setEstado('verificando');

      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (cancelado) return;
      if (status !== 'granted') {
        setEstado('permiso_denegado');
        setPuedePedirPermisoDeNuevo(canAskAgain);
        return;
      }

      const gpsActivo = await Location.hasServicesEnabledAsync();
      if (cancelado) return;
      if (!gpsActivo) {
        setEstado('gps_desactivado');
        intervaloRevisionGpsId = setInterval(async () => {
          const activoAhora = await Location.hasServicesEnabledAsync();
          if (activoAhora && !cancelado) {
            if (intervaloRevisionGpsId) clearInterval(intervaloRevisionGpsId);
            setEstado('activo');
            // Semilla inicial antes de suscribirse, para no esperar el
            // primer callback de watchPositionAsync.
            try {
              const inicial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
              ultimaPosicionRef.current = {
                lat: inicial.coords.latitude,
                lng: inicial.coords.longitude,
                heading: inicial.coords.heading ?? null,
                velocidad_kmh: inicial.coords.speed != null ? inicial.coords.speed * 3.6 : null,
              };
            } catch { /* se completa con el primer callback de watchPositionAsync */ }
            await iniciarTracking();
          }
        }, INTERVALO_REVISION_GPS_MS);
        return;
      }

      setEstado('activo');
      try {
        const inicial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        ultimaPosicionRef.current = {
          lat: inicial.coords.latitude,
          lng: inicial.coords.longitude,
          heading: inicial.coords.heading ?? null,
          velocidad_kmh: inicial.coords.speed != null ? inicial.coords.speed * 3.6 : null,
        };
      } catch { /* se completa con el primer callback de watchPositionAsync */ }
      if (cancelado) return;
      await iniciarTracking();
    }

    verificar();

    return () => {
      cancelado = true;
      subscripcionRef.current?.remove();
      subscripcionRef.current = null;
      if (intervaloEnvioId) clearInterval(intervaloEnvioId);
      if (intervaloRevisionGpsId) clearInterval(intervaloRevisionGpsId);
    };
  }, [idMovil, intento]);

  const reintentar = useCallback(() => setIntento((i) => i + 1), []);
  const abrirAjustes = useCallback(() => { Linking.openSettings(); }, []);

  return { estado, puedePedirPermisoDeNuevo, reintentar, abrirAjustes };
}
