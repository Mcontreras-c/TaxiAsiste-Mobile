// Misma paleta que el frontend web (ver TaxiAsiste_Frontend/src/theme.ts):
// colores del logo del sindicato — amarillo + azul.
export const colors = {
  accent300: '#fff176',
  accent500: '#ffde00',
  accent600: '#f2c400',
  accent700: '#c79a00',

  ink: '#0072bc',
  inkSoft: '#1e86d1',

  paper: '#fbf9f4',
  surface: '#ffffff',
  border: 'rgba(20,17,11,0.1)',

  text: '#1c1710',
  textMuted: '#6b6152',
  textFaint: '#a89f8f',

  // Colores semanticos (separados del acento, igual que en web)
  good: '#2f7d5b',
  goodBg: '#e4f3ec',
  warn: '#c2410c',
  warnBg: '#fdece2',
  crit: '#c0392b',
  critBg: '#fbe9e9',
  info: '#3355a8',
  infoBg: '#e8ecf9',
  neutralBg: '#f1efe9',
} as const;

export const gradients = {
  sidebar: [colors.accent500, colors.inkSoft, colors.ink] as const,
  button: [colors.accent300, colors.accent500] as const,
  buttonPressed: [colors.accent300, colors.accent600] as const,
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };
