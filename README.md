# TaxiAsiste Mobile

App mobile para socios/conductores de TaxiAsiste. Solo cubre **fila virtual** y **solicitudes** del conductor — el resto de roles (Administrador, Central, Tesorero) se manejan en el frontend web, no aca.

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

## 5. Configurar la IP para tu PC

Abre [src/api/client.ts](src/api/client.ts) y cambia `PHYSICAL_DEVICE_HOST` por la IP local de TU propia PC (no la de otra persona):

```
ipconfig        # Windows, busca "Direccion IPv4" de tu adaptador de red
```

También el toggle `USE_EMULATOR`:
- `true` si vas a probar en el emulador de Android Studio
- `false` si vas a probar en tu celular fisico (debe estar en la misma WiFi que tu PC)

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

## Alcance del proyecto (importante)

Esta app es solo para el rol **Conductor**. El login rechaza cualquier otro rol (Administrador, Central, Tesorero) con el mensaje "Esta aplicacion es solo para conductores". No agregar pantallas ni flujos para otros roles aca — esos van en el frontend web.
