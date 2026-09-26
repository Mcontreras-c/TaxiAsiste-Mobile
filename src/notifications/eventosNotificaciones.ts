import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { notificarLocal } from './notificationClient';

const CLAVE_FILA_ESTADO_ANTERIOR = 'notif_fila_estado_anterior';
const CLAVE_SOLICITUD_ASIGNADA_AVISADA = 'notif_solicitud_asignada_id';
const CLAVE_SESION_AVISADA = 'notif_sesion_avisada';

// Se llama al re-loguear para que una sesion nueva pueda volver a avisar si
// se cierra de nuevo mas adelante (ver AuthContext.login).
export async function limpiarAvisoSesionExpirada() {
  await AsyncStorage.removeItem(CLAVE_SESION_AVISADA).catch(() => {});
}

async function avisarSesionExpirada() {
  // Sin este flag persistido, cada ciclo de 12s del task de ubicacion
  // volveria a disparar la misma notificacion mientras el conductor no
  // vuelva a loguearse (el token sigue invalido tick tras tick).
  const yaAvisada = await AsyncStorage.getItem(CLAVE_SESION_AVISADA);
  if (yaAvisada) return;
  await AsyncStorage.setItem(CLAVE_SESION_AVISADA, '1').catch(() => {});
  await notificarLocal(
    'Sesión cerrada',
    'Se inició sesión con tu cuenta en otro dispositivo. Abre la app para volver a ingresar.'
  );
}

async function revisarFilaBase(idMovil: number) {
  const { data } = await api.get('/fila-base/', { params: { todos: 1 } });
  const miEntrada = data.find(
    (e: any) => e.movil === idMovil && ['EN_ESPERA', 'LLAMADO'].includes(e.estado)
  );
  const estadoActual: string | null = miEntrada?.estado ?? null;
  const estadoAnterior = await AsyncStorage.getItem(CLAVE_FILA_ESTADO_ANTERIOR);

  if (estadoActual === 'LLAMADO' && estadoAnterior === 'EN_ESPERA') {
    await notificarLocal(
      '¡Te llamaron de la base!',
      'El paletero te llamó. Abre la app y pulsa "Voy" antes de 3 minutos para no perder tu turno.'
    );
  }

  // No confirmo a tiempo: el servidor lo paso al final de la fila.
  if (estadoActual === 'EN_ESPERA' && estadoAnterior === 'LLAMADO') {
    await notificarLocal(
      'No confirmaste el llamado',
      'Pasaste al final de la fila. Si no respondes la próxima vez, saldrás de la fila.'
    );
  }

  // Ya no esta en la fila y antes si: se avisa solo si lo saco el sistema (no si salio por su cuenta).
  if (!estadoActual && estadoAnterior) {
    const ultimaSalida = data
      .filter((e: any) => e.movil === idMovil && e.estado === 'RETIRADO')
      .sort((a: any, b: any) => b.id_fila - a.id_fila)[0];
    if (ultimaSalida?.motivo_salida === 'no_respondio') {
      await notificarLocal('Saliste de la fila', 'No respondiste a los llamados. Puedes volver a entrar cuando quieras.');
    } else if (ultimaSalida?.motivo_salida === 'inactividad') {
      await notificarLocal('Saliste de la fila', 'Estuviste más de 5 minutos sin reportar tu ubicación. Puedes volver a entrar cuando quieras.');
    }
  }

  if (estadoActual) {
    await AsyncStorage.setItem(CLAVE_FILA_ESTADO_ANTERIOR, estadoActual);
  } else {
    await AsyncStorage.removeItem(CLAVE_FILA_ESTADO_ANTERIOR);
  }
}

async function revisarSolicitudAsignada(idMovil: number) {
  const { data } = await api.get('/usuarios/perfil_conductor/');
  const viaje = (data.solicitudes_hoy ?? []).find((s: any) => s.estado === 'ASIGNADO');
  const idAvisada = await AsyncStorage.getItem(CLAVE_SOLICITUD_ASIGNADA_AVISADA);

  if (viaje && String(viaje.id_solicitud) !== idAvisada) {
    await notificarLocal('Nuevo viaje asignado', `Viaje ${viaje.folio} — recogida en ${viaje.origen}`);
    await AsyncStorage.setItem(CLAVE_SOLICITUD_ASIGNADA_AVISADA, String(viaje.id_solicitud));
  } else if (!viaje) {
    await AsyncStorage.removeItem(CLAVE_SOLICITUD_ASIGNADA_AVISADA);
  }
}

// Se llama desde la tarea de ubicacion en segundo plano (ver
// tasks/ubicacionTask.ts), aprovechando que ya corre cada ~12s con la app
// viva via el foreground service de Android — evita armar un segundo
// mecanismo de background fetch (que en Android tiene un piso real de
// ~15min, demasiado lento para avisar que llamaron de la base). Cubre
// foreground y background por igual con una sola fuente de verdad.
export async function revisarEventos(idMovil: number): Promise<{ sesionExpirada: boolean }> {
  try {
    await revisarFilaBase(idMovil);
  } catch (err: any) {
    if (err?.response?.status === 401) {
      await avisarSesionExpirada();
      return { sesionExpirada: true };
    }
  }

  try {
    await revisarSolicitudAsignada(idMovil);
  } catch (err: any) {
    if (err?.response?.status === 401) {
      await avisarSesionExpirada();
      return { sesionExpirada: true };
    }
  }

  return { sesionExpirada: false };
}
