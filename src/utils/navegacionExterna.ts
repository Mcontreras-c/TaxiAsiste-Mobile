import { Alert, Linking } from 'react-native';

// Links universales (https://...) en vez de esquemas nativos (waze://,
// comgooglemaps://): abren la app si esta instalada, o la tienda/version
// web si no — sin necesitar agregar nada a app.json (LSApplicationQueriesSchemes
// en iOS, <queries> en Android) ni, por lo tanto, un rebuild con EAS.
function urlWaze(direccion: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(direccion)}&navigate=yes`;
}

function urlGoogleMaps(direccion: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccion)}&travelmode=driving`;
}

// No se geocodifica la direccion desde aca — Waze y Google Maps ya resuelven
// texto libre por su cuenta, y hacerlo nosotros solo suma una llamada de red
// y otro punto de falla para algo que el destino ya sabe hacer mejor.
export function navegarExterno(direccion: string) {
  Alert.alert('Navegar', `¿Con qué app querés ir a "${direccion}"?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Waze', onPress: () => Linking.openURL(urlWaze(direccion)) },
    { text: 'Google Maps', onPress: () => Linking.openURL(urlGoogleMaps(direccion)) },
  ]);
}
