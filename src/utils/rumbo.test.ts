import { diferenciaAngular, proyectarEnRuta, rumboEntre, suavizarRumbo } from './rumbo';
import { Punto } from './rutaProgreso';

// Ruta hacia el oeste y luego hacia el norte (como la de la captura).
const RUTA: Punto[] = [
  { latitude: -33.0, longitude: -70.0 },
  { latitude: -33.0, longitude: -70.002 }, // ~185 m al oeste
  { latitude: -32.998, longitude: -70.002 }, // ~222 m al norte
];

describe('rumboEntre', () => {
  it('norte, este, sur y oeste', () => {
    const o = { latitude: -33, longitude: -70 };
    expect(rumboEntre(o, { latitude: -32.99, longitude: -70 })).toBeCloseTo(0, 0);
    expect(rumboEntre(o, { latitude: -33, longitude: -69.99 })).toBeCloseTo(90, 0);
    expect(rumboEntre(o, { latitude: -33.01, longitude: -70 })).toBeCloseTo(180, 0);
    expect(rumboEntre(o, { latitude: -33, longitude: -70.01 })).toBeCloseTo(270, 0);
  });
});

describe('diferenciaAngular / suavizarRumbo', () => {
  it('toma el camino corto cruzando el norte', () => {
    expect(diferenciaAngular(350, 10)).toBe(20);
    expect(diferenciaAngular(10, 350)).toBe(-20);
  });

  it('avanza hacia el objetivo sin dar la vuelta larga', () => {
    expect(suavizarRumbo(350, 10, 0.5)).toBeCloseTo(0, 5);
  });

  it('ignora cambios menores a la zona muerta', () => {
    expect(suavizarRumbo(100, 102)).toBe(100);
  });

  it('sin rumbo previo adopta el objetivo', () => {
    expect(suavizarRumbo(null, 45)).toBe(45);
  });
});

describe('proyectarEnRuta', () => {
  it('null con menos de 2 puntos', () => {
    expect(proyectarEnRuta([RUTA[0]], RUTA[0])).toBeNull();
  });

  it('en el primer tramo el rumbo es oeste', () => {
    // Auto en el tramo hacia el oeste, ~10 m al sur de la calle (error de GPS).
    const p = proyectarEnRuta(RUTA, { latitude: -33.00009, longitude: -70.001 });
    expect(p).not.toBeNull();
    expect(p!.rumbo).toBeCloseTo(270, 0);
    expect(p!.desviacionM).toBeGreaterThan(8);
    expect(p!.desviacionM).toBeLessThan(12);
    // Queda pegado a la calle: la latitud proyectada es la de la ruta.
    expect(p!.punto.latitude).toBeCloseTo(-33.0, 6);
  });

  it('en el segundo tramo el rumbo es norte', () => {
    const p = proyectarEnRuta(RUTA, { latitude: -32.999, longitude: -70.00201 });
    expect(p!.rumbo).toBeCloseTo(0, 0);
  });

  it('mira adelante: cerca de la esquina ya apunta al giro', () => {
    // 5 m antes de la esquina, con 20 m de vista adelante el rumbo queda entre oeste y norte.
    const p = proyectarEnRuta(RUTA, { latitude: -33.0, longitude: -70.00195 });
    expect(p!.rumbo).toBeGreaterThan(270);
  });

  it('informa en que segmento cae el punto', () => {
    expect(proyectarEnRuta(RUTA, { latitude: -33.0, longitude: -70.001 })!.indice).toBe(0);
    expect(proyectarEnRuta(RUTA, { latitude: -32.999, longitude: -70.002 })!.indice).toBe(1);
  });

  it('al final de la ruta usa el ultimo segmento', () => {
    const p = proyectarEnRuta(RUTA, { latitude: -32.998, longitude: -70.002 });
    expect(p!.rumbo).toBeCloseTo(0, 0);
  });
});
