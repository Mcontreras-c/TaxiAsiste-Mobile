import { formatoHora } from './formatoFecha';

export type Punto = { latitude: number; longitude: number };

const RADIO_TIERRA_M = 6371000;
const aRad = (grados: number) => (grados * Math.PI) / 180;

export function distanciaM(a: Punto, b: Punto): number {
  const dLat = aRad(b.latitude - a.latitude);
  const dLng = aRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRad(a.latitude)) * Math.cos(aRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type Progreso = {
  /** Metros que faltan hasta el final de la ruta, siguiendo la ruta. */
  restanteM: number;
  /** Segundos estimados que faltan (proporcional a lo que falta de la ruta). */
  restanteS: number;
  /** Distancia en metros de la posicion actual a la ruta (0 = sobre la ruta). */
  desviacionM: number;
};

/**
 * Calcula cuanto falta de una ruta ya descargada, sin volver a llamar a
 * Google: proyecta la posicion sobre el tramo mas cercano de la polilinea y
 * suma lo que queda hasta el final. La polilinea "overview" de Directions esta
 * simplificada y mide un poco menos que la distancia real, asi que se usa la
 * fraccion restante para escalar la distancia y duracion totales que Google
 * devolvio para la ruta.
 */
export function progresoEnRuta(
  ruta: Punto[],
  posicion: Punto,
  distanciaTotalM: number,
  duracionTotalS: number
): Progreso | null {
  if (ruta.length < 2) return null;

  // Proyeccion plana local (metros) alrededor de la posicion: suficiente
  // para tramos de decenas/cientos de metros.
  const mPorGradoLat = (Math.PI / 180) * RADIO_TIERRA_M;
  const mPorGradoLng = mPorGradoLat * Math.cos(aRad(posicion.latitude));
  const x = (p: Punto) => (p.longitude - posicion.longitude) * mPorGradoLng;
  const y = (p: Punto) => (p.latitude - posicion.latitude) * mPorGradoLat;

  const largos: number[] = [];
  let totalRuta = 0;
  for (let i = 0; i < ruta.length - 1; i++) {
    const l = distanciaM(ruta[i], ruta[i + 1]);
    largos.push(l);
    totalRuta += l;
  }
  if (totalRuta === 0) return null;

  let mejorDist = Infinity;
  let mejorRestanteRuta = totalRuta;
  let acumuladoAntes = 0;

  for (let i = 0; i < ruta.length - 1; i++) {
    const ax = x(ruta[i]);
    const ay = y(ruta[i]);
    const bx = x(ruta[i + 1]);
    const by = y(ruta[i + 1]);
    const dx = bx - ax;
    const dy = by - ay;
    const largo2 = dx * dx + dy * dy;
    // t = donde cae la posicion (el origen) sobre el segmento, entre 0 y 1.
    const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, (-ax * dx - ay * dy) / largo2));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const dist = Math.hypot(px, py);
    if (dist < mejorDist) {
      mejorDist = dist;
      mejorRestanteRuta = totalRuta - (acumuladoAntes + t * largos[i]);
    }
    acumuladoAntes += largos[i];
  }

  const fraccion = Math.max(0, Math.min(1, mejorRestanteRuta / totalRuta));
  return {
    restanteM: fraccion * distanciaTotalM,
    restanteS: fraccion * duracionTotalS,
    desviacionM: mejorDist,
  };
}

export function formatoDistancia(metros: number): string {
  if (metros < 1000) return `${Math.max(10, Math.round(metros / 10) * 10)} m`;
  return `${(metros / 1000).toFixed(1).replace('.', ',')} km`;
}

export function formatoMinutos(segundos: number): string {
  const min = Math.max(1, Math.round(segundos / 60));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const resto = min % 60;
  return resto === 0 ? `${h} h` : `${h} h ${resto} min`;
}

// Hora de llegada en 24 h ("21:17") con el formato comun de la app.
export function horaLlegada(segundosRestantes: number, ahora: Date = new Date()): string {
  return formatoHora(new Date(ahora.getTime() + segundosRestantes * 1000));
}
