// Estilo de Google Maps en tonos azul oscuro, igual que el mapa oscuro del panel web
// (ESTILO_MAPA_OSCURO en TaxiAsiste_Frontend/src/components/MapaDespacho.tsx).
export const ESTILO_MAPA_OSCURO = [
  { elementType: 'geometry', stylers: [{ color: '#0f1729' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f1729' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7c8aa5' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1c2b45' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#22314f' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#5c6c8a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#33415c' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#2c3e63' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1424' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0f1a2e' }] },
];
