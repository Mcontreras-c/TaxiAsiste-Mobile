import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { ConductorProvider } from './src/auth/ConductorContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoginScreen } from './src/screens/LoginScreen';
import { PaleteroScreen } from './src/screens/PaleteroScreen';

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
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
