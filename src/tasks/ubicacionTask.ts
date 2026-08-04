import * as TaskManager from 'expo-task-manager';
import type * as Location from 'expo-location';
import { postUbicacion } from '../api/moviles';

export const UBICACION_TASK_NAME = 'taxiasiste-ubicacion-background';

// Las tareas de TaskManager corren en un contexto separado del arbol de
// React (incluso con la app en segundo plano) y no tienen acceso al estado
// de un componente. useTrackingUbicacion actualiza esta variable de modulo
// cada vez que cambia el movil del conductor logueado.
let idMovilActual: number | null = null;

export function setIdMovilParaTask(id: number | null) {
  idMovilActual = id;
}

// IMPORTANTE: defineTask debe ejecutarse en el scope global apenas arranca
// la app (ver index.ts) — definirlo dentro de un componente o hook no
// funciona una vez que la tarea corre en segundo plano real.
TaskManager.defineTask(UBICACION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.log('[GPS background] error de TaskManager:', error.message);
    return;
  }
  if (!idMovilActual) return;

  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  const ultima = locations?.[locations.length - 1];
  if (!ultima) return;

  try {
    await postUbicacion(idMovilActual, {
      lat: ultima.coords.latitude,
      lng: ultima.coords.longitude,
      heading: ultima.coords.heading ?? null,
      velocidad_kmh: ultima.coords.speed != null ? ultima.coords.speed * 3.6 : null,
    });
  } catch {
    // Fallo puntual de red: se reintenta con la siguiente actualizacion de posicion.
  }
});
