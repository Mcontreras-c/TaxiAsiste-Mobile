import { useEffect, useRef } from 'react';
import { Alert, Vibration } from 'react-native';
import { api } from '../api/client';

const INTERVALO_MS = 8000;

// Revisa periodicamente si el paletero llamo al movil del conductor (fila-base
// pasa de EN_ESPERA a LLAMADO) y avisa con una alerta + vibracion, sin importar
// en que pestana este el conductor. REST + polling, igual que el resto del app
// (sin WebSockets).
export function useNotificacionFila(idMovil: number | null) {
  const estadoAnteriorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!idMovil) {
      estadoAnteriorRef.current = null;
      return;
    }

    async function revisar() {
      try {
        const { data } = await api.get('/fila-base/', { params: { todos: 1 } });
        const miEntrada = data.find(
          (e: any) => e.movil === idMovil && ['EN_ESPERA', 'LLAMADO'].includes(e.estado)
        );
        const estadoActual: string | null = miEntrada?.estado ?? null;

        if (estadoActual === 'LLAMADO' && estadoAnteriorRef.current === 'EN_ESPERA') {
          Vibration.vibrate([0, 400, 200, 400]);
          Alert.alert('¡Te llamaron de la base!', 'El paletero te está esperando, avanza tu móvil.');
        }
        estadoAnteriorRef.current = estadoActual;
      } catch {
        // Silencioso: se reintenta en el siguiente ciclo, no bloquea la app.
      }
    }

    revisar();
    const intervalo = setInterval(revisar, INTERVALO_MS);
    return () => clearInterval(intervalo);
  }, [idMovil]);
}
