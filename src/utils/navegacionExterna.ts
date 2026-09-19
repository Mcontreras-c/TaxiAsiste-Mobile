import { Linking } from 'react-native';

type Coordenadas = { lat: number; lng: number };

// Abre Waze directo con el destino, sin preguntar con que app navegar.
//
// Con coordenadas (ya geocodificadas por el mapa) el destino es exacto; sin
// ellas se le pasa la direccion en texto y Waze la resuelve por su cuenta.
//
// Primero el esquema nativo (waze://), que abre la app directo. Si Waze no
// esta instalado, openURL rechaza y se cae al link universal, que lleva a la
// tienda / version web. No hace falta declarar el esquema en app.json:
// startActivity funciona aunque canOpenURL no pueda "ver" la app en Android 11+.
export async function abrirWaze(coords: Coordenadas | null | undefined, direccion: string) {
  const destino = coords ? `ll=${coords.lat},${coords.lng}` : `q=${encodeURIComponent(direccion)}`;
  try {
    await Linking.openURL(`waze://?${destino}&navigate=yes`);
  } catch {
    await Linking.openURL(`https://waze.com/ul?${destino}&navigate=yes`).catch(() => {});
  }
}
