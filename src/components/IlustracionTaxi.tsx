import React from 'react';
import Svg, { Circle, Rect } from 'react-native-svg';
import { colors } from '../theme';

// Ilustracion simple de ciudad + taxi, usada en los estados vacios/de espera
// (Solicitudes, Fila Virtual).
export function IlustracionTaxi({ width = 140, height = 80 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 140 80">
      <Rect x={8} y={30} width={22} height={40} rx={2} fill={colors.border} />
      <Rect x={34} y={18} width={26} height={52} rx={2} fill={colors.border} />
      <Rect x={64} y={26} width={20} height={44} rx={2} fill={colors.border} />
      <Circle cx={112} cy={60} r={10} fill={colors.accent500} opacity={0.25} />
      <Rect x={92} y={48} width={40} height={16} rx={4} fill={colors.accent500} />
      <Rect x={97} y={38} width={26} height={13} rx={3} fill={colors.accent500} />
      <Circle cx={100} cy={66} r={5} fill={colors.text} />
      <Circle cx={124} cy={66} r={5} fill={colors.text} />
    </Svg>
  );
}
