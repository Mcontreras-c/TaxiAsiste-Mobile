import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { postUbicacion } from '../api/moviles';

export const UBICACION_TASK_NAME = 'taxiasiste-ubicacion-background';

const CLAVE_STORAGE_ID_MOVIL = 'tracking_id_movil';

// Las tareas de TaskManager corren en un contexto separado del arbol de
// React. Mientras la app sigue viva en memoria, esta variable de modulo
// alcanza. PERO si Android mata el proceso completo (el conductor desliza
// la app fuera de recientes) y luego lo revive en modo "headless" solo para
// entregar una ubicacion, index.ts se re-ejecuta desde cero y esta variable
// vuelve a null — el arbol de React (que la actualiza) nunca se remonta en
// ese contexto. Por eso se persiste TAMBIEN en AsyncStorage como respaldo
// durable, y el task lee de ahi si la variable en memoria no esta disponible.
let idMovilActual: number | null = null;

// Fija el id_movil real (llamar SOLO cuando se conoce un valor valido — ver
// useTrackingUbicacion). No acepta null a proposito: el estado "todavia no
// se cargo el perfil" es distinto de "el conductor no tiene movil / cerro
// sesion", y confundirlos borraba el id guardado apenas la app arrancaba,
// antes de que /usuarios/perfil_conductor/ respondiera.
export function setIdMovilParaTask(id: number) {
  idMovilActual = id;
  AsyncStorage.setItem(CLAVE_STORAGE_ID_MOVIL, String(id)).catch(() => {});
}

// Limpieza explicita — llamar SOLO al cerrar sesion (ver AuthContext.logout).
export function limpiarIdMovilParaTask() {
  idMovilActual = null;
  AsyncStorage.removeItem(CLAVE_STORAGE_ID_MOVIL).catch(() => {});
}

// startLocationUpdatesAsync registra la tarea a nivel del sistema operativo
// (Android/iOS), no del JS: si la app se cierra sin pasar por "Salir" (swipe
// desde recientes en vez de logout), la tarea sigue viva nativamente y
// vuelve a disparar apenas arranca la app de nuevo — ANTES de que React
// llegue a mostrar el Login. Se llama una vez al arrancar (ver App.tsx) para
// garantizar que nunca quede tracking corriendo sin una sesion valida.
export async function detenerTrackingHuerfano() {
  const activo = await Location.hasStartedLocationUpdatesAsync(UBICACION_TASK_NAME).catch(() => false);
  if (activo) {
    await Location.stopLocationUpdatesAsync(UBICACION_TASK_NAME).catch(() => {});
    console.log('[TRACKING BG] tarea huerfana (de una sesion anterior) detenida al arrancar');
  }
}

export async function detenerTrackingBackground() {
  const activo = await Location.hasStartedLocationUpdatesAsync(UBICACION_TASK_NAME).catch(() => false);
  if (activo) {
    await Location.stopLocationUpdatesAsync(UBICACION_TASK_NAME).catch(() => {});
    console.log('[TRACKING BG] detenido (logout)');
  }
}

async function resolverIdMovil(): Promise<number | null> {
  if (idMovilActual) return idMovilActual;
  const guardado = await AsyncStorage.getItem(CLAVE_STORAGE_ID_MOVIL);
  return guardado ? Number(guardado) : null;
}

// IMPORTANTE: defineTask debe ejecutarse en el scope global apenas arranca
// la app (ver index.ts) — definirlo dentro de un componente o hook no
// funciona una vez que la tarea corre en segundo plano real.
TaskManager.defineTask(UBICACION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.log('[TRACKING BG] error de TaskManager:', error.message);
    return;
  }

  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  const ultima = locations?.[locations.length - 1];
  console.log('[TRACKING BG] coordenada capturada:', ultima?.coords);
  if (!ultima) return;

  const idMovil = await resolverIdMovil();
  if (!idMovil) {
    console.log('[TRACKING BG] sin id_movil (ni en memoria ni en AsyncStorage) — se descarta la coordenada');
    return;
  }

  try {
    await postUbicacion(idMovil, {
      lat: ultima.coords.latitude,
      lng: ultima.coords.longitude,
      heading: ultima.coords.heading ?? null,
      velocidad_kmh: ultima.coords.speed != null ? ultima.coords.speed * 3.6 : null,
    });
    console.log('[TRACKING BG] POST /moviles/' + idMovil + '/ubicacion/ OK');
  } catch (err: any) {
    console.log('[TRACKING BG] POST fallo:', err?.response?.status, err?.response?.data ?? err?.message);
    // Fallo puntual de red: se reintenta con la siguiente actualizacion de posicion.
  }
});
