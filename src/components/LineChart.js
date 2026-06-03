import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../utils/theme';

// series: [{ label, color, data: [0..100] }]   labels: ['L','M',...]
export default function LineChart({ series = [], labels = [], height = 180 }) {
  const [w, setW] = useState(0);
  const pad = { l: 26, r: 12, t: 12, b: 22 };
  const innerW = Math.max(1, w - pad.l - pad.r);
  const innerH = height - pad.t - pad.b;
  const n = labels.length;
  const x = (i) => pad.l + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const y = (v) => pad.t + innerH - (Math.max(0, Math.min(100, v)) / 100) * innerH;

  return (
    <View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && (
          <Svg width={w} height={height}>
            {[0, 50, 100].map((g) => (
              <React.Fragment key={g}>
                <Line x1={pad.l} y1={y(g)} x2={w - pad.r} y2={y(g)} stroke={COLORS.border} strokeWidth={1} />
                <SvgText x={2} y={y(g) + 3} fill={COLORS.textMuted} fontSize="9">{g}</SvgText>
              </React.Fragment>
            ))}
            {series.map((s) => {
              const pts = s.data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
              return (
                <React.Fragment key={s.label}>
                  <Polyline points={pts} fill="none" stroke={s.color} strokeWidth={2.5} />
                  {s.data.map((v, i) => <Circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill={s.color} />)}
                </React.Fragment>
              );
            })}
            {labels.map((l, i) => (
              <SvgText key={i} x={x(i)} y={height - 6} fill={COLORS.textMuted} fontSize="9" textAnchor="middle">{l}</SvgText>
            ))}
          </Svg>
        )}
      </View>

      {/* leyenda */}
      <View style={styles.legend}>
        {series.map((s) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: COLORS.textSub },
});
