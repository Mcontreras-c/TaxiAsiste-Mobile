import { formatoDuracion, minutosDesde, nombreSinRut } from './tiempoFila';

describe('minutosDesde', () => {
  const ahora = new Date('2026-09-23T12:00:00Z').getTime();

  it('calcula los minutos enteros', () => {
    expect(minutosDesde('2026-09-23T11:48:30Z', ahora)).toBe(11);
  });

  it('nunca es negativo (reloj del telefono adelantado)', () => {
    expect(minutosDesde('2026-09-23T12:05:00Z', ahora)).toBe(0);
  });

  it('0 si falta o es invalida', () => {
    expect(minutosDesde(null, ahora)).toBe(0);
    expect(minutosDesde('no-es-fecha', ahora)).toBe(0);
  });
});

describe('formatoDuracion', () => {
  it('formatea recien, minutos y horas', () => {
    expect(formatoDuracion(0)).toBe('Recién');
    expect(formatoDuracion(12)).toBe('12 min');
    expect(formatoDuracion(60)).toBe('1 h');
    expect(formatoDuracion(125)).toBe('2 h 5 min');
  });
});

describe('nombreSinRut', () => {
  it('quita el RUT entre parentesis', () => {
    expect(nombreSinRut('Carlos Muñoz (11111111-1)')).toBe('Carlos Muñoz');
  });

  it('deja intacto un nombre sin RUT y tolera null', () => {
    expect(nombreSinRut('Carlos Muñoz')).toBe('Carlos Muñoz');
    expect(nombreSinRut(null)).toBe('');
  });
});
