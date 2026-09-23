import {
  distanciaM, formatoDistancia, formatoMinutos, horaLlegada, progresoEnRuta, Punto,
} from './rutaProgreso';
import { procesarVelocidad } from './velocidad';

// Ruta recta hacia el norte: ~1112 m (0.01 grados de latitud), 4 puntos.
const RUTA: Punto[] = [
  { latitude: -33.0, longitude: -70.0 },
  { latitude: -32.997, longitude: -70.0 },
  { latitude: -32.993, longitude: -70.0 },
  { latitude: -32.99, longitude: -70.0 },
];
const TOTAL_M = 2000; // lo que "dijo" Google (distinto del largo de la polilinea)
const TOTAL_S = 600;

describe('procesarVelocidad', () => {
  it('devuelve null si el GPS no tiene dato', () => {
    expect(procesarVelocidad(null, null)).toBeNull();
    expect(procesarVelocidad(undefined, 30)).toBeNull();
    expect(procesarVelocidad(-1, 30)).toBeNull();
    expect(procesarVelocidad(NaN, 30)).toBeNull();
  });

  it('muestra 0 con el auto detenido aunque el GPS tiemble', () => {
    expect(procesarVelocidad(0.4, null)).toBe(0); // 1.4 km/h
    expect(procesarVelocidad(0.5, 40)).toBe(0);
  });

  it('convierte m/s a km/h', () => {
    expect(procesarVelocidad(10, null)).toBeCloseTo(36, 5);
  });

  it('suaviza contra la lectura anterior', () => {
    // previo 30, nueva 50 -> 30*0.4 + 50*0.6 = 42
    expect(procesarVelocidad(50 / 3.6, 30)).toBeCloseTo(42, 5);
  });
});

describe('progresoEnRuta', () => {
  it('al inicio falta toda la ruta', () => {
    const p = progresoEnRuta(RUTA, RUTA[0], TOTAL_M, TOTAL_S)!;
    expect(p.restanteM).toBeCloseTo(TOTAL_M, 0);
    expect(p.restanteS).toBeCloseTo(TOTAL_S, 0);
    expect(p.desviacionM).toBeLessThan(1);
  });

  it('en la mitad falta la mitad', () => {
    const mitad = { latitude: -32.995, longitude: -70.0 };
    const p = progresoEnRuta(RUTA, mitad, TOTAL_M, TOTAL_S)!;
    expect(p.restanteM).toBeCloseTo(TOTAL_M / 2, -1);
    expect(p.restanteS).toBeCloseTo(TOTAL_S / 2, -1);
  });

  it('al llegar no falta nada', () => {
    const p = progresoEnRuta(RUTA, RUTA[3], TOTAL_M, TOTAL_S)!;
    expect(p.restanteM).toBeLessThan(5);
  });

  it('mide el desvio cuando el auto se sale de la ruta', () => {
    // ~111 m al este de la ruta
    const fuera = { latitude: -32.995, longitude: -69.9988 };
    const p = progresoEnRuta(RUTA, fuera, TOTAL_M, TOTAL_S)!;
    expect(p.desviacionM).toBeGreaterThan(80);
    expect(p.desviacionM).toBeLessThan(140);
  });

  it('un auto que ya paso el final no da valores negativos', () => {
    const pasado = { latitude: -32.98, longitude: -70.0 };
    const p = progresoEnRuta(RUTA, pasado, TOTAL_M, TOTAL_S)!;
    expect(p.restanteM).toBeGreaterThanOrEqual(0);
    expect(p.restanteS).toBeGreaterThanOrEqual(0);
  });

  it('devuelve null con una ruta sin tramos', () => {
    expect(progresoEnRuta([RUTA[0]], RUTA[0], TOTAL_M, TOTAL_S)).toBeNull();
    expect(progresoEnRuta([RUTA[0], RUTA[0]], RUTA[0], TOTAL_M, TOTAL_S)).toBeNull();
  });
});

describe('distanciaM', () => {
  it('0.01 grados de latitud son ~1112 m', () => {
    expect(distanciaM(RUTA[0], RUTA[3])).toBeCloseTo(1112, -1);
  });
});

describe('formatos', () => {
  it('distancia', () => {
    expect(formatoDistancia(8900)).toBe('8,9 km');
    expect(formatoDistancia(1000)).toBe('1,0 km');
    expect(formatoDistancia(847)).toBe('850 m');
    expect(formatoDistancia(3)).toBe('10 m');
  });

  it('minutos', () => {
    expect(formatoMinutos(20)).toBe('1 min');
    expect(formatoMinutos(16 * 60)).toBe('16 min');
    expect(formatoMinutos(60 * 60)).toBe('1 h');
    expect(formatoMinutos(65 * 60)).toBe('1 h 5 min');
  });

  it('hora de llegada', () => {
    const ahora = new Date(2026, 8, 19, 21, 1, 0);
    expect(horaLlegada(16 * 60, ahora)).toBe('21:17');
    expect(horaLlegada(4 * 3600, ahora)).toBe('01:01');
  });
});
