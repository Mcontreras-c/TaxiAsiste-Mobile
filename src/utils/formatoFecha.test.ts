import { formatoFechaHora, formatoHora } from './formatoFecha';

// Fechas construidas en hora local (new Date(a, m, d, h, min)) para que los
// tests no dependan de la zona horaria de la maquina.
describe('formatoHora', () => {
  it('siempre en 24 h, nunca "p. m."', () => {
    expect(formatoHora(new Date(2026, 8, 25, 18, 30))).toBe('18:30');
    expect(formatoHora(new Date(2026, 8, 25, 7, 5))).toBe('07:05');
  });

  it('la medianoche es 00:05 y no 24:05', () => {
    expect(formatoHora(new Date(2026, 8, 25, 0, 5))).toBe('00:05');
  });

  it('el mediodia es 12:00', () => {
    expect(formatoHora(new Date(2026, 8, 25, 12, 0))).toBe('12:00');
  });

  it('acepta un texto ISO y un timestamp', () => {
    const d = new Date(2026, 8, 25, 21, 40);
    expect(formatoHora(d.toISOString())).toBe('21:40');
    expect(formatoHora(d.getTime())).toBe('21:40');
  });

  it('devuelve "—" si la fecha no es valida', () => {
    expect(formatoHora('no-es-fecha')).toBe('—');
  });
});

describe('formatoFechaHora', () => {
  const d = new Date(2026, 8, 5, 18, 30);

  it('estilo corto por defecto: dd-mm-aa, HH:MM', () => {
    expect(formatoFechaHora(d)).toBe('05-09-26, 18:30');
  });

  it('estilo medium: d mes aaaa, HH:MM', () => {
    expect(formatoFechaHora(d, 'medium')).toBe('5 sept 2026, 18:30');
    expect(formatoFechaHora(new Date(2026, 0, 12, 9, 0), 'medium')).toBe('12 ene 2026, 09:00');
  });

  it('devuelve "—" si la fecha no es valida', () => {
    expect(formatoFechaHora('x')).toBe('—');
  });
});
