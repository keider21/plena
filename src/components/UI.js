import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, NEOM, FONTS } from '../utils/theme';

export function Card({ children, style, glow }) {
  return (
    <View style={[styles.card, glow && styles.cardGlow, style]}>
      {children}
    </View>
  );
}

// Mantenido por compatibilidad — ahora usa sombra neumorfismo en lugar de gradiente
export function GradientCard({ children, colors, style }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', icon, loading, style, textStyle }) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const bg = isPrimary ? COLORS.purple : isDanger ? COLORS.red : COLORS.bg3;
  const textCol = isPrimary || isDanger ? '#fff' : COLORS.purple;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
      <View style={[styles.btn, { backgroundColor: bg }, !isPrimary && !isDanger && styles.btnOutline]}>
        {loading ? (
          <ActivityIndicator color={textCol} size="small" />
        ) : (
          <>
            {icon && <Ionicons name={icon} size={18} color={textCol} style={{ marginRight: 8 }} />}
            <Text style={[styles.btnText, { color: textCol }, textStyle]}>{title}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function Badge({ label, color, bg }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg || color + '22' }]}>
      <Text style={[styles.badgeText, { color: color }]}>{label}</Text>
    </View>
  );
}

export function ProgressRing({ size = 60, progress = 0, color = COLORS.purple, strokeWidth = 6, children }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ position: 'absolute' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color + '22'} strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children}
    </View>
  );
}

export function StatCard({ label, value, sub, color, icon }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={styles.statRow}>
        {icon && (
          <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
            <Ionicons name={icon} size={16} color={color} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.statLabel}>{label}</Text>
          <Text style={[styles.statValue, { color }]}>{value}</Text>
          {sub && <Text style={styles.statSub}>{sub}</Text>}
        </View>
      </View>
    </View>
  );
}

export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function EmptyState({ icon, title, subtitle, action, onAction }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon || 'planet-outline'} size={48} color={COLORS.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
      {action && (
        <TouchableOpacity onPress={onAction} style={styles.emptyBtn}>
          <Text style={styles.emptyBtnText}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  card: {
    ...NEOM.card,
    padding: 16,
    marginBottom: 12,
  },
  cardGlow: {
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: COLORS.purple,
  },
  btnText: { fontSize: 15, fontWeight: '600' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  statCard: {
    ...NEOM.card,
    borderRadius: 12,
    padding: 12,
    flex: 1,
  },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 11, color: COLORS.textSub, marginBottom: 2 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  sectionAction: { fontSize: 13, color: COLORS.purpleLight },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textSub },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  emptyBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.purpleDim, borderRadius: 10 },
  emptyBtnText: { color: COLORS.purpleLight, fontWeight: '600' },
  divider: { height: 0.5, backgroundColor: COLORS.border, marginVertical: 8 },
});
