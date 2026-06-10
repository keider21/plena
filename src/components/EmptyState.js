import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, SHADOW } from '../utils/theme';

export default function EmptyState({
  icon = 'sparkles-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
  chips = [],          // ← NUEVO: chips de sugerencias rápidas [{label, onPress}]
  variant = 'default', // 'default' | 'finance' | 'habit' | 'goal' | 'plan'
}) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }),
    ]).start();

    // Pulso suave y continuo del icono
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, { toValue: 1.08, duration: 1400, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(iconPulse, { toValue: 1, duration: 1400, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onAction?.();
  };

  const gradientColors = {
    default: [COLORS.purple, COLORS.purpleLight],
    finance: [COLORS.green, '#34D399'],
    habit:   [COLORS.blue, '#38BDF8'],
    goal:    [COLORS.amber, '#FBBF24'],
    plan:    [COLORS.pink, '#F472B6'],
  }[variant] || [COLORS.purple, COLORS.purpleLight];

  return (
    <Animated.View style={[styles.wrap, { opacity: fade, transform: [{ scale }] }]}>
      <Animated.View style={[styles.iconOuter, { transform: [{ scale: iconPulse }] }]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          <Ionicons name={icon} size={36} color="#fff" />
        </LinearGradient>
      </Animated.View>

      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.btn} onPress={handleAction} activeOpacity={0.8}>
          <Ionicons name="add-circle" size={18} color="#fff" />
          <Text style={styles.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}

      {chips.length > 0 && (
        <View style={styles.chipsRow}>
          {chips.map((c, i) => (
            <TouchableOpacity
              key={i}
              style={styles.chip}
              onPress={() => { Haptics.selectionAsync().catch(() => {}); c.onPress?.(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.chipText}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 30 },
  iconOuter: {
    marginBottom: 18,
    ...SHADOW.md,
  },
  iconWrap: {
    width: 84, height: 84, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 17, fontWeight: '700', color: COLORS.text,
    textAlign: 'center', marginBottom: 6, letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13, color: COLORS.textSub, textAlign: 'center',
    lineHeight: 20, marginBottom: 20, maxWidth: 320,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.purple,
    paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14,
    ...SHADOW.sm,
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  chipsRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    marginTop: 18, gap: 8,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  chipText: { color: COLORS.textSub, fontSize: 12, fontWeight: '600' },
});
