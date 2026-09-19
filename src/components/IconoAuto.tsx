import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

const VIDRIO = '#1f2a44';

// Auto en vista superior para los marcadores del mapa: carroceria con
// contorno blanco (se lee sobre mapa claro u oscuro), parabrisas y luneta,
// faros, luces traseras, espejos y el letrero de taxi en el techo. Apunta
// hacia arriba: el marcador se rota con `rotation` (rumbo) desde el mapa.
export function IconoAuto({ color, esMio }: { color: string; esMio: boolean }) {
  return (
    <Svg width={46} height={68} viewBox="0 0 46 68">
      {esMio && <Circle cx={23} cy={34} r={22} fill="#0072bc" fillOpacity={0.16} />}
      <G transform="translate(6 4)">
        {/* Sombra */}
        <Ellipse cx={17} cy={33} rx={15} ry={29} fill="#000" fillOpacity={0.18} />
        {/* Espejos */}
        <Ellipse cx={3.6} cy={19} rx={3} ry={2.2} fill={color} stroke="#fff" strokeWidth={1} />
        <Ellipse cx={30.4} cy={19} rx={3} ry={2.2} fill={color} stroke="#fff" strokeWidth={1} />
        {/* Carroceria */}
        <Path
          d="M17 1.5C9.5 1.5 6.2 6.6 6.2 13.6L6.2 46C6.2 54 9.6 58.5 17 58.5C24.4 58.5 27.8 54 27.8 46L27.8 13.6C27.8 6.6 24.5 1.5 17 1.5Z"
          fill={color}
          stroke="#fff"
          strokeWidth={1.6}
        />
        {/* Reflejo del capo */}
        <Path d="M10 9C12 6.5 22 6.5 24 9L24 11C20 9.6 14 9.6 10 11Z" fill="#fff" fillOpacity={0.35} />
        {/* Parabrisas */}
        <Path d="M9.6 15.4Q17 12.4 24.4 15.4L23 23.4Q17 21.8 11 23.4Z" fill={VIDRIO} />
        <Path d="M11.2 16.2L14.6 15.2L13.2 21.6L11.6 22Z" fill="#fff" fillOpacity={0.16} />
        {/* Techo con letrero de taxi */}
        <Rect x={10.4} y={24.6} width={13.2} height={13} rx={3.4} fill="#000" fillOpacity={0.1} />
        <Rect x={13.4} y={28} width={7.2} height={3.4} rx={1.2} fill={VIDRIO} />
        {/* Luneta */}
        <Path d="M10.6 39.4Q17 37.8 23.4 39.4L24.6 44.6Q17 46.6 9.4 44.6Z" fill={VIDRIO} />
        {/* Faros */}
        <Ellipse cx={11.2} cy={4.6} rx={2.6} ry={1.4} fill="#fff8d6" />
        <Ellipse cx={22.8} cy={4.6} rx={2.6} ry={1.4} fill="#fff8d6" />
        {/* Luces traseras */}
        <Rect x={9.2} y={54} width={5} height={1.8} rx={0.9} fill="#ef4444" />
        <Rect x={19.8} y={54} width={5} height={1.8} rx={0.9} fill="#ef4444" />
      </G>
    </Svg>
  );
}
