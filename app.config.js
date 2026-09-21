// Por defecto se usa app.json tal cual (proyecto del equipo dortiizs-team).
//
// Con EAS_CUENTA=personal se compila contra el proyecto de la cuenta personal
// "dortiiz" en Expo -- se usa cuando el cupo gratuito de builds del equipo se
// agota. Es OTRO proyecto de EAS (otro slug, otro projectId y otra llave de
// firma), asi que el APK resultante no se puede instalar encima de uno del
// equipo: hay que desinstalar el anterior primero.
//
// Con EAS_CUENTA=equipo se compila contra el equipo "miguelotis-team" (cuenta
// propia de Miguel en Expo), mismo motivo: se usa cuando el cupo de
// dortiizs-team se agota. Tambien es OTRO proyecto de EAS -- misma
// advertencia de firma/instalacion que el caso "personal" de arriba.
//
// IMPORTANTE -- Google Maps: la clave de Android esta restringida por paquete
// + huella SHA-1 de la firma. Un build de cualquiera de estas cuentas trae
// OTRA SHA-1, y sin agregarla a la clave (Google Cloud > Credenciales > clave
// de Android) el mapa se ve en negro con el logo de Google.
//
// SHA-1 cuenta "personal" (dortiiz):
//   61:8A:A3:56:60:37:56:4B:16:6E:15:FF:48:F2:33:41:B8:07:A4:5E
// SHA-1 cuenta "equipo" (miguelotis-team): pendiente -- se obtiene con
//   EAS_CUENTA=equipo npx eas credentials
// despues del primer build, y hay que agregarla a la clave de Android en
// Google Cloud Console.
//
// Uso (ver los perfiles "preview-personal" / "preview-equipo" en eas.json,
// que tambien fijan la variable en el servidor de EAS):
//   EAS_CUENTA=personal npx eas build --profile preview-personal --platform android
//   EAS_CUENTA=equipo npx eas build --profile preview-equipo --platform android
const CUENTAS = {
  personal: {
    owner: 'dortiiz',
    slug: 'TaxiAsiste_Mobile',
    projectId: '303bfae8-caa4-4df3-a814-ae388016143d',
  },
  equipo: {
    owner: 'miguelotis-team',
    slug: 'TaxiAsiste_Mobile',
    projectId: '9608b619-cec2-483a-a9b3-62c637138f5a',
  },
};

module.exports = ({ config }) => {
  const cuenta = CUENTAS[process.env.EAS_CUENTA];
  if (!cuenta) return config;

  const { extra, ...configSinExtra } = config;
  const { eas, ...extraSinEas } = extra ?? {};

  return {
    ...configSinExtra,
    owner: cuenta.owner,
    slug: cuenta.slug,
    // Sin projectId todavia: "eas init" lo crea y lo completa aqui la
    // primera vez que se usa esta cuenta. Si se deja el projectId del
    // proyecto dortiizs-team, eas se queja de que el owner no coincide.
    // OJO: "extra.eas" tiene que existir como objeto (aunque venga vacio) o
    // eas-cli truena con "Cannot read properties of undefined" al intentar
    // completar el projectId el mismo.
    extra: { ...extraSinEas, eas: { projectId: cuenta.projectId ?? undefined } },
  };
};
