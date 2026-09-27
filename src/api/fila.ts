import { api } from './client';

export type EntradaFila = {
  id_fila: number;
  movil: number;
  patente: string;
  socio_nombre: string;
  posicion: number;
  estado: string;
  fecha_ingreso: string | null;
  fecha_llamado: string | null;
  fecha_salida: string | null;
  /** El conductor llamado ya pulso "Voy". */
  confirmado: boolean;
  /** Llamados seguidos sin confirmar (con 2 se retira de la fila). */
  no_respuestas: number;
  /** Por que la saco el sistema: 'inactividad' | 'no_respondio' (null si salio por una persona). */
  motivo_salida: 'inactividad' | 'no_respondio' | null;
  /** Segundos que le quedan para confirmar, calculados por el servidor (null si no aplica). */
  segundos_restantes: number | null;
};

// Historial completo (?todos=1): incluye RETIRADO, que sirve para avisar por que salio alguien.
export const getFilaCompleta = () =>
  api.get<EntradaFila[]>('/fila-base/', { params: { todos: 1 } }).then((r) => r.data);

export const confirmarLlamado = (idFila: number) =>
  api.post<EntradaFila>(`/fila-base/${idFila}/confirmar/`).then((r) => r.data);

export const esActiva = (e: EntradaFila) => ['EN_ESPERA', 'LLAMADO'].includes(e.estado);

export const TEXTO_MOTIVO_SALIDA: Record<string, string> = {
  inactividad: 'por no reportar ubicación',
  no_respondio: 'por no responder al llamado',
};
