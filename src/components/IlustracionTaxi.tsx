import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

const AMARILLO = '#ffd60a';
const AMARILLO_FRENTE = '#f7c800';
const AMARILLO_SOMBRA = '#d9a800';
const OSCURO = '#1f2a44';
const VIDRIO = '#2b3648';
const AZUL_EDIFICIO = '#dbe6f5';
const AZUL_EDIFICIO_2 = '#c9d9ef';
const AZUL_VENTANA = '#bccfe9';
const AZUL_ARBOL = '#9bb4d6';
const AZUL_ARBOL_2 = '#adc3e0';
const AZUL_TRONCO = '#8aa2c4';
const AZUL_POSTE = '#8fa6c6';

// Ciudad + taxi en vista 3/4 (de frente y de costado), usada en los estados
// vacios (Fila Virtual, Solicitudes). Vectorial: se ve nitida a cualquier
// tamano. Proporcion fija 320x145 -- pasar width y height en esa relacion
// para que no se deforme.
export function IlustracionTaxi({ width = 240, height = 109 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 320 145">
      {/* Nubes */}
      <G fill="#e6eef9">
        <Ellipse cx={96} cy={24} rx={26} ry={8} />
        <Ellipse cx={112} cy={18} rx={15} ry={9} />
        <Ellipse cx={218} cy={24} rx={28} ry={8} />
        <Ellipse cx={234} cy={18} rx={15} ry={9} />
      </G>

      {/* Edificios */}
      <Rect x={84} y={50} width={40} height={83} rx={2} fill={AZUL_EDIFICIO} />
      <Rect x={122} y={80} width={30} height={53} rx={2} fill={AZUL_EDIFICIO_2} />
      <Rect x={196} y={46} width={44} height={87} rx={2} fill={AZUL_EDIFICIO} />
      <Rect x={238} y={74} width={30} height={59} rx={2} fill={AZUL_EDIFICIO_2} />
      <G fill={AZUL_VENTANA}>
        {[60, 74, 88, 102].map((y) => (
          <React.Fragment key={y}>
            <Rect x={91} y={y} width={8} height={8} rx={1} />
            <Rect x={106} y={y} width={8} height={8} rx={1} />
          </React.Fragment>
        ))}
        {[56, 70, 84, 98].map((y) => (
          <React.Fragment key={y}>
            <Rect x={203} y={y} width={8} height={8} rx={1} />
            <Rect x={218} y={y} width={8} height={8} rx={1} />
          </React.Fragment>
        ))}
      </G>

      {/* Farola */}
      <Rect x={58} y={42} width={3.5} height={91} fill={AZUL_POSTE} />
      <Path d="M59.5 46 Q59.5 36 76 36" stroke={AZUL_POSTE} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <Ellipse cx={80} cy={38} rx={9} ry={3.5} fill={AZUL_POSTE} />

      {/* Arboles izquierda */}
      <Rect x={36} y={100} width={3.5} height={33} fill={AZUL_TRONCO} />
      <Circle cx={38} cy={88} r={18} fill={AZUL_ARBOL} />
      <Circle cx={26} cy={100} r={11} fill={AZUL_ARBOL_2} />
      <Rect x={70} y={116} width={3} height={17} fill={AZUL_TRONCO} />
      <Circle cx={72} cy={108} r={10} fill={AZUL_ARBOL_2} />

      {/* Arboles derecha */}
      <Rect x={250} y={104} width={3} height={29} fill={AZUL_TRONCO} />
      <Circle cx={252} cy={96} r={13} fill={AZUL_ARBOL_2} />
      <Rect x={279} y={94} width={3.5} height={39} fill={AZUL_TRONCO} />
      <Circle cx={281} cy={80} r={17} fill={AZUL_ARBOL} />
      <Circle cx={294} cy={116} r={9} fill={AZUL_ARBOL_2} />

      {/* Suelo y sombra */}
      <Rect x={12} y={133} width={296} height={2} rx={1} fill="#cfdcef" />
      <Ellipse cx={172} cy={134} rx={76} ry={5} fill="#000" opacity={0.13} />

      {/* Destellos sobre el letrero */}
      <G stroke="#7fa3d8" strokeWidth={2.5} strokeLinecap="round">
        <Line x1={153} y1={14} x2={151} y2={24} />
        <Line x1={165} y1={11} x2={172} y2={19} />
        <Line x1={182} y1={14} x2={191} y2={19} />
      </G>

      {/* Taxi 3/4 */}
      {/* Cabina */}
      <Path d="M132 92 L148 66 Q152 61 158 61 L205 61 Q212 61 216 67 L234 92 Z" fill={AMARILLO} />
      {/* Cuerpo lateral */}
      <Rect x={110} y={88} width={132} height={32} rx={11} fill={AMARILLO} />
      <Path d="M158 106 L238 106" stroke={AMARILLO_SOMBRA} strokeWidth={1.5} />
      <Rect x={186} y={98} width={10} height={3} rx={1.5} fill={AMARILLO_SOMBRA} />
      {/* Luz trasera */}
      <Rect x={237} y={96} width={5} height={9} rx={2.5} fill="#ef4444" />
      {/* Parabrisas y ventana lateral */}
      <Path d="M140 89 L152 68 L172 68 L170 89 Z" fill={VIDRIO} />
      <Path d="M141 89 L152 70 L157 70 L148 89 Z" fill="#fff" opacity={0.14} />
      <Path d="M176 89 L177 68 L203 68 Q208 68 210 72 L221 89 Z" fill={VIDRIO} />
      {/* Espejo */}
      <Rect x={136} y={84} width={7} height={6} rx={2} fill={OSCURO} />
      {/* Frente */}
      <Path d="M104 98 Q104 92 112 92 L152 94 L156 124 L112 124 Q104 124 104 116 Z" fill={AMARILLO_FRENTE} />
      <Ellipse cx={118} cy={101} rx={10} ry={6.5} fill="#fff" />
      <Ellipse cx={118} cy={101} rx={5.5} ry={3.5} fill="#fff3b0" />
      <Rect x={130} y={104} width={22} height={11} rx={3.5} fill={OSCURO} />
      <Line x1={134} y1={109.5} x2={148} y2={109.5} stroke="#4b5563" strokeWidth={1.5} />
      <Rect x={106} y={116} width={50} height={7} rx={3.5} fill={OSCURO} />
      <Rect x={124} y={117.5} width={14} height={4} rx={1} fill="#fff" />
      {/* Ruedas */}
      <Circle cx={130} cy={124} r={11.5} fill={OSCURO} />
      <Circle cx={130} cy={124} r={5} fill="#94a3b8" />
      <Circle cx={216} cy={122} r={11.5} fill={OSCURO} />
      <Circle cx={216} cy={122} r={5} fill="#94a3b8" />
      {/* Letrero TAXI */}
      <Rect x={160} y={49} width={42} height={14} rx={3.5} fill={AMARILLO} stroke={AMARILLO_SOMBRA} strokeWidth={1.5} />
      <SvgText x={181} y={60} fontSize={9.5} fontWeight="bold" fill={OSCURO} textAnchor="middle">
        TAXI
      </SvgText>
    </Svg>
  );
}
