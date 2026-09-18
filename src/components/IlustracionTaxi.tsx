import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

const AMARILLO = '#ffd60a';
const AMARILLO_SOMBRA = '#e0b400';
const OSCURO = '#1f2937';
const AZUL_EDIFICIO = '#dbe6f5';
const AZUL_EDIFICIO_2 = '#c9d9ef';
const AZUL_ARBOL = '#9bb4d6';
const AZUL_ARBOL_2 = '#adc3e0';
const AZUL_POSTE = '#8fa6c6';

// Ciudad + taxi de frente, usada en los estados vacios (Fila Virtual,
// Solicitudes). Proporcion fija 320x190 -- pasar width y height en esa
// relacion para que no se deforme.
export function IlustracionTaxi({ width = 220, height = 131 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 320 190">
      {/* Nubes */}
      <G fill="#e6eef9">
        <Ellipse cx={96} cy={38} rx={26} ry={8} />
        <Ellipse cx={112} cy={32} rx={16} ry={9} />
        <Ellipse cx={252} cy={30} rx={30} ry={9} />
        <Ellipse cx={270} cy={24} rx={16} ry={9} />
      </G>

      {/* Edificios */}
      <Rect x={62} y={62} width={36} height={102} rx={2} fill={AZUL_EDIFICIO} />
      <Rect x={96} y={92} width={30} height={72} rx={2} fill={AZUL_EDIFICIO_2} />
      <Rect x={220} y={52} width={42} height={112} rx={2} fill={AZUL_EDIFICIO} />
      <Rect x={260} y={86} width={30} height={78} rx={2} fill={AZUL_EDIFICIO_2} />
      <G fill="#bccfe9">
        {[72, 88, 104, 120].map((y) => (
          <React.Fragment key={y}>
            <Rect x={68} y={y} width={8} height={8} rx={1} />
            <Rect x={82} y={y} width={8} height={8} rx={1} />
          </React.Fragment>
        ))}
        {[62, 78, 94, 110, 126].map((y) => (
          <React.Fragment key={y}>
            <Rect x={226} y={y} width={8} height={8} rx={1} />
            <Rect x={240} y={y} width={8} height={8} rx={1} />
          </React.Fragment>
        ))}
      </G>

      {/* Farola */}
      <Rect x={46} y={80} width={3.5} height={84} fill={AZUL_POSTE} />
      <Path d="M47.5 84 Q47.5 74 64 74" stroke={AZUL_POSTE} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <Ellipse cx={68} cy={76} rx={9} ry={3.5} fill={AZUL_POSTE} />

      {/* Arboles */}
      <Rect x={22} y={132} width={3.5} height={32} fill="#8aa2c4" />
      <Circle cx={24} cy={120} r={19} fill={AZUL_ARBOL} />
      <Circle cx={12} cy={134} r={11} fill={AZUL_ARBOL_2} />
      <Rect x={296} y={130} width={3.5} height={34} fill="#8aa2c4" />
      <Circle cx={298} cy={118} r={18} fill={AZUL_ARBOL} />
      <Circle cx={308} cy={134} r={10} fill={AZUL_ARBOL_2} />

      {/* Suelo y sombra */}
      <Rect x={14} y={163} width={292} height={2} rx={1} fill="#cfdcef" />
      <Ellipse cx={170} cy={164} rx={78} ry={6} fill="#000" opacity={0.12} />

      {/* Destellos */}
      <G stroke="#7fa3d8" strokeWidth={2.5} strokeLinecap="round">
        <Line x1={150} y1={30} x2={148} y2={40} />
        <Line x1={196} y1={32} x2={204} y2={40} />
        <Line x1={214} y1={44} x2={224} y2={48} />
      </G>

      {/* Taxi (de frente) */}
      <Rect x={98} y={94} width={9} height={13} rx={2.5} fill={OSCURO} />
      <Rect x={233} y={94} width={9} height={13} rx={2.5} fill={OSCURO} />
      <Path
        d="M120 112 L134 76 Q137 70 145 70 L195 70 Q203 70 206 76 L220 112 Z"
        fill={AMARILLO}
      />
      <Path
        d="M131 108 L142 80 Q144 77 148 77 L192 77 Q196 77 198 80 L209 108 Z"
        fill="#2b3648"
      />
      <Path d="M146 78 L168 78 L150 108 L133 108 Z" fill="#fff" opacity={0.14} />
      <Rect x={98} y={108} width={144} height={44} rx={16} fill={AMARILLO} />
      <Path d="M108 122 Q170 112 232 122" stroke={AMARILLO_SOMBRA} strokeWidth={2} fill="none" />

      {/* Letrero TAXI */}
      <Rect x={148} y={56} width={44} height={15} rx={3.5} fill={AMARILLO} stroke={AMARILLO_SOMBRA} strokeWidth={1.5} />
      <SvgText x={170} y={67.5} fontSize={10} fontWeight="bold" fill={OSCURO} textAnchor="middle">
        TAXI
      </SvgText>

      {/* Faros, parrilla y paragolpes */}
      <Ellipse cx={120} cy={134} rx={13} ry={8} fill="#fff" />
      <Ellipse cx={120} cy={134} rx={7} ry={4.5} fill="#fff3b0" />
      <Ellipse cx={220} cy={134} rx={13} ry={8} fill="#fff" />
      <Ellipse cx={220} cy={134} rx={7} ry={4.5} fill="#fff3b0" />
      <Rect x={144} y={130} width={52} height={12} rx={4} fill={OSCURO} />
      <Line x1={152} y1={136} x2={188} y2={136} stroke="#4b5563" strokeWidth={1.5} />
      <Rect x={104} y={148} width={132} height={9} rx={4.5} fill={OSCURO} />
      <Rect x={157} y={146} width={26} height={8} rx={2} fill="#fff" />

      {/* Ruedas */}
      <Rect x={108} y={152} width={22} height={13} rx={5} fill="#111827" />
      <Rect x={210} y={152} width={22} height={13} rx={5} fill="#111827" />
    </Svg>
  );
}
