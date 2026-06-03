import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

export default function EmptyState({ icon = 'sparkles-outline', title, subtitle, actionLabel, onAction }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={34} color={COLORS.purpleLight} />
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.btn} onPress={onAction} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 30 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: COLORS.purpleDim + '88',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: COLORS.textSub, textAlign: 'center', lineHeight: 19, marginBottom: 18 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.purple,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
