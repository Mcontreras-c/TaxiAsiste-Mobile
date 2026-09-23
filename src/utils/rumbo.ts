import { Punto } from './rutaProgreso';

const RADIO_TIERRA_M = 6371000;
const aRad = (g: number) => (g * Math.PI) / 180;

/** Normaliza a 0-360. */
export const norm360 = (g: number) => ((g % 360) + 360) % 360;

/** Diferencia con signo entre dos rumbos por el camino corto, en (-180, 180]. */
export function diferenciaAngular(desde: number, hasta: number): number {
  const d = norm360(hasta - desde);
  return d > 180 ? d - 360 : d;
}

/**
 * Acerca `actual` a `objetivo` por el camino corto (nunca da la vuelta larga)
 * en la fraccion `factor` (0-1). Diferencias menores a `zonaMuertaGrados` se
 * ignoran para que el auto no "tiemble" con el ruido del GPS.
 */
export function suavizarRumbo(
  actual: number | null,
  objetivo: number,
  factor = 0.5,
  zonaMuertaGrados = 3
): number {
  if (actual === null) return norm360(objetivo);
  const d = diferenciaAngular(actual, objetivo);
  if (Math.abs(d) < zonaMuertaGrados) return actual;
  return norm360(actual + d * factor);
}

/** Rumbo (0 = norte, 90 = este) del punto `a` hacia el punto `b`. */
export function rumboEntre(a: Punto, b: Punto): number {
  const dLng = aRad(b.longitude - a.longitude);
  const lat1 = aRad(a.latitude);
  const lat2 = aRad(b.latitude);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return norm360((Math.atan2(y, x) * 180) / Math.PI);
}

export type ProyeccionRuta = {
  /** Punto de la ruta mas cercano a la posicion (el auto "pegado" a la calle). */
  punto: Punto;
  /** Direccion en que avanza la ruta en ese punto (mirando un poco adelante). */
  rumbo: number;
  /** Distancia en metros entre la posicion y la ruta. */
  desviacionM: number;
  /** Indice del segmento (ruta[indice] -> ruta[indice + 1]) donde cae el punto. */
  indice: number;
};

/**
 * Proyecta la posicion sobre la polilinea de la ruta. El rumbo se mide hacia
 * un punto unos `adelanteM` metros mas adelante sobre la ruta (no solo con el
 * segmento actual) para que no oscile en curvas ni en vertices muy juntos.
 */
export function proyectarEnRuta(ruta: Punto[], posicion: Punto, adelanteM = 20): ProyeccionRuta | null {
  if (ruta.length < 2) return null;

  const mLat = (Math.PI / 180) * RADIO_TIERRA_M;
  const mLng = mLat * Math.cos(aRad(posicion.latitude));
  const x = (p: Punto) => (p.longitude - posicion.longitude) * mLng;
  const y = (p: Punto) => (p.latitude - posicion.latitude) * mLat;

  let mejor = { dist: Infinity, i: 0, t: 0, px: 0, py: 0 };
  for (let i = 0; i < ruta.length - 1; i++) {
    const ax = x(ruta[i]);
    const ay = y(ruta[i]);
    const dx = x(ruta[i + 1]) - ax;
    const dy = y(ruta[i + 1]) - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, (-ax * dx - ay * dy) / l2));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const dist = Math.hypot(px, py);
    if (dist < mejor.dist) mejor = { dist, i, t, px, py };
  }

  const punto: Punto = {
    latitude: posicion.latitude + mejor.py / mLat,
    longitude: posicion.longitude + mejor.px / mLng,
  };

  // Recorre la ruta hacia adelante hasta acumular `adelanteM` metros.
  let destino: Punto = ruta[ruta.length - 1];
  let acumulado = 0;
  let desde: Punto = punto;
  for (let i = mejor.i + 1; i < ruta.length; i++) {
    const tramo = Math.hypot(x(ruta[i]) - x(desde), y(ruta[i]) - y(desde));
    if (acumulado + tramo >= adelanteM) {
      destino = ruta[i];
      break;
    }
    acumulado += tramo;
    desde = ruta[i];
  }

  const iguales = Math.abs(destino.latitude - punto.latitude) + Math.abs(destino.longitude - punto.longitude) < 1e-9;
  // Al final de la ruta no hay "adelante": se usa el ultimo segmento.
  const rumbo = iguales
    ? rumboEntre(ruta[ruta.length - 2], ruta[ruta.length - 1])
    : rumboEntre(punto, destino);

  return { punto, rumbo, desviacionM: mejor.dist, indice: mejor.i };
}
