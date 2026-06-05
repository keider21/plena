import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import { formatMoney } from '../utils/currency';
import { GOAL_CATEGORIES, catOf, goalProgress, newGoal } from '../utils/goals';

const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? 0 : n; };

function Field({ label, children }) {
  return <View style={{ marginBottom: 14 }}><Text style={styles.fieldLabel}>{label}</Text>{children}</View>;
}

export default function GoalDetail({ navigation, route }) {
  const { id } = route.params || {};
  const storeGoal = useStore((s) => s.goals.find((x) => x.id === id));
  const { updateGoal, deleteGoal, settings } = useStore();
  const cur = settings.currency;
  const [g, setG] = useState(() => ({ ...newGoal(), ...(storeGoal || {}) }));

  if (!storeGoal) {
    return (
      <View style={[styles.bg, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: COLORS.textSub }}>Meta no encontrada.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}><Text style={{ color: COLORS.purpleLight }}>Volver</Text></TouchableOpacity>
      </View>
    );
  }

  const commit = (next) => { setG(next); updateGoal(id, next); };
  const setField = (field, val) => commit({ ...g, [field]: val });
  const bumpProgress = (delta) => {
    const cur2 = typeof g.progress === 'number' ? g.progress : 0;
    setField('progress', Math.max(0, Math.min(100, cur2 + delta)));
  };

  const cat = catOf(g.category);
  const pct = goalProgress(g);
  const isMoney = g.category === 'monetaria';

  const confirmDelete = () => {
    Alert.alert('Eliminar meta', `¿Eliminar "${g.title}"?`, [
      { text: 'Cancelar' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteGoal(id); navigation.goBack(); } },
    ]);
  };

  return (
    <View style={styles.bg}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}><Ionicons name="arrow-back" size={22} color={COLORS.text} /></TouchableOpacity>
        <Text style={styles.topTitle}>Meta</Text>
        <TouchableOpacity onPress={confirmDelete} style={styles.iconBtn}><Ionicons name="trash-outline" size={20} color={COLORS.red} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.headCard, { borderColor: cat.color + '44' }]}>
          <View style={[styles.headIcon, { backgroundColor: cat.color + '22' }]}><Ionicons name={cat.icon} size={22} color={cat.color} /></View>
          <TextInput style={styles.titleInput} value={g.title} onChangeText={(v) => setField('title', v)} placeholder="Nombre de la meta" placeholderTextColor={COLORS.textMuted} multiline />
          {pct === null ? (
            <Text style={styles.noInd}>{isMoney ? 'Ingresa el monto objetivo para ver tu avance' : 'Ajusta tu progreso abajo'}</Text>
          ) : (
            <View style={styles.progWrap}>
              <View style={styles.progBg}><View style={[styles.progFill, { width: `${pct}%`, backgroundColor: cat.color }]} /></View>
              <Text style={[styles.progPct, { color: cat.color }]}>{pct}%</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>Tipo</Text>
        <View style={styles.typeRow}>
          {GOAL_CATEGORIES.map((c) => {
            const sel = g.category === c.key;
            return (
              <TouchableOpacity key={c.key} onPress={() => setField('category', c.key)} style={[styles.typeChip, sel && { backgroundColor: c.color + '22', borderColor: c.color }]}>
                <Ionicons name={c.icon} size={14} color={sel ? c.color : COLORS.textSub} />
                <Text style={[styles.typeText, sel && { color: c.color, fontWeight: '700' }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.section}>
          <Field label="Descripción"><TextInput style={[styles.input, styles.multi]} value={g.description} onChangeText={(v) => setField('description', v)} placeholder="Detalle de tu meta..." placeholderTextColor={COLORS.textMuted} multiline /></Field>
          <Field label="Fecha objetivo"><TextInput style={styles.input} value={g.targetDate} onChangeText={(v) => setField('targetDate', v)} placeholder="Ej. Diciembre 2026" placeholderTextColor={COLORS.textMuted} /></Field>
          <Field label="Tiempo estimado"><TextInput style={styles.input} value={g.estimatedTime} onChangeText={(v) => setField('estimatedTime', v)} placeholder="Ej. 6 meses" placeholderTextColor={COLORS.textMuted} /></Field>

          {isMoney ? (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}><Field label="Monto objetivo"><TextInput style={styles.input} value={String(g.targetAmount || '')} onChangeText={(v) => setField('targetAmount', num(v))} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Field></View>
              <View style={{ flex: 1 }}><Field label="Llevo acumulado"><TextInput style={styles.input} value={String(g.currentAmount || '')} onChangeText={(v) => setField('currentAmount', num(v))} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Field></View>
            </View>
          ) : (
            <Field label="Progreso">
              <View style={styles.progEdit}>
                <TouchableOpacity style={styles.progBtn} onPress={() => bumpProgress(-5)}><Ionicons name="remove" size={18} color={COLORS.text} /></TouchableOpacity>
                <Text style={styles.progBig}>{typeof g.progress === 'number' ? g.progress : 0}%</Text>
                <TouchableOpacity style={styles.progBtn} onPress={() => bumpProgress(5)}><Ionicons name="add" size={18} color={COLORS.text} /></TouchableOpacity>
              </View>
            </Field>
          )}

          {isMoney && g.targetAmount > 0 ? (
            <Text style={styles.moneyHint}>Avance: {formatMoney(g.currentAmount || 0, cur)} de {formatMoney(g.targetAmount, cur)}</Text>
          ) : null}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 52, paddingBottom: 12, backgroundColor: COLORS.bg2 },
  iconBtn: { padding: 6 },
  topTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  container: { padding: 16 },
  headCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, alignItems: 'flex-start' },
  headIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  titleInput: { fontSize: 20, fontWeight: '800', color: COLORS.text, width: '100%', padding: 0 },
  noInd: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 10 },
  progWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, width: '100%' },
  progBg: { flex: 1, height: 8, backgroundColor: COLORS.bg3, borderRadius: 5, overflow: 'hidden' },
  progFill: { height: 8, borderRadius: 5 },
  progPct: { fontSize: 15, fontWeight: '800', width: 44, textAlign: 'right' },
  sectionLabel: { fontSize: 13, color: COLORS.textSub, fontWeight: '600', marginTop: 18, marginBottom: 10 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  typeText: { fontSize: 13, color: COLORS.textSub },
  section: { marginTop: 18 },
  fieldLabel: { fontSize: 13, color: COLORS.textSub, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: COLORS.card, borderRadius: 12, padding: 12, color: COLORS.text, fontSize: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  multi: { minHeight: 70, textAlignVertical: 'top' },
  progEdit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: 12, padding: 10, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  progBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.bg3, alignItems: 'center', justifyContent: 'center' },
  progBig: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  moneyHint: { fontSize: 13, color: COLORS.green, fontWeight: '600', marginTop: 4 },
});
