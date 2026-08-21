package expo.modules.directcall

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// Modulo legacy de React Native (no usa la API de Expo Modules / Kotlin DSL
// con generics 'reified' — esa version fallaba en runtime con
// UnsupportedOperationException, ver historial). Coloca una llamada directa
// (Intent.ACTION_CALL) en vez de ACTION_DIAL — ACTION_DIAL solo abre el
// marcador con el numero cargado y requiere que el usuario toque "Llamar";
// ACTION_CALL, con el permiso CALL_PHONE ya concedido, marca de inmediato
// sin ninguna confirmacion adicional.
//
// Android-only a proposito: iOS no permite que una app coloque una llamada
// sin confirmacion del usuario bajo ninguna circunstancia — restriccion dura
// de la plataforma, no algo resoluble con codigo nativo.
class DirectCallModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "DirectCallModule"

  @ReactMethod
  fun placeCall(numero: String, promise: Promise) {
    val context = reactApplicationContext

    val tienePermiso = ContextCompat.checkSelfPermission(
      context,
      Manifest.permission.CALL_PHONE
    ) == PackageManager.PERMISSION_GRANTED

    if (!tienePermiso) {
      // Sin el permiso CALL_PHONE, ACTION_CALL lanza una SecurityException.
      // Se degrada a ACTION_DIAL (abre el marcador, requiere un toque del
      // usuario) en vez de crashear la app.
      val intentDial = Intent(Intent.ACTION_DIAL).apply {
        data = Uri.parse("tel:$numero")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intentDial)
      promise.resolve(false)
      return
    }

    try {
      val intentLlamada = Intent(Intent.ACTION_CALL).apply {
        data = Uri.parse("tel:$numero")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intentLlamada)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("DIRECT_CALL_ERROR", e.message, e)
    }
  }
}
