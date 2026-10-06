import { formatoPeso, rangoDeRuta, textoRango } from './tarifa';

describe('formatoPeso', () => {
  it('pone el punto de miles', () => {
    expect(formatoPeso(500)).toBe('$500');
    expect(formatoPeso(6100)).toBe('$6.100');
    expect(formatoPeso(26100)).toBe('$26.100');
    expect(formatoPeso(1234567)).toBe('$1.234.567');
  });

  it('redondea los decimales y soporta 0', () => {
    expect(formatoPeso(6100.4)).toBe('$6.100');
    expect(formatoPeso(0)).toBe('$0');
  });
});

describe('rangoDeRuta', () => {
  it('usa el minimo y el maximo que entrega el servidor', () => {
    expect(rangoDeRuta({ tarifa_estimada: 6100, tarifa_minima: 6100, tarifa_maxima: 7300 })).toEqual({
      minima: 6100,
      maxima: 7300,
    });
  });

  it('con un servidor sin los campos nuevos muestra solo la tarifa_estimada', () => {
    expect(rangoDeRuta({ tarifa_estimada: 6100 })).toEqual({ minima: 6100, maxima: 6100 });
  });

  it('el maximo nunca queda bajo el minimo', () => {
    expect(rangoDeRuta({ tarifa_estimada: 6100, tarifa_minima: 6100, tarifa_maxima: 5000 })).toEqual({
      minima: 6100,
      maxima: 6100,
    });
  });
});

describe('textoRango', () => {
  it('muestra los dos precios cuando hay rango', () => {
    expect(textoRango(26100, 28700)).toBe('$26.100 – $28.700');
  });

  it('muestra un solo precio cuando no hay diferencia', () => {
    expect(textoRango(6100, 6100)).toBe('$6.100');
  });
});
