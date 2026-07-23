import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Button, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { FilaVirtualScreen } from '../screens/FilaVirtualScreen';
import { ServicioActualScreen } from '../screens/ServicioActualScreen';
import { SolicitudesScreen } from '../screens/SolicitudesScreen';

const Tab = createBottomTabNavigator();

function CerrarSesionButton() {
  const { logout } = useAuth();
  return (
    <View style={{ marginRight: 12 }}>
      <Button title="Salir" onPress={logout} />
    </View>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerRight: () => <CerrarSesionButton />,
        }}
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
