import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

// Genera horas cada 15 minutos (00:00 .. 23:45)
const TIMES = [];
for (let m = 0; m < 1440; m += 15) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  TIMES.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
}

export default function TimePickerField({ value, onChange, label, compact }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.field, compact && styles.fieldCompact]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        {label && !compact && <Text style={styles.fieldLabel}>{label}</Text>}
        <View style={styles.valueRow}>
          <Ionicons name="time-outline" size={16} color={COLORS.purpleLight} />
          <Text style={styles.valueText}>{value || '--:--'}</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{label || 'Selecciona la hora'}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSub} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {TIMES.map((t) => {
                const sel = t === value;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeRow, sel && styles.timeRowSel]}
                    onPress={() => { onChange(t); setOpen(false); }}
                  >
                    <Text style={[styles.timeText, sel && styles.timeTextSel]}>{t}</Text>
                    {sel && <Ionicons name="checkmark" size={18} color={COLORS.purpleLight} />}
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
  field: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 12,
    borderWidth: 0.5, borderColor: COLORS.cardBorder,
  },
  fieldCompact: { paddingVertical: 8, paddingHorizontal: 12 },
  fieldLabel: { fontSize: 12, color: COLORS.textSub, marginBottom: 6 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  valueText: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32,
  },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  timeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10,
  },
  timeRowSel: { backgroundColor: COLORS.purpleDim },
  timeText: { fontSize: 16, color: COLORS.textSub },
  timeTextSel: { color: COLORS.purpleLight, fontWeight: '700' },
});
