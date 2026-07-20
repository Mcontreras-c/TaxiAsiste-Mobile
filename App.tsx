import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { ConductorProvider } from './src/auth/ConductorContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoginScreen } from './src/screens/LoginScreen';

function AppContent() {
  const { usuario } = useAuth();

  if (!usuario) {
    return <LoginScreen />;
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
