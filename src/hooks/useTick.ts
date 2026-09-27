import { useEffect, useState } from 'react';

/** Devuelve Date.now() actualizado cada `ms` mientras `activo`; sirve para cuentas regresivas. */
export function useTick(activo: boolean, ms = 1000): number {
  const [ahora, setAhora] = useState(Date.now());

  useEffect(() => {
    if (!activo) return;
    setAhora(Date.now());
    const id = setInterval(() => setAhora(Date.now()), ms);
    return () => clearInterval(id);
  }, [activo, ms]);

  return ahora;
}
