import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Notificaciones LOCALES unicamente (sin FCM/push remoto — decision del
// equipo mientras no exista un proyecto Firebase). Se disparan desde este
// mismo dispositivo via scheduleNotificationAsync con trigger:null, tanto en
// foreground como desde la tarea de ubicacion en segundo plano (ver
// tasks/ubicacionTask.ts). El handler debe fijarse antes de cualquier llamada
// a scheduleNotificationAsync o expo-notifications no muestra nada.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function pedirPermisoNotificaciones() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync().catch(() => {});
  }

  // Android 8+ requiere un canal para poder mostrar la notificacion con
  // sonido/vibracion propios; sin esto se muestra igual pero silenciosa.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'TaxiAsiste',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 200, 400],
    }).catch(() => {});
  }
}

export async function notificarLocal(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  }).catch(() => {});
}
