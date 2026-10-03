import {
  debeEnviarLatido, MARGEN_PARA_LATIDO_MS, marcarEnvio, reiniciarEnvio, ultimoEnvio,
} from './estadoEnvio';

beforeEach(() => reiniciarEnvio());

describe('debeEnviarLatido', () => {
  it('envia si nunca se ha enviado', () => {
    expect(debeEnviarLatido(1_000_000, ultimoEnvio())).toBe(true);
  });

  it('queda callado mientras otro envio fue reciente (la tarea en segundo plano funciona)', () => {
    marcarEnvio(1_000_000);
    expect(debeEnviarLatido(1_000_000 + 5_000, ultimoEnvio())).toBe(false);
    expect(debeEnviarLatido(1_000_000 + MARGEN_PARA_LATIDO_MS - 1, ultimoEnvio())).toBe(false);
  });

  it('toma el relevo si pasa el margen sin ningun envio', () => {
    marcarEnvio(1_000_000);
    expect(debeEnviarLatido(1_000_000 + MARGEN_PARA_LATIDO_MS, ultimoEnvio())).toBe(true);
    expect(debeEnviarLatido(1_000_000 + 60_000, ultimoEnvio())).toBe(true);
  });

  it('el margen queda bajo el limite de 45 s con que el servidor da por desconectado al movil', () => {
    expect(MARGEN_PARA_LATIDO_MS).toBeLessThan(45_000);
  });
});

describe('marcarEnvio', () => {
  it('guarda el momento del ultimo envio y se puede reiniciar', () => {
    marcarEnvio(123);
    expect(ultimoEnvio()).toBe(123);
    reiniciarEnvio();
    expect(ultimoEnvio()).toBe(0);
  });
});
