# TaxiAsiste Mobile

App mobile con dos roles, cada uno con su propia pantalla despues del login:

- **Conductor**: tabs de Fila Virtual, Solicitudes (pendientes, cualquiera las acepta),
  Servicio Actual (viaje activo, llamar pasajero/central, avanzar estado, cancelar solo si
  esta ASIGNADO, boton EMERGENCIA que llama a Carabineros) y Mapa (su movil + otros moviles
  en linea, WebView con el mismo mapa Leaflet/CARTO del panel web). Recibe notificaciones
  locales (sin push remoto todavia) cuando lo llaman de la base, le asignan un viaje, o se
  cierra su sesion desde otro dispositivo — ver detalle en CONTEXTO.md del repo Backend
- **Paletero**: pantalla unica con la fila de base ordenada por posicion, botones
  Llamar y Retirar

El resto de roles (Administrador, Central, Tesorero) se manejan en el frontend web, no aca.
Usuarios de prueba: `conductor`/`conductor123`, `paletero`/`paletero123`.

Stack: React Native + Expo (SDK 57) + TypeScript.

## 1. Requisitos previos

- Node.js instalado
- [Android Studio](https://developer.android.com/studio) instalado, con:
  - Android SDK (se instala junto con Android Studio, opcion "Standard")
  - Un dispositivo virtual (AVD) creado desde **Device Manager** (ej: Pixel 8)
- La app **Expo Go** instalada en tu celular fisico (Play Store), si tambien quieres probar ahi
- El backend de `TaxiAsiste-Backend` corriendo (ver seccion 4)

## 2. Variables de entorno de Android (una sola vez por PC)

Agrega estas variables de entorno de usuario en Windows (Configuracion > Variables de entorno):

- `ANDROID_HOME` = `C:\Users\<TU_USUARIO>\AppData\Local\Android\Sdk`
- Agrega al `Path`:
  - `%ANDROID_HOME%\platform-tools`
  - `%ANDROID_HOME%\emulator`

Cierra y vuelve a abrir la terminal. Verifica con `adb --version`.

## 3. Instalar dependencias

```
npm install
```

## 4. Levantar el backend

En la carpeta de `TaxiAsiste-Backend`, con el venv activado:

```
python manage.py runserver 0.0.0.0:8000
```

**Importante:** siempre con `0.0.0.0:8000`, nunca solo `runserver` a secas. Sin el `0.0.0.0`, el servidor solo escucha en `127.0.0.1` (localhost) y ni el emulador ni el celular van a poder conectarse, aunque el puerto este abierto en el firewall.

## 5. IP del backend (normalmente no hay que tocar nada)

[src/api/client.ts](src/api/client.ts) detecta el host automaticamente:

- **Dev con Metro corriendo** (emulador o celular fisico con `npx expo start`): lee la
  IP de tu PC del mismo `hostUri` que usa Metro — no hace falta configurar nada.
- **Emulador de Android Studio sin celular fisico**: si por algun motivo la deteccion
  automatica falla, cae a `10.0.2.2` (la IP que el emulador usa para ver el localhost
  de tu PC).
- **Build standalone/preview sin Metro** (APK instalado desde EAS, sin `expo start`):
  no hay `hostUri` que detectar. Hay que fijar `EXPO_PUBLIC_API_BASE_URL` en `eas.json`
  (perfil `preview`) con la IP real de tu PC en la red, ej. `http://192.168.1.50:8000`.

## 6. Firewall de Windows (probablemente necesario la primera vez)

Windows suele bloquear conexiones entrantes nuevas por defecto. Si la app se queda "cargando" sin conectar (funciona el ping desde el navegador de la PC pero no desde el emulador/celular), agrega estas reglas:

**Firewall de Windows Defender con seguridad avanzada > Reglas de entrada > Nueva regla:**
- Tipo: Puerto > TCP > Puerto especifico local: `8000` (backend Django) > Permitir conexion > todos los perfiles
- Repite lo mismo para el puerto `8081` (Metro/Expo)

## 7. Levantar la app

```
npx expo start
```

- Para abrir en el **emulador**: con el AVD ya encendido, presiona `a` en la terminal.
- Para abrir en tu **celular fisico**: escanea el QR con la app Expo Go (misma red WiFi que la PC).

## Problemas comunes ya resueltos (por si se repiten)

- **"Native module is null, cannot access legacy storage"**: una dependencia nativa se instalo con `npm install` en vez de `npx expo install`. Usa siempre `npx expo install <paquete>` para librerias nativas (async-storage, navigation, etc.) para que Expo instale la version compatible con el SDK del proyecto.
- **"Failed to compile" / archivos que "no existen" pero si existen**: cache corrupta de Metro. Solucion: `npx expo start -c` (limpia cache).
- **"Project is incompatible with this version of Expo Go"**: la Play Store no tiene aun la version de Expo Go que coincide con el SDK del proyecto (pasa cuando el SDK es muy nuevo). Solucion: instalar el APK correcto manualmente por USB con `adb install`, activando antes "Depuracion USB" en Opciones de desarrollador del celular. El APK queda cacheado en `C:\Users\<usuario>\.expo\android-apk-cache\` despues de intentarlo una vez desde el emulador.
- **App se queda "cargando" sin avisos**: casi siempre es que el backend Django quedo escuchando solo en `127.0.0.1` (por correr `runserver` sin `0.0.0.0`), o que falta la regla de firewall del puerto 8000/8081. Revisa con `netstat -an | findstr 8000` que diga `0.0.0.0:8000` y no `127.0.0.1:8000`.

## Modulos nativos y rebuild con EAS

Este proyecto es 100% managed (sin carpetas `android/`/`ios/` locales). Cualquier libreria
que traiga codigo nativo (`react-native-webview`, `expo-notifications`, `expo-location`,
`expo-task-manager`, etc.) **no queda disponible con solo reiniciar Metro** si el dev
client ya instalado en el celular es de antes de agregarla — hace falta reconstruirlo:

```
eas build --profile development --platform android
```

Antes de lanzarlo, `git status` tiene que estar limpio: EAS build sube el proyecto via
git, asi que cualquier cambio sin commitear (nueva dependencia en `package.json`, cambios
en `app.json`) no llega al build remoto y despues falla con algo como "Cannot find native
module" sin pista clara de la causa real.

## Alcance del proyecto (importante)

Esta app es solo para **Conductor** y **Paletero**. El login rechaza cualquier otro rol (Administrador, Central, Tesorero) con el mensaje "Esta aplicacion es solo para conductores y paleteros". No agregar pantallas ni flujos para esos otros roles aca — esos van en el frontend web.
