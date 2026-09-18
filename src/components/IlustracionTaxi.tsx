import React from 'react';
import { Image } from 'react-native';

// PNG de 1200x546 con fondo transparente (la ilustracion elegida para el
// estado vacio). Se pide el ancho y el alto se deriva de la proporcion real
// de la imagen, asi nunca se deforma.
const PROPORCION = 1200 / 546;

export function IlustracionTaxi({ width = 260 }: { width?: number }) {
  return (
    <Image
      source={require('../../assets/ilustracion-taxi.png')}
      style={{ width, height: width / PROPORCION }}
      resizeMode="contain"
      accessibilityLabel="Taxi en la ciudad"
    />
  );
}
