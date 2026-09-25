import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useConductor } from '../auth/ConductorContext';
import { desconectarMovil } from '../api/moviles';
import { CambiarPasswordModal } from '../components/CambiarPasswordModal';
import { CotizadorScreen } from '../screens/CotizadorScreen';
import { FilaVirtualScreen } from '../screens/FilaVirtualScreen';
import { ServicioActualScreen } from '../screens/ServicioActualScreen';
import { SolicitudesScreen } from '../screens/SolicitudesScreen';
import { colors, gradients, radius } from '../theme';

const Tab = createBottomTabNavigator();

// ServicioActual hace de doble proposito (mapa de flota sin viaje / mapa de
// ruta con viaje activo, ver ServicioActualScreen.tsx) — mismo icono, el
// titulo de la pestana ya distingue el estado.
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  FilaVirtual: 'time-outline',
  Solicitudes: 'call-outline',
  ServicioActual: 'map-outline',
  Cotizador: 'calculator-outline',
};

function CerrarSesionButton() {
  const { logout } = useAuth();
  const { perfil } = useConductor();
  const [cambiandoClave, setCambiandoClave] = useState(false);

  async function salir() {
    const idMovil = perfil?.movil?.id_movil;
    if (idMovil) {
      // Best-effort: si falla por red, igual se cierra sesion localmente.
      // El movil queda "colgado" en su ultimo estado hasta la proxima
      // actualizacion, pero no bloquea el logout del conductor.
      await desconectarMovil(idMovil).catch(() => {});
    }
    await logout();
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 18 }}>
      <TouchableOpacity onPress={() => setCambiandoClave(true)} accessibilityLabel="Cambiar contraseña">
        <Ionicons name="key-outline" size={20} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity onPress={salir}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13.5 }}>Salir</Text>
      </TouchableOpacity>
      <CambiarPasswordModal visible={cambiandoClave} onClose={() => setCambiandoClave(false)} />
    </View>
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
          tabBarActiveTintColor: colors.ink,
          tabBarInactiveTintColor: colors.textFaint,
          tabBarActiveBackgroundColor: colors.accent300,
          // overflow hidden: el fondo activo se pinta en un elemento interno
          // que no respeta el borderRadius del contenedor sin este recorte.
          // Sin marginVertical: con la altura por defecto de la barra, un
          // margen vertical recortaba las etiquetas de las pestañas.
          tabBarItemStyle: { borderRadius: radius.pill, marginHorizontal: 10, overflow: 'hidden' },
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
          options={{ title: 'Mapa' }}
        />
        <Tab.Screen
          name="Cotizador"
          component={CotizadorScreen}
          options={{ title: 'Tarifa' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
