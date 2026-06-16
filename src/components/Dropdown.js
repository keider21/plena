import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

// options: [{ key, label, icon?, color? }]
export default function Dropdown({ options, value, onChange, placeholder = 'Selecciona...', compact }) {
  const [open, setOpen] = useState(false);
  const sel = options.find((o) => (o.key ?? o) === value);
  const selLabel = sel ? (sel.label ?? sel) : placeholder;
  const selColor = sel?.color;

  return (
    <>
      <TouchableOpacity style={[styles.field, compact && styles.compact]} onPress={() => setOpen(true)} activeOpacity={0.7}>
        {selColor ? <View style={[styles.dot, { backgroundColor: selColor }]} /> : null}
        {sel?.icon ? <Ionicons name={sel.icon} size={16} color={selColor || COLORS.textSub} /> : null}
        <Text style={[styles.value, !sel && { color: COLORS.textMuted }]} numberOfLines={1}>{selLabel}</Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.textSub} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {options.map((o) => {
                const k = o.key ?? o;
                const label = o.label ?? o;
                const isSel = k === value;
                if (o.isChild) {
                  return (
                    <TouchableOpacity key={String(k)} style={[styles.rowChild, isSel && styles.rowSel]} onPress={() => { onChange(k); setOpen(false); }}>
                      <View style={styles.childLine} />
                      {o.color ? <View style={[styles.dot, { backgroundColor: o.color + 'AA' }]} /> : null}
                      <Text style={[styles.rowTextChild, isSel && styles.rowTextSel]}>{label}</Text>
                      {isSel && <Ionicons name="checkmark" size={16} color={COLORS.purpleLight} />}
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity key={String(k)} style={[styles.row, isSel && styles.rowSel]} onPress={() => { onChange(k); setOpen(false); }}>
                    {o.color ? <View style={[styles.dot, { backgroundColor: o.color }]} /> : null}
                    {o.icon ? <Ionicons name={o.icon} size={18} color={o.color || COLORS.textSub} /> : null}
                    <Text style={[styles.rowText, isSel && styles.rowTextSel]}>{label}</Text>
                    {o.hasChildren && <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />}
                    {isSel && <Ionicons name="checkmark" size={18} color={COLORS.purpleLight} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  compact: { paddingVertical: 9 },
  value: { flex: 1, fontSize: 15, color: COLORS.text },
  dot: { width: 12, height: 12, borderRadius: 6 },
  backdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', padding: 30 },
  sheet: { backgroundColor: COLORS.bg2, borderRadius: 18, padding: 8, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 12, borderRadius: 10 },
  rowSel: { backgroundColor: COLORS.purpleDim },
  rowText: { flex: 1, fontSize: 15, color: COLORS.text },
  rowTextSel: { color: COLORS.purpleLight, fontWeight: '700' },
  rowChild: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 12, paddingLeft: 24, borderRadius: 10 },
  rowTextChild: { flex: 1, fontSize: 14, color: COLORS.textSub },
  childLine: { width: 2, height: 18, backgroundColor: COLORS.cardBorder, borderRadius: 1, marginRight: 2 },
});
