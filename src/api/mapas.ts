import { api } from './client';

export interface GeocodResultado {
  lat: number;
  lng: number;
  direccion_formateada: string;
}

export interface RutaResultado {
  geometry: { type: 'LineString'; coordinates: [number, number][] }; // [lng, lat]
  distancia_m: number;
  duracion_s: number;
}

export const geocodificar = (direccion: string) =>
  api.get<GeocodResultado>('/geocodificar/', { params: { direccion } }).then((r) => r.data);

export const obtenerRuta = (origen: { lat: number; lng: number }, destino: { lat: number; lng: number }) =>
  api
    .get<RutaResultado>('/ruta/', {
      params: {
        origen_lat: origen.lat,
        origen_lng: origen.lng,
        destino_lat: destino.lat,
        destino_lng: destino.lng,
      },
    })
    .then((r) => r.data);

export interface RutaCotizada {
  resumen: string;
  distancia_m: number;
  duracion_s: number;
  /** Tiempo de la ruta sin trafico (duracion_s ya incluye el trafico de ahora). */
  duracion_libre_s?: number;
  /** Tiempo con trafico pesado segun Google (null si no estuvo disponible). */
  duracion_trafico_pesado_s?: number | null;
  /** Valor de siempre: igual a tarifa_minima. */
  tarifa_estimada: number;
  /** Lo menos que puede marcar el taximetro en esta ruta. */
  tarifa_minima?: number;
  /** Lo mas que puede marcar con trafico pesado (igual a la minima si no hay atraso). */
  tarifa_maxima?: number;
  geometry: { type: 'LineString'; coordinates: [number, number][] }; // [lng, lat]
}

export interface PuntoCotizado {
  lat: number;
  lng: number;
  direccion: string | null;
}

export interface Cotizacion {
  origen: PuntoCotizado;
  destino: PuntoCotizado;
  rutas: RutaCotizada[];
  bajada_de_bandera: number;
}

export type OrigenCotizacion =
  | { tipo: 'hospital' }
  | { tipo: 'gps'; lat: number; lng: number }
  | { tipo: 'texto'; texto: string };

// Sin origen explicito el backend parte desde el hospital.
export const cotizarTarifa = (origen: OrigenCotizacion, destinoTexto: string) =>
  api
    .get<Cotizacion>('/cotizar_tarifa/', {
      params: {
        destino_texto: destinoTexto,
        ...(origen.tipo === 'gps' ? { origen_lat: origen.lat, origen_lng: origen.lng } : {}),
        ...(origen.tipo === 'texto' ? { origen_texto: origen.texto } : {}),
      },
    })
    .then((r) => r.data);
