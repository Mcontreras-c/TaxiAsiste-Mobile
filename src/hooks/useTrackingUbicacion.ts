import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { postUbicacion, type UbicacionPayload } from '../api/moviles';

// El backend considera "offline" a un movil sin reportes en los ultimos 45s
// (SEGUNDOS_ONLINE) y lo saca del mapa. El envio debe ir bien por debajo de
// ese limite para tolerar algun ping perdido por red sin desaparecer.
const INTERVALO_ENVIO_MS = 12000;

// Envia la posicion GPS del conductor mientras la app esta abierta (foreground).
// Tracking en segundo plano (app cerrada/pantalla apagada) requiere un
// development build con expo-task-manager — no funciona dentro de Expo Go
// (ver docs.expo.dev/versions/v57.0.0/sdk/location/).
export function useTrackingUbicacion(idMovil: number | null) {
  const subscripcionRef = useRef<Location.LocationSubscription | null>(null);
  const ultimaPosicionRef = useRef<UbicacionPayload | null>(null);

  useEffect(() => {
    let cancelado = false;
    let intervaloId: ReturnType<typeof setInterval> | null = null;

    async function iniciar() {
      if (!idMovil) {
        console.log('[GPS] sin id_movil, tracking no inicia');
        return;
      }

      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      console.log('[GPS] permiso foreground:', fgStatus);
      if (fgStatus !== 'granted' || cancelado) return;

      // Semilla inicial: no esperar al primer callback de watchPositionAsync
      // (que puede tardar) para tener una posicion en el cache.
      try {
        const inicial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        ultimaPosicionRef.current = {
          lat: inicial.coords.latitude,
          lng: inicial.coords.longitude,
          heading: inicial.coords.heading ?? null,
          velocidad_kmh: inicial.coords.speed != null ? inicial.coords.speed * 3.6 : null,
        };
      } catch (err) {
        console.log('[GPS] no se pudo obtener posicion inicial:', err);
      }
      if (cancelado) return;

      // Captura de posicion: reactiva a movimiento (distancia corta) para
      // que la ubicacion este fresca en cuanto el vehiculo se mueve. Esto
      // solo actualiza el "cache" local (ultimaPosicionRef) — NO envia al
      // backend directamente, asi un vehiculo detenido (semaforo, fila,
      // esperando pasajero) no deja de reportarse por falta de movimiento.
      subscripcionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (loc) => {
          ultimaPosicionRef.current = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            heading: loc.coords.heading ?? null,
            velocidad_kmh: loc.coords.speed != null ? loc.coords.speed * 3.6 : null,
          };
          console.log('[GPS] posicion capturada:', loc.coords);
        }
      );
      console.log('[GPS] watchPositionAsync suscrito');

      // Latido de envio: cadencia fija e independiente del movimiento, muy
      // por debajo de los 45s del backend, para que el vehiculo nunca
      // desaparezca del mapa aunque este parado.
      const enviar = () => {
        const posicion = ultimaPosicionRef.current;
        if (!posicion) return;
        postUbicacion(idMovil, posicion)
          .then(() => console.log('[GPS] enviado OK'))
          .catch((err) => console.log('[GPS] error al enviar:', err.response?.status, err.response?.data));
      };
      enviar();
      intervaloId = setInterval(enviar, INTERVALO_ENVIO_MS);
    }

    iniciar();

    return () => {
      cancelado = true;
      subscripcionRef.current?.remove();
      subscripcionRef.current = null;
      if (intervaloId) clearInterval(intervaloId);
    };
  }, [idMovil]);
}
