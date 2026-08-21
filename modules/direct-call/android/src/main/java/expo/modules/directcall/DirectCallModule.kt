package expo.modules.directcall

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Coloca una llamada directa (Intent.ACTION_CALL) en vez de ACTION_DIAL —
// ACTION_DIAL solo abre el marcador con el numero cargado y requiere que el
// usuario toque "Llamar"; ACTION_CALL, con el permiso CALL_PHONE ya
// concedido, marca de inmediato sin ninguna confirmacion adicional.
//
// Esto es Android-only a proposito (ver expo-module.config.json): iOS no
// permite que una app coloque una llamada sin confirmacion del usuario bajo
// ninguna circunstancia — es una restriccion dura de la plataforma, no algo
// que se pueda resolver con codigo nativo.
class DirectCallModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DirectCallModule")

    Function("placeCall") { numero: String ->
      val context = appContext.reactContext ?: return@Function false

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
        return@Function false
      }

      val intentLlamada = Intent(Intent.ACTION_CALL).apply {
        data = Uri.parse("tel:$numero")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intentLlamada)
      return@Function true
    }
  }
}
