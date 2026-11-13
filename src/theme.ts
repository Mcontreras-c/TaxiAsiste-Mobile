// Misma paleta que el panel web (ver TaxiAsiste_Frontend/src/theme.ts):
// colores del logo del sindicato (amarillo + azul) sobre una escena oscura de "vidrio".
export const colors = {
  accent300: '#fff176',
  accent500: '#ffde00',
  accent600: '#f2c400',
  accent700: '#c79a00',

  ink: '#0072bc',
  inkSoft: '#1e86d1',

  // Fondos: escena oscura; las tarjetas son translucidas (react-native no tiene
  // desenfoque de fondo, asi que se compensa con un brillo sutil en el borde).
  paper: '#0b1220',
  paperSoft: '#0f1a2e',
  surface: '#1b2436', // equivale a blanco al 7% sobre el fondo; opaco para que las sombras (elevation) no se transparenten
  surfaceSolid: '#16223a', // para modales y paneles flotantes sobre el mapa (deben ser opacos)
  field: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.12)',

  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.68)',
  textFaint: 'rgba(255,255,255,0.45)',
  onAccent: '#0b1220', // texto sobre el amarillo de marca

  // Colores semanticos (versiones claras para fondo oscuro)
  good: '#34d399',
  goodBg: 'rgba(52,211,153,0.16)',
  warn: '#fb923c',
  warnBg: 'rgba(251,146,60,0.16)',
  crit: '#f87171',
  critBg: 'rgba(248,113,113,0.16)',
  critSolid: '#dc2626',
  info: '#60a5fa',
  infoBg: 'rgba(96,165,250,0.16)',
  violet: '#c084fc',
  violetBg: 'rgba(192,132,252,0.16)',
  goldBg: 'rgba(255,222,0,0.12)',
  neutralBg: 'rgba(255,255,255,0.08)',
} as const;

export const gradients = {
  sidebar: ['#0b1220', '#0f1a2e', '#0b3a66'] as const,
  button: [colors.accent300, colors.accent500] as const,
  buttonPressed: [colors.accent300, colors.accent600] as const,
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };
