import React from 'react';
import { View, Text } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { COLORS } from '../utils/theme';

// Gráfico de torta simple con SVG.
// data: [{ key, value, color, label }], size: px
export default function PieChart({ data, size = 180, thickness = 28, centerLabel, centerValue }) {
  const total = data.reduce((a, d) => a + (d.value || 0), 0);
  if (total <= 0) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.textSub, fontSize: 13 }}>Sin datos</Text>
      </View>
    );
  }

  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 4;
  const innerR = r - thickness;
  let startAngle = -Math.PI / 2; // empezamos arriba

  const polarToCartesian = (centerX, centerY, radius, angleInRadians) => {
    return { x: centerX + radius * Math.cos(angleInRadians), y: centerY + radius * Math.sin(angleInRadians) };
  };

  const arcPath = (startA, endA) => {
    const start = polarToCartesian(cx, cy, r, endA);
    const end = polarToCartesian(cx, cy, r, startA);
    const largeArcFlag = endA - startA <= Math.PI ? '0' : '1';
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  };

  const arcRingPath = (startA, endA) => {
    const outerStart = polarToCartesian(cx, cy, r, endA);
    const outerEnd = polarToCartesian(cx, cy, r, startA);
    const innerStart = polarToCartesian(cx, cy, innerR, endA);
    const innerEnd = polarToCartesian(cx, cy, innerR, startA);
    const largeArcFlag = endA - startA <= Math.PI ? '0' : '1';
    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${r} ${r} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerR} ${innerR} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
      'Z',
    ].join(' ');
  };

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G>
          {data.map((d, i) => {
            const v = d.value || 0;
            if (v <= 0) return null;
            const sweep = (v / total) * Math.PI * 2;
            const endAngle = startAngle + sweep;
            // Si ocupa todo, dibujar círculo completo
            const path = total === v
              ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
              : arcRingPath(startAngle, endAngle);
            const seg = <Path key={i} d={path} fill={d.color || '#7C3AED'} />;
            startAngle = endAngle;
            return seg;
          })}
        </G>
      </Svg>
      {(centerLabel || centerValue) && (
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          {centerLabel && <Text style={{ color: COLORS.textSub, fontSize: 11 }}>{centerLabel}</Text>}
          {centerValue && <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '800' }}>{centerValue}</Text>}
        </View>
      )}
    </View>
  );
}
