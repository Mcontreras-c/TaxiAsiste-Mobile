import {
  debeRecentrarSolo, MS_SIN_TOCAR_PARA_RECENTRAR, VELOCIDAD_RECENTRAR_KMH,
} from './seguimientoMapa';

const base = { siguiendo: false, velocidadKmh: 40, msDesdeUltimoToque: 10_000 };

describe('debeRecentrarSolo', () => {
  it('recentra si el auto se mueve y hace rato que no se toca el mapa', () => {
    expect(debeRecentrarSolo(base)).toBe(true);
  });

  it('no hace nada si ya sigue al auto', () => {
    expect(debeRecentrarSolo({ ...base, siguiendo: true })).toBe(false);
  });

  it('no recentra con el auto detenido o casi detenido', () => {
    expect(debeRecentrarSolo({ ...base, velocidadKmh: 0 })).toBe(false);
    expect(debeRecentrarSolo({ ...base, velocidadKmh: VELOCIDAD_RECENTRAR_KMH - 0.1 })).toBe(false);
  });

  it('recentra justo desde la velocidad minima', () => {
    expect(debeRecentrarSolo({ ...base, velocidadKmh: VELOCIDAD_RECENTRAR_KMH })).toBe(true);
  });

  it('sin dato de velocidad no recentra', () => {
    expect(debeRecentrarSolo({ ...base, velocidadKmh: null })).toBe(false);
  });

  it('no pelea con el dedo: espera a que pasen unos segundos sin tocar', () => {
    expect(debeRecentrarSolo({ ...base, msDesdeUltimoToque: 0 })).toBe(false);
    expect(debeRecentrarSolo({ ...base, msDesdeUltimoToque: MS_SIN_TOCAR_PARA_RECENTRAR - 1 })).toBe(false);
    expect(debeRecentrarSolo({ ...base, msDesdeUltimoToque: MS_SIN_TOCAR_PARA_RECENTRAR })).toBe(true);
  });
});
