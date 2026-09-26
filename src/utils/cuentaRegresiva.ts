/**
 * Segundos que quedan para confirmar el llamado. Parte del valor que calculo el
 * servidor en el momento en que se recibio (`recibidoEn`) y sigue bajando en el
 * telefono entre consultas, asi coincide con el servidor aunque el reloj del
 * telefono este adelantado o atrasado. null si no hay plazo corriendo.
 */
export function segundosVisibles(
  segundosServidor: number | null | undefined,
  recibidoEn: number,
  ahora: number = Date.now()
): number | null {
  if (segundosServidor === null || segundosServidor === undefined) return null;
  const transcurridos = Math.max(0, Math.floor((ahora - recibidoEn) / 1000));
  return Math.max(0, segundosServidor - transcurridos);
}

/** "2:45", "0:09". */
export function formatoCuenta(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
