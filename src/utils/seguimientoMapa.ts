// Desde que velocidad se considera que el conductor "se esta moviendo" (~ caminando rapido
// o mas): mas abajo el GPS oscila con el auto detenido y no vale la pena volver a centrar.
export const VELOCIDAD_RECENTRAR_KMH = 8;

// Tiempo sin tocar el mapa antes de volver a centrar solo: deja mirar una zona con calma y
// no pelea con el dedo mientras se arrastra.
export const MS_SIN_TOCAR_PARA_RECENTRAR = 5000;

/**
 * El conductor movio el mapa con el dedo (ya no sigue al auto): decide si hay que volver a
 * centrarlo solo. Pasa cuando el auto se esta moviendo de verdad y el conductor hace un
 * rato que no toca el mapa. El zoom que eligio se respeta.
 */
export function debeRecentrarSolo(p: {
  siguiendo: boolean;
  velocidadKmh: number | null;
  msDesdeUltimoToque: number;
}): boolean {
  if (p.siguiendo) return false;
  if (p.velocidadKmh === null || p.velocidadKmh < VELOCIDAD_RECENTRAR_KMH) return false;
  return p.msDesdeUltimoToque >= MS_SIN_TOCAR_PARA_RECENTRAR;
}
