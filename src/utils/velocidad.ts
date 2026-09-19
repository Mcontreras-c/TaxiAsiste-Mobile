// El GPS "tiembla" con el auto detenido y marca 1-3 km/h sin moverse.
const KMH_MINIMO = 2;

// Peso de la lectura nueva al suavizar (el resto es la lectura anterior):
// evita que el numero salte de un segundo a otro sin retrasar demasiado.
const PESO_NUEVA = 0.6;

/**
 * Convierte la velocidad del GPS (m/s, como la entrega expo-location) a km/h
 * listos para mostrar. Devuelve null si el GPS no tiene el dato (null,
 * negativa o no numerica -- pasa en los primeros segundos y en tuneles).
 */
export function procesarVelocidad(speedMs: number | null | undefined, previoKmh: number | null): number | null {
  if (speedMs == null || !Number.isFinite(speedMs) || speedMs < 0) return null;
  const kmh = speedMs * 3.6;
  if (kmh < KMH_MINIMO) return 0;
  if (previoKmh == null || previoKmh === 0) return kmh;
  return previoKmh * (1 - PESO_NUEVA) + kmh * PESO_NUEVA;
}
