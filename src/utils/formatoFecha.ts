// Formato unico de fecha y hora para toda la app: horas siempre en 24 h
// (18:30, nunca "6:30 p. m."). Mismos nombres y salidas que
// TaxiAsiste-Frontend/src/utils/formatoFecha.ts, para que web y app se lean
// igual. Usar estas funciones en vez de toLocale*String sueltos.
//
// Se arma a mano (sin Intl): el formato no depende del soporte de Intl del
// motor JS ni del idioma/region configurados en el telefono.

type Fecha = string | number | Date;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

const dos = (n: number) => String(n).padStart(2, '0');

const aFecha = (valor: Fecha): Date => (valor instanceof Date ? valor : new Date(valor));

const esValida = (fecha: Date) => !Number.isNaN(fecha.getTime());

const hora = (fecha: Date) => `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;

/** Hora en 24 h: "18:30". Devuelve "—" si la fecha no es valida. */
export function formatoHora(valor: Fecha): string {
  const fecha = aFecha(valor);
  return esValida(fecha) ? hora(fecha) : '—';
}

/**
 * Fecha y hora: "25-09-26, 18:30" (estilo 'short', el defecto) o
 * "25 sept 2026, 18:30" (estilo 'medium'). Devuelve "—" si no es valida.
 */
export function formatoFechaHora(valor: Fecha, estilo: 'short' | 'medium' = 'short'): string {
  const fecha = aFecha(valor);
  if (!esValida(fecha)) return '—';
  const dia =
    estilo === 'medium'
      ? `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`
      : `${dos(fecha.getDate())}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getFullYear() % 100)}`;
  return `${dia}, ${hora(fecha)}`;
}
