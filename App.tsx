import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { ConductorProvider } from './src/auth/ConductorContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoginScreen } from './src/screens/LoginScreen';
import { PaleteroScreen } from './src/screens/PaleteroScreen';
import { LocationGateScreen } from './src/screens/LocationGateScreen';
import { useLocationGate } from './src/hooks/useLocationGate';
import { detenerTrackingHuerfano, limpiarIdMovilParaTask } from './src/tasks/ubicacionTask';
import { pedirPermisoNotificaciones } from './src/notifications/notificationClient';

function AppContent() {
  const { usuario } = useAuth();

  if (!usuario) {
    return <LoginScreen />;
  }

  if (usuario.rol === 'Paletero') {
    return <PaleteroScreen />;
  }

  return (
    <ConductorProvider>
      <AppNavigator />
    </ConductorProvider>
  );
}

export default function App() {
  const gate = useLocationGate();
  const [limpiezaLista, setLimpiezaLista] = useState(false);

  // startLocationUpdatesAsync registra la tarea a nivel del SO — si la app
  // se cerro sin pasar por "Salir" en una sesion anterior, la tarea puede
  // seguir corriendo nativamente y disparar apenas arranca la app de nuevo,
  // ANTES de que el usuario llegue siquiera al Login. Se limpia una sola
  // vez, apenas el Location Gate confirma permiso+GPS, y solo se muestra
  // Login/Dashboard despues de garantizar que no quedo tracking huerfano.
  //
  // IMPORTANTE: detener la tarea nativa NO alcanza por si solo — hay una
  // carrera inevitable entre "el SO ya tenia una ubicacion en camino antes
  // de que stopLocationUpdatesAsync surtiera efecto" y el momento en que se
  // detiene. Por eso se limpia TAMBIEN el id_movil persistido en
  // AsyncStorage: aunque ese ultimo callback se ejecute igual, el task lo
  // descarta al no encontrar ningun id_movil al cual asociarlo (ver
  // ubicacionTask.ts, rama "sin id_movil... se descarta").
  useEffect(() => {
    if (gate.estado === 'ok' && !limpiezaLista) {
      limpiarIdMovilParaTask();
      detenerTrackingHuerfano().finally(() => setLimpiezaLista(true));
    }
  }, [gate.estado, limpiezaLista]);

  // Se pide una sola vez al arrancar — las notificaciones (fila, viajes
  // asignados, sesion cerrada en otro dispositivo) se disparan desde la
  // tarea de ubicacion en segundo plano (ver eventosNotificaciones.ts) y no
  // dependen de ninguna pantalla en particular.
  useEffect(() => {
    pedirPermisoNotificaciones();
  }, []);

  if (gate.estado === 'verificando' || (gate.estado === 'ok' && !limpiezaLista)) {
    return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
  }

  if (gate.estado === 'bloqueado') {
    return <LocationGateScreen gate={gate} />;
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
