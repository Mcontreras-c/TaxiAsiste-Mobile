import { api } from './client';

export interface SolicitudPendiente {
  id_solicitud: number;
  folio: string;
  estado: string;
  canal_entrada: string;
  pasajero_nombre: string | null;
  pasajero_telefono: string | null;
  movil_patente: string | null;
  origen: string;
  destino: string;
  fecha_hora: string;
  distancia_km: number | null;
  duracion_min: number | null;
}

// Ordenada por mayor tiempo de espera primero (ver pendientes_con_distancia
// en el Backend) y con distancia/ETA desde la posicion actual del conductor
// hasta cada punto de recogida. distancia_km/duracion_min quedan null para
// una solicitud puntual si su origen no se pudo geocodificar al crearla.
export const getPendientesConDistancia = (lat: number, lng: number) =>
  api
    .get<SolicitudPendiente[]>('/solicitudes/pendientes_con_distancia/', { params: { lat, lng } })
    .then((r) => r.data);

// Fallback sin distancia/ETA -- se usa si no se pudo obtener la posicion
// actual del conductor (permiso de ubicacion denegado, GPS sin fix, etc.),
// para que la pantalla de Solicitudes nunca quede sin datos por eso.
export const getPendientes = () =>
  api.get<SolicitudPendiente[]>('/solicitudes/pendientes/').then((r) => r.data);
