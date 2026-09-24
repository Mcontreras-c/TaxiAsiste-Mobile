/** Minutos enteros transcurridos desde una fecha ISO (nunca negativo; 0 si es invalida). */
export function minutosDesde(fechaIso: string | null | undefined, ahora: number = Date.now()): number {
  if (!fechaIso) return 0;
  const t = new Date(fechaIso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((ahora - t) / 60000));
}

/** "Recién", "12 min" o "1 h 5 min". */
export function formatoDuracion(minutos: number): string {
  if (minutos < 1) return 'Recién';
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${h} h` : `${h} h ${resto} min`;
}

/** El nombre del socio llega como "Nombre Apellido (RUT)": el paletero no necesita el RUT. */
export function nombreSinRut(nombre: string | null | undefined): string {
  return (nombre ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim();
}
