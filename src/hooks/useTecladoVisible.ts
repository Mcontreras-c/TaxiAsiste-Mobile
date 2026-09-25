import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/** true mientras el teclado del telefono esta abierto. */
export function useTecladoVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mostrar = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const ocultar = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);

  return visible;
}
