/** Pesos chilenos con punto de miles: 26100 -> "$26.100". Manual, sin depender de Intl del telefono. */
export function formatoPeso(valor: number): string {
  const entero = Math.round(valor);
  const signo = entero < 0 ? '-' : '';
  return `${signo}$${String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

type TarifaDeRuta = {
  tarifa_estimada: number;
  tarifa_minima?: number;
  tarifa_maxima?: number;
};

/**
 * Rango de la ruta. Un servidor que todavia no entrega tarifa_minima / tarifa_maxima
 * se muestra como un valor unico (tarifa_estimada), nunca con un rango inventado.
 */
export function rangoDeRuta(ruta: TarifaDeRuta): { minima: number; maxima: number } {
  const minima = ruta.tarifa_minima ?? ruta.tarifa_estimada;
  const maxima = Math.max(minima, ruta.tarifa_maxima ?? minima);
  return { minima, maxima };
}

/** "$26.100 – $28.700", o "$26.100" si no hay diferencia entre el minimo y el maximo. */
export function textoRango(minima: number, maxima: number): string {
  return maxima > minima ? `${formatoPeso(minima)} – ${formatoPeso(maxima)}` : formatoPeso(minima);
}
