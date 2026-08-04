import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { postUbicacion } from '../api/moviles';
import { setIdMovilParaTask, UBICACION_TASK_NAME } from '../tasks/ubicacionTask';

// El backend considera "offline" a un movil sin reportes en los ultimos 45s
// (SEGUNDOS_ONLINE) y lo saca del mapa. El envio debe ir bien por debajo de
// ese limite para tolerar algun ping perdido por red sin desaparecer.
const INTERVALO_MS = 12000;
const DISTANCIA_MIN_M = 10;

// Registra al SO (Android/iOS) para seguir entregando ubicaciones a
// UBICACION_TASK_NAME incluso con la app en segundo plano (pantalla
// bloqueada, o el conductor usando Waze/Google Maps encima). Reemplaza el
// watchPositionAsync anterior (solo foreground) por un unico mecanismo que
// cubre ambos casos.
//
// Requiere un development build (EAS) — NO funciona en Expo Go. El permiso
// y el GPS foreground ya estan garantizados por el Location Gate
// (useLocationGate/App.tsx) antes de llegar aqui; este hook pide ademas el
// permiso de ubicacion "Always"/segundo plano, que es un paso aparte.
export function useTrackingUbicacion(idMovil: number | null, autenticado: boolean) {
  const iniciadoRef = useRef(false);

  useEffect(() => {
    // Solo se fija cuando hay un valor real. Al montar, el perfil del
    // conductor todavia no cargo (idMovil llega null un instante) — tratar
    // eso como "sin movil" borraba en AsyncStorage el id de la sesion
    // anterior antes de que /usuarios/perfil_conductor/ alcanzara a
    // responder. La limpieza real ocurre solo al cerrar sesion
    // (ver AuthContext.logout -> limpiarIdMovilParaTask).
    if (autenticado && idMovil) {
      setIdMovilParaTask(idMovil);
    }
  }, [autenticado, idMovil]);

  useEffect(() => {
    let cancelado = false;

    async function iniciar() {
      // Validacion estricta: aunque estructuralmente este hook solo deberia
      // montarse dentro de ConductorProvider (post-login), se valida
      // explicitamente aca tambien — asi un futuro cambio en la jerarquia
      // de componentes no puede arrancar el rastreo sin sesion activa.
      if (!autenticado || !idMovil) {
        console.log('[TRACKING BG] no se inicia (autenticado:', autenticado, ', idMovil:', idMovil, ')');
        return;
      }

      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (cancelado) return;

      if (bgStatus !== 'granted') {
        // Sin permiso "Always", solo queda tracking foreground (mejor que
        // nada): se corrige aparte en la tarea "Manejo de permisos" ya
        // hecha en Fase 1. Aca simplemente no se activa el segundo plano.
        console.log('[TRACKING BG] permiso background no concedido, solo funcionara con la app abierta');
        return;
      }

      const yaActivo = await Location.hasStartedLocationUpdatesAsync(UBICACION_TASK_NAME).catch(() => false);
      if (yaActivo || cancelado) {
        console.log('[TRACKING BG] tracking ya estaba activo para', UBICACION_TASK_NAME);
        return;
      }

      await Location.startLocationUpdatesAsync(UBICACION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: INTERVALO_MS,
        distanceInterval: DISTANCIA_MIN_M,
        // Android exige un servicio en primer plano (con notificacion
        // visible) para poder reportar ubicacion con la pantalla apagada.
        foregroundService: {
          notificationTitle: 'TaxiAsiste',
          notificationBody: 'Compartiendo tu ubicación con Central mientras trabajas.',
        },
        // iOS: icono de ubicacion activo en la barra de estado, requerido
        // por Apple para tracking en segundo plano.
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
      });
      iniciadoRef.current = true;
      console.log('[TRACKING BG] startLocationUpdatesAsync OK para movil', idMovil);

      // Envio inmediato con la posicion actual, sin esperar la primera
      // actualizacion del task en segundo plano.
      try {
        const inicial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        console.log('[TRACKING BG] posicion inicial capturada:', inicial.coords);
        if (!cancelado) {
          await postUbicacion(idMovil, {
            lat: inicial.coords.latitude,
            lng: inicial.coords.longitude,
            heading: inicial.coords.heading ?? null,
            velocidad_kmh: inicial.coords.speed != null ? inicial.coords.speed * 3.6 : null,
          });
          console.log('[TRACKING BG] POST inicial /moviles/' + idMovil + '/ubicacion/ OK');
        }
      } catch (err: any) {
        console.log('[TRACKING BG] fallo el envio inicial:', err?.response?.status ?? err?.message);
        // Se completa con la primera actualizacion que entregue el task.
      }
    }

    iniciar();

    return () => {
      cancelado = true;
      if (iniciadoRef.current) {
        Location.stopLocationUpdatesAsync(UBICACION_TASK_NAME).catch(() => {});
        iniciadoRef.current = false;
      }
    };
  }, [idMovil, autenticado]);
}
