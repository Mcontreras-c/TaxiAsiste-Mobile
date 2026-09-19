// Por defecto se usa app.json tal cual (proyecto del equipo dortiizs-team).
//
// Con EAS_CUENTA=personal se compila contra el proyecto de la cuenta personal
// "dortiiz" en Expo -- se usa cuando el cupo gratuito de builds del equipo se
// agota. Es OTRO proyecto de EAS (otro slug, otro projectId y otra llave de
// firma), asi que el APK resultante no se puede instalar encima de uno del
// equipo: hay que desinstalar el anterior primero.
//
// IMPORTANTE -- Google Maps: la clave de Android esta restringida por paquete
// + huella SHA-1 de la firma. Un build de esta cuenta trae OTRA SHA-1, y sin
// agregarla a la clave (Google Cloud > Credenciales > clave de Android) el mapa
// se ve en negro con el logo de Google. SHA-1 de esta cuenta:
//   61:8A:A3:56:60:37:56:4B:16:6E:15:FF:48:F2:33:41:B8:07:A4:5E
//
// Uso (ver el perfil "preview-personal" en eas.json, que tambien fija la
// variable en el servidor de EAS):
//   EAS_CUENTA=personal npx eas build --profile preview-personal --platform android
module.exports = ({ config }) => {
  if (process.env.EAS_CUENTA !== 'personal') return config;

  return {
    ...config,
    owner: 'dortiiz',
    slug: 'TaxiAsiste_Mobile',
    extra: {
      ...config.extra,
      eas: { projectId: '303bfae8-caa4-4df3-a814-ae388016143d' },
    },
  };
};
