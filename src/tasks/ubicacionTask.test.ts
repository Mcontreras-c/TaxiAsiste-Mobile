import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { postUbicacion } from '../api/moviles';
import { revisarEventos } from '../notifications/eventosNotificaciones';

jest.mock('../api/moviles', () => ({ postUbicacion: jest.fn() }));
jest.mock('../notifications/eventosNotificaciones', () => ({ revisarEventos: jest.fn() }));

// TaskManager.defineTask no ejecuta el callback en test — solo lo registra.
// Se captura aca para poder invocarlo a mano y probar la logica real que
// corre en segundo plano (ver ubicacionTask.ts).
let taskCallback: (arg: { data: any; error: any }) => Promise<void>;
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn((_name: string, cb: any) => {
    taskCallback = cb;
  }),
}));

jest.mock('expo-location', () => ({
  hasStartedLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
}));

const CLAVE_STORAGE_ID_MOVIL = 'tracking_id_movil';

const postUbicacionMock = postUbicacion as jest.Mock;
const revisarEventosMock = revisarEventos as jest.Mock;
const hasStartedMock = Location.hasStartedLocationUpdatesAsync as jest.Mock;
const stopMock = Location.stopLocationUpdatesAsync as jest.Mock;

function coordenada(lat = -33.45, lng = -70.66) {
  return {
    data: { locations: [{ coords: { latitude: lat, longitude: lng, heading: 90, speed: 10 } }] },
    error: null,
  };
}

// Requiere importarse DESPUES de que los mocks de arriba esten listos, para
// que defineTask() capture taskCallback usando las dependencias mockeadas.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { setIdMovilParaTask, limpiarIdMovilParaTask, detenerTrackingHuerfano, detenerTrackingBackground } =
  require('./ubicacionTask');

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  revisarEventosMock.mockResolvedValue({ sesionExpirada: false });
  postUbicacionMock.mockResolvedValue({});
  stopMock.mockResolvedValue(undefined);
});

describe('setIdMovilParaTask / limpiarIdMovilParaTask', () => {
  it('persiste el id_movil en AsyncStorage', async () => {
    setIdMovilParaTask(42);

    await new Promise((r) => setTimeout(r, 0)); // deja que la promesa interna de AsyncStorage resuelva
    expect(await AsyncStorage.getItem(CLAVE_STORAGE_ID_MOVIL)).toBe('42');
  });

  it('limpiarIdMovilParaTask borra lo persistido', async () => {
    setIdMovilParaTask(42);
    await new Promise((r) => setTimeout(r, 0));

    limpiarIdMovilParaTask();
    await new Promise((r) => setTimeout(r, 0));

    expect(await AsyncStorage.getItem(CLAVE_STORAGE_ID_MOVIL)).toBeNull();
  });
});

describe('detenerTrackingHuerfano / detenerTrackingBackground', () => {
  it('no llama a stopLocationUpdatesAsync si no hay tracking activo', async () => {
    hasStartedMock.mockResolvedValue(false);

    await detenerTrackingHuerfano();

    expect(stopMock).not.toHaveBeenCalled();
  });

  it('detiene el tracking si esta activo', async () => {
    hasStartedMock.mockResolvedValue(true);

    await detenerTrackingBackground();

    expect(stopMock).toHaveBeenCalledWith('taxiasiste-ubicacion-background');
  });
});

describe('callback de la tarea en background', () => {
  it('descarta la coordenada si no hay id_movil (ni en memoria ni en AsyncStorage)', async () => {
    limpiarIdMovilParaTask();
    await new Promise((r) => setTimeout(r, 0));

    await taskCallback(coordenada());

    expect(postUbicacionMock).not.toHaveBeenCalled();
  });

  it('envia la ubicacion y revisa eventos cuando hay id_movil', async () => {
    setIdMovilParaTask(42);
    await new Promise((r) => setTimeout(r, 0));

    await taskCallback(coordenada(-33.1, -70.2));

    expect(postUbicacionMock).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ lat: -33.1, lng: -70.2, heading: 90, velocidad_kmh: 36 })
    );
    expect(revisarEventosMock).toHaveBeenCalledWith(42);
  });

  it('limpia el id_movil si revisarEventos detecta sesion expirada', async () => {
    setIdMovilParaTask(42);
    await new Promise((r) => setTimeout(r, 0));
    revisarEventosMock.mockResolvedValue({ sesionExpirada: true });

    await taskCallback(coordenada());
    await new Promise((r) => setTimeout(r, 0));

    expect(await AsyncStorage.getItem(CLAVE_STORAGE_ID_MOVIL)).toBeNull();
  });

  it('no revienta si el POST de ubicacion falla (red inestable)', async () => {
    setIdMovilParaTask(42);
    await new Promise((r) => setTimeout(r, 0));
    postUbicacionMock.mockRejectedValue({ response: { status: 500 } });

    await expect(taskCallback(coordenada())).resolves.toBeUndefined();
    expect(revisarEventosMock).toHaveBeenCalledWith(42);
  });

  it('no hace nada si el evento no trae locations', async () => {
    setIdMovilParaTask(42);
    await new Promise((r) => setTimeout(r, 0));

    await taskCallback({ data: {}, error: null });

    expect(postUbicacionMock).not.toHaveBeenCalled();
  });
});
