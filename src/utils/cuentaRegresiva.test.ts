import { formatoCuenta, segundosVisibles } from './cuentaRegresiva';

describe('segundosVisibles', () => {
  const recibido = 1_000_000;

  it('null si el servidor no informa plazo', () => {
    expect(segundosVisibles(null, recibido, recibido)).toBeNull();
    expect(segundosVisibles(undefined, recibido, recibido)).toBeNull();
  });

  it('al recibirlo muestra lo que dijo el servidor', () => {
    expect(segundosVisibles(120, recibido, recibido)).toBe(120);
  });

  it('baja con el tiempo transcurrido desde que se recibio', () => {
    expect(segundosVisibles(120, recibido, recibido + 45_000)).toBe(75);
    expect(segundosVisibles(120, recibido, recibido + 45_900)).toBe(75); // solo segundos enteros
  });

  it('nunca baja de 0', () => {
    expect(segundosVisibles(10, recibido, recibido + 60_000)).toBe(0);
  });

  it('un reloj del telefono atrasado (ahora < recibidoEn) no suma segundos', () => {
    expect(segundosVisibles(90, recibido, recibido - 5_000)).toBe(90);
  });

  it('el valor del servidor 0 sigue siendo 0 (plazo agotado)', () => {
    expect(segundosVisibles(0, recibido, recibido)).toBe(0);
  });
});

describe('formatoCuenta', () => {
  it('minutos:segundos con dos digitos de segundos', () => {
    expect(formatoCuenta(165)).toBe('2:45');
    expect(formatoCuenta(180)).toBe('3:00');
    expect(formatoCuenta(9)).toBe('0:09');
    expect(formatoCuenta(0)).toBe('0:00');
  });

  it('valores negativos se muestran como 0:00', () => {
    expect(formatoCuenta(-5)).toBe('0:00');
  });
});
