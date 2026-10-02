import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * Altura en pixeles del teclado del telefono mientras esta abierto (0 si esta cerrado).
 *
 * Sirve para dejar espacio bajo el contenido de un ScrollView y poder desplazar el campo
 * que se esta escribiendo por encima del teclado. Se usa la altura completa del teclado
 * a proposito: si Android ya achico la ventana por su cuenta, el espacio de mas solo
 * agrega un poco de recorrido en blanco al final (inofensivo en un ScrollView), mientras
 * que si no la achica, es lo que evita que el teclado tape los campos.
 */
export function useAlturaTeclado(): number {
  const [altura, setAltura] = useState(0);

  useEffect(() => {
    const mostrar = Keyboard.addListener('keyboardDidShow', (e) => setAltura(e.endCoordinates.height));
    const ocultar = Keyboard.addListener('keyboardDidHide', () => setAltura(0));
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);

  return altura;
}
