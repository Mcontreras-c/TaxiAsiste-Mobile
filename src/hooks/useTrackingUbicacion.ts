import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { postUbicacion, type UbicacionPayload } from '../api/moviles';

// El backend considera "offline" a un movil sin reportes en los ultimos 45s
// (SEGUNDOS_ONLINE) y lo saca del mapa. El envio debe ir bien por debajo de
// ese limite para tolerar algun ping perdido por red sin desaparecer.
const INTERVALO_ENVIO_MS = 12000;

// Envia la posicion GPS del conductor mientras la app esta abierta (foreground).
// El permiso y el GPS ya estan garantizados por el Location Gate (ver
// useLocationGate/App.tsx) antes de llegar a esta pantalla, por eso este
// hook ya no vuelve a pedir permiso ni muestra avisos — solo captura y envia.
//
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
      if (!idMovil) return;

      try {
        const inicial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        ultimaPosicionRef.current = {
          lat: inicial.coords.latitude,
          lng: inicial.coords.longitude,
          heading: inicial.coords.heading ?? null,
          velocidad_kmh: inicial.coords.speed != null ? inicial.coords.speed * 3.6 : null,
        };
      } catch {
        // Se completa con el primer callback de watchPositionAsync.
      }
      if (cancelado) return;

      // Captura de posicion: reactiva a movimiento (distancia corta) para
      // que la ubicacion este fresca en cuanto el vehiculo se mueve. Esto
      // solo actualiza el "cache" local (ultimaPosicionRef) — NO envia al
      // backend directamente, asi un vehiculo detenido (semaforo, fila,
      // esperando pasajero) no deja de reportarse por falta de movimiento.
      try {
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
      } catch {
        // Si el GPS se apago DESPUES de pasar el Location Gate, el tracking
        // de esta sesion se detiene silenciosamente; se retoma solo al
        // volver a entrar (el Gate vuelve a exigirlo en el proximo arranque).
        return;
      }

      // Latido de envio: cadencia fija e independiente del movimiento, muy
      // por debajo de los 45s del backend, para que el vehiculo nunca
      // desaparezca del mapa aunque este parado.
      const enviar = () => {
        const posicion = ultimaPosicionRef.current;
        if (!posicion) return;
        postUbicacion(idMovil, posicion).catch(() => {
          // Fallo puntual de red: se reintenta solo con el siguiente latido.
        });
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
