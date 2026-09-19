// Por defecto se usa app.json tal cual (proyecto del equipo dortiizs-team).
//
// Con EAS_CUENTA=personal se compila contra el proyecto de la cuenta personal
// "dortiiz" en Expo -- se usa cuando el cupo gratuito de builds del equipo se
// agota. Es OTRO proyecto de EAS (otro slug, otro projectId y otra llave de
// firma), asi que el APK resultante no se puede instalar encima de uno del
// equipo: hay que desinstalar el anterior primero.
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
