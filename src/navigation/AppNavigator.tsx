import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { FilaVirtualScreen } from '../screens/FilaVirtualScreen';
import { ServicioActualScreen } from '../screens/ServicioActualScreen';
import { SolicitudesScreen } from '../screens/SolicitudesScreen';
import { colors, gradients } from '../theme';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  FilaVirtual: 'time-outline',
  Solicitudes: 'call-outline',
  ServicioActual: 'car-outline',
};

function CerrarSesionButton() {
  const { logout } = useAuth();
  return (
    <TouchableOpacity onPress={logout} style={{ marginRight: 16 }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13.5 }}>Salir</Text>
    </TouchableOpacity>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerRight: () => <CerrarSesionButton />,
          headerBackground: () => (
            <LinearGradient colors={gradients.sidebar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
          ),
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          tabBarActiveTintColor: colors.accent600,
          tabBarInactiveTintColor: colors.textFaint,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={ICONS[route.name] ?? 'ellipse-outline'} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen
          name="FilaVirtual"
          component={FilaVirtualScreen}
          options={{ title: 'Fila Virtual' }}
        />
        <Tab.Screen
          name="Solicitudes"
          component={SolicitudesScreen}
          options={{ title: 'Solicitudes' }}
        />
        <Tab.Screen
          name="ServicioActual"
          component={ServicioActualScreen}
          options={{ title: 'Servicio Actual' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
