import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { notificarLocal } from './notificationClient';
import { limpiarAvisoSesionExpirada, revisarEventos } from './eventosNotificaciones';

jest.mock('../api/client', () => ({ api: { get: jest.fn() } }));
jest.mock('./notificationClient', () => ({ notificarLocal: jest.fn() }));

const apiGet = api.get as jest.Mock;
const notificarLocalMock = notificarLocal as jest.Mock;

const ID_MOVIL = 42;

function mockFilaBase(entradas: any[]) {
  apiGet.mockImplementation((url: string) => {
    if (url === '/fila-base/') return Promise.resolve({ data: entradas });
    if (url === '/usuarios/perfil_conductor/') return Promise.resolve({ data: { solicitudes_hoy: [] } });
    throw new Error(`URL no mockeada: ${url}`);
  });
}

function mockPerfilConductor(solicitudesHoy: any[]) {
  apiGet.mockImplementation((url: string) => {
    if (url === '/fila-base/') return Promise.resolve({ data: [] });
    if (url === '/usuarios/perfil_conductor/') return Promise.resolve({ data: { solicitudes_hoy: solicitudesHoy } });
    throw new Error(`URL no mockeada: ${url}`);
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('revisarEventos — fila de base', () => {
  it('no notifica si nunca hubo un estado anterior (primer ciclo)', async () => {
    mockFilaBase([{ movil: ID_MOVIL, estado: 'LLAMADO' }]);

    await revisarEventos(ID_MOVIL);

    expect(notificarLocalMock).not.toHaveBeenCalled();
  });

  it('notifica cuando la entrada pasa de EN_ESPERA a LLAMADO entre dos ciclos', async () => {
    mockFilaBase([{ movil: ID_MOVIL, estado: 'EN_ESPERA' }]);
    await revisarEventos(ID_MOVIL); // fija el estado anterior = EN_ESPERA

    mockFilaBase([{ movil: ID_MOVIL, estado: 'LLAMADO' }]);
    await revisarEventos(ID_MOVIL);

    expect(notificarLocalMock).toHaveBeenCalledWith(
      '¡Te llamaron de la base!',
      expect.stringContaining('paletero')
    );
  });

  it('no vuelve a notificar en el ciclo siguiente si el estado no cambio', async () => {
    mockFilaBase([{ movil: ID_MOVIL, estado: 'EN_ESPERA' }]);
    await revisarEventos(ID_MOVIL);
    mockFilaBase([{ movil: ID_MOVIL, estado: 'LLAMADO' }]);
    await revisarEventos(ID_MOVIL); // notifica aca
    notificarLocalMock.mockClear();

    await revisarEventos(ID_MOVIL); // mismo LLAMADO, no debe repetir

    expect(notificarLocalMock).not.toHaveBeenCalled();
  });

  it('ignora entradas de otros moviles', async () => {
    mockFilaBase([{ movil: ID_MOVIL, estado: 'EN_ESPERA' }]);
    await revisarEventos(ID_MOVIL);
    mockFilaBase([{ movil: 999, estado: 'LLAMADO' }]);

    await revisarEventos(ID_MOVIL);

    expect(notificarLocalMock).not.toHaveBeenCalled();
  });
});

describe('revisarEventos — solicitud asignada', () => {
  it('notifica cuando aparece un viaje en estado ASIGNADO', async () => {
    mockPerfilConductor([{ id_solicitud: 7, estado: 'ASIGNADO', folio: 'SOL-0007', origen: 'Plaza de Armas' }]);

    await revisarEventos(ID_MOVIL);

    expect(notificarLocalMock).toHaveBeenCalledWith(
      'Nuevo viaje asignado',
      expect.stringContaining('SOL-0007')
    );
  });

  it('no repite el aviso del mismo viaje en el siguiente ciclo', async () => {
    mockPerfilConductor([{ id_solicitud: 7, estado: 'ASIGNADO', folio: 'SOL-0007', origen: 'Plaza de Armas' }]);
    await revisarEventos(ID_MOVIL);
    notificarLocalMock.mockClear();

    await revisarEventos(ID_MOVIL);

    expect(notificarLocalMock).not.toHaveBeenCalled();
  });

  it('vuelve a notificar si se completa un viaje y se asigna uno nuevo', async () => {
    mockPerfilConductor([{ id_solicitud: 7, estado: 'ASIGNADO', folio: 'SOL-0007', origen: 'Plaza de Armas' }]);
    await revisarEventos(ID_MOVIL);
    notificarLocalMock.mockClear();

    mockPerfilConductor([{ id_solicitud: 8, estado: 'ASIGNADO', folio: 'SOL-0008', origen: 'Aeropuerto' }]);
    await revisarEventos(ID_MOVIL);

    expect(notificarLocalMock).toHaveBeenCalledWith(
      'Nuevo viaje asignado',
      expect.stringContaining('SOL-0008')
    );
  });
});

describe('revisarEventos — sesion expirada (401)', () => {
  it('avisa una sola vez y reporta sesionExpirada: true', async () => {
    apiGet.mockRejectedValue({ response: { status: 401 } });

    const primero = await revisarEventos(ID_MOVIL);
    const segundo = await revisarEventos(ID_MOVIL);

    expect(primero).toEqual({ sesionExpirada: true });
    expect(segundo).toEqual({ sesionExpirada: true });
    expect(notificarLocalMock).toHaveBeenCalledTimes(1);
    expect(notificarLocalMock).toHaveBeenCalledWith('Sesión cerrada', expect.any(String));
  });

  it('vuelve a avisar tras limpiarAvisoSesionExpirada (nuevo login)', async () => {
    apiGet.mockRejectedValue({ response: { status: 401 } });
    await revisarEventos(ID_MOVIL);
    notificarLocalMock.mockClear();

    await limpiarAvisoSesionExpirada();
    await revisarEventos(ID_MOVIL);

    expect(notificarLocalMock).toHaveBeenCalledTimes(1);
  });

  it('un error que no es 401 no dispara el aviso de sesion', async () => {
    apiGet.mockRejectedValue({ response: { status: 500 } });

    const resultado = await revisarEventos(ID_MOVIL);

    expect(resultado).toEqual({ sesionExpirada: false });
    expect(notificarLocalMock).not.toHaveBeenCalled();
  });
});
