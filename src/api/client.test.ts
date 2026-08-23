import AsyncStorage from '@react-native-async-storage/async-storage';
import MockAdapter from 'axios-mock-adapter';
import { api, setOnSessionExpired } from './client';

let mock: MockAdapter;

beforeEach(async () => {
  mock = new MockAdapter(api);
  await AsyncStorage.clear();
  setOnSessionExpired(null);
});

afterEach(() => {
  mock.restore();
});

describe('interceptor de refresh automatico', () => {
  it('en un 401, refresca el token y reintenta la request original', async () => {
    await AsyncStorage.setItem('access_token', 'viejo');
    await AsyncStorage.setItem('refresh_token', 'refresh-valido');

    mock
      .onGet('/fila-base/')
      .replyOnce(401)
      .onGet('/fila-base/')
      .reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer nuevo');
        return [200, []];
      });
    mock.onPost('/token/refresh/').reply(200, { access: 'nuevo' });

    const resp = await api.get('/fila-base/');

    expect(resp.data).toEqual([]);
    expect(await AsyncStorage.getItem('access_token')).toBe('nuevo');
  });

  it('sin refresh_token guardado, dispara onSessionExpired directo sin intentar refrescar', async () => {
    await AsyncStorage.setItem('access_token', 'viejo');
    const onExpired = jest.fn();
    setOnSessionExpired(onExpired);

    mock.onGet('/fila-base/').reply(401);
    mock.onPost('/token/refresh/').reply(200, { access: 'no-deberia-llamarse' });

    await expect(api.get('/fila-base/')).rejects.toMatchObject({ response: { status: 401 } });
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('si el refresh token tambien es invalido, dispara onSessionExpired en vez de reintentar en loop', async () => {
    await AsyncStorage.setItem('access_token', 'viejo');
    await AsyncStorage.setItem('refresh_token', 'refresh-vencido');
    const onExpired = jest.fn();
    setOnSessionExpired(onExpired);

    mock.onGet('/fila-base/').reply(401);
    mock.onPost('/token/refresh/').reply(401);

    await expect(api.get('/fila-base/')).rejects.toMatchObject({ response: { status: 401 } });
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('dos requests que pisan un 401 al mismo tiempo comparten un solo refresh', async () => {
    await AsyncStorage.setItem('access_token', 'viejo');
    await AsyncStorage.setItem('refresh_token', 'refresh-valido');

    let llamadasRefresh = 0;
    mock.onGet('/a/').replyOnce(401).onGet('/a/').reply(200, { ok: 'a' });
    mock.onGet('/b/').replyOnce(401).onGet('/b/').reply(200, { ok: 'b' });
    mock.onPost('/token/refresh/').reply(() => {
      llamadasRefresh += 1;
      return [200, { access: 'nuevo' }];
    });

    const [a, b] = await Promise.all([api.get('/a/'), api.get('/b/')]);

    expect(a.data).toEqual({ ok: 'a' });
    expect(b.data).toEqual({ ok: 'b' });
    expect(llamadasRefresh).toBe(1);
  });
});
