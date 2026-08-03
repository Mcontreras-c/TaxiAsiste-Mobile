import { View } from 'react-native';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { ConductorProvider } from './src/auth/ConductorContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoginScreen } from './src/screens/LoginScreen';
import { PaleteroScreen } from './src/screens/PaleteroScreen';
import { LocationGateScreen } from './src/screens/LocationGateScreen';
import { useLocationGate } from './src/hooks/useLocationGate';

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

  // Bloquea TODO — incluido el Login — hasta tener permiso de ubicacion Y
  // el GPS encendido. Mientras se verifica (solo al abrir la app), no se
  // muestra nada para evitar un flash de la pantalla de bloqueo cuando en
  // realidad todo esta bien.
  if (gate.estado === 'verificando') {
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
