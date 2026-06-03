import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import { GOAL_CATEGORIES, catOf, goalProgress, newItem, newGoal } from '../utils/goals';

function Field({ label, value, onChange, placeholder, multiline }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldMulti]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        multiline={multiline}
      />
    </View>
  );
}

function CheckList({ items, onToggle, onDelete, onAdd, placeholder, color }) {
  const [text, setText] = useState('');
  const add = () => { if (text.trim()) { onAdd(text.trim()); setText(''); } };
  return (
    <View>
      {items.map((it) => (
        <View key={it.id} style={styles.itemRow}>
          <TouchableOpacity onPress={() => onToggle(it.id)} style={styles.check}>
            <Ionicons name={it.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={it.done ? COLORS.green : (color || COLORS.textMuted)} />
          </TouchableOpacity>
          <Text style={[styles.itemText, it.done && styles.itemDone]}>{it.text}</Text>
          <TouchableOpacity onPress={() => onDelete(it.id)} style={styles.delBtn}>
            <Ionicons name="close" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      ))}
      <View style={styles.addRow}>
        <TextInput style={styles.addInput} value={text} onChangeText={setText} placeholder={placeholder} placeholderTextColor={COLORS.textMuted} onSubmitEditing={add} returnKeyType="done" />
        <TouchableOpacity style={styles.addBtn} onPress={add}><Ionicons name="add" size={20} color="#fff" /></TouchableOpacity>
      </View>
    </View>
  );
}

function TextList({ items, onDelete, onAdd, placeholder, icon }) {
  const [text, setText] = useState('');
  const add = () => { if (text.trim()) { onAdd(text.trim()); setText(''); } };
  return (
    <View>
      {items.map((it) => (
        <View key={it.id} style={styles.itemRow}>
          <Ionicons name={icon || 'ellipse'} size={8} color={COLORS.purpleLight} style={{ marginHorizontal: 7 }} />
          <Text style={styles.itemText}>{it.text}</Text>
          <TouchableOpacity onPress={() => onDelete(it.id)} style={styles.delBtn}>
            <Ionicons name="close" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      ))}
      <View style={styles.addRow}>
        <TextInput style={styles.addInput} value={text} onChangeText={setText} placeholder={placeholder} placeholderTextColor={COLORS.textMuted} onSubmitEditing={add} returnKeyType="done" />
        <TouchableOpacity style={styles.addBtn} onPress={add}><Ionicons name="add" size={20} color="#fff" /></TouchableOpacity>
      </View>
    </View>
  );
}

function RefList({ items, onDelete, onAdd }) {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const add = () => { if (text.trim() || url.trim()) { onAdd(text.trim() || url.trim(), url.trim()); setText(''); setUrl(''); } };
  return (
    <View>
      {items.map((it) => (
        <View key={it.id} style={styles.refRow}>
          <Ionicons name={it.url ? 'link' : 'bulb-outline'} size={16} color={COLORS.blue} />
          <TouchableOpacity style={{ flex: 1 }} disabled={!it.url} onPress={() => it.url && Linking.openURL(it.url.startsWith('http') ? it.url : 'https://' + it.url)}>
            <Text style={[styles.itemText, it.url && { color: COLORS.blue }]}>{it.text}</Text>
            {it.url ? <Text style={styles.refUrl} numberOfLines={1}>{it.url}</Text> : null}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(it.id)} style={styles.delBtn}>
            <Ionicons name="close" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      ))}
      <View style={{ gap: 8, marginTop: 4 }}>
        <TextInput style={styles.addInput} value={text} onChangeText={setText} placeholder="Idea o descripción" placeholderTextColor={COLORS.textMuted} />
        <View style={styles.addRow}>
          <TextInput style={styles.addInput} value={url} onChangeText={setUrl} placeholder="Enlace (opcional)" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" />
          <TouchableOpacity style={styles.addBtn} onPress={add}><Ionicons name="add" size={20} color="#fff" /></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function GoalDetail({ navigation, route }) {
  const { id } = route.params || {};
  const storeGoal = useStore((s) => s.goals.find((x) => x.id === id));
  const { updateGoal, deleteGoal } = useStore();
  const [g, setG] = useState(() => storeGoal || newGoal());

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
  const addItem = (key, text, withDone) => commit({ ...g, [key]: [...(g[key] || []), newItem(text, withDone ? { done: false } : {})] });
  const toggleItem = (key, itemId) => commit({ ...g, [key]: g[key].map((it) => it.id === itemId ? { ...it, done: !it.done } : it) });
  const delItem = (key, itemId) => commit({ ...g, [key]: g[key].filter((it) => it.id !== itemId) });
  const addRef = (text, url) => commit({ ...g, references: [...(g.references || []), newItem(text, { url })] });

  const cat = catOf(g.category);
  const pct = goalProgress(g);

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
        {/* Título + progreso */}
        <View style={[styles.headCard, { borderColor: cat.color + '44' }]}>
          <View style={[styles.headIcon, { backgroundColor: cat.color + '22' }]}><Ionicons name={cat.icon} size={22} color={cat.color} /></View>
          <TextInput style={styles.titleInput} value={g.title} onChangeText={(v) => setField('title', v)} placeholder="Título de la meta" placeholderTextColor={COLORS.textMuted} multiline />
          {pct === null ? (
            <Text style={styles.noInd}>Agrega indicadores abajo para medir tu progreso</Text>
          ) : (
            <View style={styles.progWrap}>
              <View style={styles.progBg}><View style={[styles.progFill, { width: `${pct}%`, backgroundColor: cat.color }]} /></View>
              <Text style={[styles.progPct, { color: cat.color }]}>{pct}%</Text>
            </View>
          )}
        </View>

        {/* Categoría */}
        <Text style={styles.sectionLabel}>Categoría</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {GOAL_CATEGORIES.map((c) => {
            const sel = g.category === c.key;
            return (
              <TouchableOpacity key={c.key} onPress={() => setField('category', c.key)} style={[styles.catChip, sel && { backgroundColor: c.color + '22', borderColor: c.color }]}>
                <Ionicons name={c.icon} size={14} color={sel ? c.color : COLORS.textSub} />
                <Text style={[styles.catChipText, sel && { color: c.color, fontWeight: '700' }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.section}>
          <Field label="¿Por qué quieres lograrlo?" value={g.why} onChange={(v) => setField('why', v)} placeholder="Tu razón personal..." multiline />
          <Field label="Beneficios" value={g.benefits} onChange={(v) => setField('benefits', v)} placeholder="Qué mejorará en tu vida..." multiline />
          <Field label="Fecha objetivo (opcional)" value={g.targetDate} onChange={(v) => setField('targetDate', v)} placeholder="Ej. Diciembre 2027" />
          <Field label="Estado actual" value={g.currentState} onChange={(v) => setField('currentState', v)} placeholder="Dónde estás hoy..." multiline />
        </View>

        <Section title="Plan de acción" icon="list-outline" color={COLORS.purple}>
          <CheckList items={g.actionPlan || []} color={COLORS.purple}
            onToggle={(i) => toggleItem('actionPlan', i)} onDelete={(i) => delItem('actionPlan', i)}
            onAdd={(t) => addItem('actionPlan', t, true)} placeholder="Agregar paso..." />
        </Section>

        <Section title="Recursos necesarios" icon="cube-outline" color={COLORS.amber}>
          <TextList items={g.resources || []} icon="ellipse"
            onDelete={(i) => delItem('resources', i)} onAdd={(t) => addItem('resources', t)} placeholder="Dinero, tiempo, personas..." />
        </Section>

        <Section title="Obstáculos" icon="warning-outline" color={COLORS.red}>
          <TextList items={g.obstacles || []} icon="ellipse"
            onDelete={(i) => delItem('obstacles', i)} onAdd={(t) => addItem('obstacles', t)} placeholder="Qué podría aparecer..." />
        </Section>

        <Section title="Indicadores de avance" icon="trending-up-outline" color={COLORS.green}>
          <Text style={styles.sectionHint}>Marca los que ya cumpliste. El % de la meta se calcula con esto.</Text>
          <CheckList items={g.indicators || []} color={COLORS.green}
            onToggle={(i) => toggleItem('indicators', i)} onDelete={(i) => delItem('indicators', i)}
            onAdd={(t) => addItem('indicators', t, true)} placeholder="Señal medible de avance..." />
        </Section>

        <Section title="Referencias" icon="images-outline" color={COLORS.blue}>
          <Text style={styles.sectionHint}>Enlaces e ideas. (Fotos/videos llegan más adelante.)</Text>
          <RefList items={g.references || []} onDelete={(i) => delItem('references', i)} onAdd={addRef} />
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Section({ title, icon, color, children }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
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
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  catChipText: { fontSize: 13, color: COLORS.textSub },
  section: { marginTop: 18 },
  fieldLabel: { fontSize: 13, color: COLORS.textSub, fontWeight: '600', marginBottom: 6 },
  fieldInput: { backgroundColor: COLORS.card, borderRadius: 12, padding: 12, color: COLORS.text, fontSize: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  fieldMulti: { minHeight: 70, textAlignVertical: 'top' },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, marginTop: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sectionHint: { fontSize: 12, color: COLORS.textMuted, marginBottom: 10, lineHeight: 17 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 0.5, borderColor: COLORS.border },
  check: { paddingRight: 8 },
  itemText: { flex: 1, fontSize: 14, color: COLORS.text },
  itemDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  delBtn: { padding: 6 },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 0.5, borderColor: COLORS.border },
  refUrl: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  addInput: { flex: 1, backgroundColor: COLORS.bg3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, fontSize: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  addBtn: { width: 42, height: 42, borderRadius: 11, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
});
