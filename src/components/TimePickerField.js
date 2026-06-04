import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

// El valor se guarda en 24h ("HH:MM") por compatibilidad; se muestra en 12h AM/PM.
const to12 = (v) => {
  if (!v || typeof v !== 'string') return { h: '8', m: '00', ap: 'AM' };
  const [H, M] = v.split(':').map(Number);
  const ap = (H || 0) >= 12 ? 'PM' : 'AM';
  let h = (H || 0) % 12; if (h === 0) h = 12;
  return { h: String(h), m: String(M || 0).padStart(2, '0'), ap };
};
export const label12 = (v) => { const { h, m, ap } = to12(v); return `${h}:${m} ${ap}`; };
const to24 = (h, m, ap) => {
  let H = parseInt(h, 10); if (isNaN(H)) H = 12;
  let M = parseInt(m, 10); if (isNaN(M)) M = 0;
  H = Math.min(12, Math.max(1, H));
  M = Math.min(59, Math.max(0, M));
  if (ap === 'AM') { if (H === 12) H = 0; } else if (H !== 12) H += 12;
  return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`;
};

export default function TimePickerField({ value, onChange, label, compact }) {
  const [open, setOpen] = useState(false);
  const [h, setH] = useState('8');
  const [m, setM] = useState('00');
  const [ap, setAp] = useState('AM');

  const openModal = () => {
    const t = to12(value);
    setH(t.h); setM(t.m); setAp(t.ap);
    setOpen(true);
  };
  const save = () => { onChange(to24(h, m, ap)); setOpen(false); };

  return (
    <>
      <TouchableOpacity style={[styles.field, compact && styles.fieldCompact]} onPress={openModal} activeOpacity={0.7}>
        {label && !compact && <Text style={styles.fieldLabel}>{label}</Text>}
        <View style={styles.valueRow}>
          <Ionicons name="time-outline" size={16} color={COLORS.purpleLight} />
          <Text style={styles.valueText}>{value ? label12(value) : '--:--'}</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{label || 'Escribe la hora'}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}><Ionicons name="close" size={24} color={COLORS.textSub} /></TouchableOpacity>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.timeInput}
                value={h}
                onChangeText={(v) => setH(v.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="8"
                placeholderTextColor={COLORS.textMuted}
                selectTextOnFocus
              />
              <Text style={styles.colon}>:</Text>
              <TextInput
                style={styles.timeInput}
                value={m}
                onChangeText={(v) => setM(v.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="07"
                placeholderTextColor={COLORS.textMuted}
                selectTextOnFocus
              />
              <View style={styles.apCol}>
                {['AM', 'PM'].map((x) => (
                  <TouchableOpacity key={x} onPress={() => setAp(x)} style={[styles.apBtn, ap === x && styles.apBtnOn]}>
                    <Text style={[styles.apText, ap === x && styles.apTextOn]}>{x}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Text style={styles.hint}>Escribe cualquier hora y minuto. Ej. 8:07 AM, 9:42 PM</Text>

            <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
              <Text style={styles.saveText}>Guardar {to24(h, m, ap) ? `(${label12(to24(h, m, ap))})` : ''}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { backgroundColor: COLORS.card, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  fieldCompact: { paddingVertical: 8, paddingHorizontal: 12 },
  fieldLabel: { fontSize: 12, color: COLORS.textSub, marginBottom: 6 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  valueText: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  timeInput: { width: 72, height: 64, backgroundColor: COLORS.card, borderRadius: 14, textAlign: 'center', fontSize: 30, fontWeight: '800', color: COLORS.text, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  colon: { fontSize: 30, fontWeight: '800', color: COLORS.textSub },
  apCol: { marginLeft: 8, gap: 6 },
  apBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  apBtnOn: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  apText: { fontSize: 14, fontWeight: '700', color: COLORS.textSub },
  apTextOn: { color: '#fff' },
  hint: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 14 },
  saveBtn: { backgroundColor: COLORS.purple, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
