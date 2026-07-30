import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { postUbicacion } from '../api/moviles';

// Envia la posicion GPS del conductor mientras la app esta abierta (foreground).
// Tracking en segundo plano (app cerrada/pantalla apagada) requiere un
// development build con expo-task-manager — no funciona dentro de Expo Go
// (ver docs.expo.dev/versions/v57.0.0/sdk/location/).
export function useTrackingUbicacion(idMovil: number | null) {
  const subscripcionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function iniciar() {
      if (!idMovil) {
        console.log('[GPS] sin id_movil, tracking no inicia');
        return;
      }

      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      console.log('[GPS] permiso foreground:', fgStatus);
      if (fgStatus !== 'granted' || cancelado) return;

      subscripcionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 8000,
          distanceInterval: 30,
        },
        (loc) => {
          console.log('[GPS] posicion capturada:', loc.coords);
          postUbicacion(idMovil, {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            heading: loc.coords.heading ?? null,
            velocidad_kmh: loc.coords.speed != null ? loc.coords.speed * 3.6 : null,
          })
            .then(() => console.log('[GPS] enviado OK'))
            .catch((err) => console.log('[GPS] error al enviar:', err.response?.status, err.response?.data));
        }
      );
      console.log('[GPS] watchPositionAsync suscrito');
    }

    iniciar();

    return () => {
      cancelado = true;
      subscripcionRef.current?.remove();
      subscripcionRef.current = null;
    };
  }, [idMovil]);
}
