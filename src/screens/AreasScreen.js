import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import { newGoal } from '../utils/goals';
import EmptyState from '../components/EmptyState';

const PALETTE = ['#7C3AED', '#10B981', '#0EA5E9', '#F59E0B', '#EC4899', '#6366F1', '#A78BFA', '#EF4444'];

const MenuItem = ({ icon, color, label, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <Ionicons name={icon} size={20} color={color} />
    <Text style={styles.menuLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function AreasScreen({ navigation }) {
  const { areas, addArea, updateArea, deleteArea, addGoal, addHabit, addEvent } = useStore();
  const [expanded, setExpanded] = useState({});
  const [menu, setMenu] = useState(null);
  const [input, setInput] = useState(null);

  const childrenOf = (pid) => areas.filter((a) => (a.parentId || null) === pid);
  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const rows = [];
  const walk = (pid, depth) => {
    childrenOf(pid).forEach((n) => {
      rows.push({ node: n, depth, kids: childrenOf(n.id).length });
      if (expanded[n.id]) walk(n.id, depth + 1);
    });
  };
  walk(null, 0);

  const openAdd = (parentId) => setInput({ mode: 'add', parentId, text: '', color: PALETTE[Math.floor(Math.random() * PALETTE.length)] });
  const openRename = (node) => setInput({ mode: 'rename', node, text: node.name, color: node.color });

  const saveInput = async () => {
    const t = (input.text || '').trim();
    if (!t) return;
    if (input.mode === 'rename') {
      await updateArea(input.node.id, { name: t });
    } else {
      await addArea({ parentId: input.parentId, name: t, color: input.color });
      if (input.parentId) setExpanded((e) => ({ ...e, [input.parentId]: true }));
    }
    setInput(null);
  };

  const convertGoal = async (node) => {
    setMenu(null);
    const g = await addGoal(newGoal({ title: node.name }));
    await updateArea(node.id, { linkedGoalId: g.id });
    navigation.navigate('GoalDetail', { id: g.id });
  };
  const convertHabit = async (node) => {
    setMenu(null);
    await addHabit({ name: node.name, icon: 'ellipse-outline', color: node.color, category: 'personal', reminder: '08:00' });
    await updateArea(node.id, { linkedHabitId: true });
    Alert.alert('Hábito creado', `"${node.name}" se agregó a tus hábitos.`);
  };
  const convertTask = async (node) => {
    setMenu(null);
    await addEvent({ date: format(new Date(), 'yyyy-MM-dd'), title: node.name, time: null, color: node.color });
    Alert.alert('Tarea creada', `"${node.name}" se agregó hoy en tu calendario.`);
  };
  const removeNode = (node) => {
    setMenu(null);
    Alert.alert('Eliminar', `¿Eliminar "${node.name}" y todas sus sub-áreas?`, [
      { text: 'Cancelar' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteArea(node.id) },
    ]);
  };

  return (
    <View style={styles.bg}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#1A0A3E', '#0D0D1A']} style={styles.hero}>
          <Text style={styles.heroTitle}>Áreas de mi vida</Text>
          <Text style={styles.heroSub}>Organiza y desglosa todo: empresa, familia, aprendizaje...</Text>
        </LinearGradient>

        {areas.length === 0 ? (
          <EmptyState
            icon="git-branch-outline"
            title="Aún no tienes áreas"
            subtitle="Crea grandes áreas (Empresa, Familia, Aprendizaje...) y desglósalas en ramas sin límite. Cada rama puede volverse meta, hábito o tarea."
            actionLabel="Crear primera área"
            onAction={() => openAdd(null)}
          />
        ) : (
          <View style={styles.tree}>
            {rows.map(({ node, depth, kids }) => (
              <View key={node.id} style={[styles.row, { marginLeft: depth * 18 }]}>
                {kids > 0 ? (
                  <TouchableOpacity onPress={() => toggle(node.id)} style={styles.chev}>
                    <Ionicons name={expanded[node.id] ? 'chevron-down' : 'chevron-forward'} size={16} color={COLORS.textSub} />
                  </TouchableOpacity>
                ) : <View style={styles.chev} />}
                <View style={[styles.dot, { backgroundColor: node.color }]} />
                <TouchableOpacity style={{ flex: 1 }} onPress={() => (kids > 0 ? toggle(node.id) : setMenu(node))} activeOpacity={0.7}>
                  <Text style={styles.name}>{node.name}</Text>
                  <Text style={styles.meta}>
                    {kids > 0 ? `${kids} sub-área${kids > 1 ? 's' : ''}` : 'sin sub-áreas'}
                    {node.linkedGoalId ? ' · 🎯 meta' : ''}{node.linkedHabitId ? ' · 🔄 hábito' : ''}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openAdd(node.id)} style={styles.iconBtn}><Ionicons name="add" size={20} color={COLORS.purpleLight} /></TouchableOpacity>
                <TouchableOpacity onPress={() => setMenu(node)} style={styles.iconBtn}><Ionicons name="ellipsis-vertical" size={18} color={COLORS.textSub} /></TouchableOpacity>
              </View>
            ))}
            <Text style={styles.tip}>Toca el + de cada rama para agregar sub-áreas · ⋮ para más opciones</Text>
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => openAdd(null)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Menú de nodo */}
      <Modal visible={!!menu} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setMenu(null)}>
          <View style={styles.menuSheet}>
            {menu && <Text style={styles.menuTitle}>{menu.name}</Text>}
            <MenuItem icon="add-circle-outline" color={COLORS.purpleLight} label="Agregar sub-área" onPress={() => { const m = menu; setMenu(null); openAdd(m.id); }} />
            <MenuItem icon="star-outline" color={COLORS.amber} label="Convertir en meta" onPress={() => convertGoal(menu)} />
            <MenuItem icon="refresh-outline" color={COLORS.green} label="Convertir en hábito" onPress={() => convertHabit(menu)} />
            <MenuItem icon="calendar-outline" color={COLORS.blue} label="Convertir en tarea (hoy)" onPress={() => convertTask(menu)} />
            <MenuItem icon="create-outline" color={COLORS.textSub} label="Renombrar" onPress={() => { const m = menu; setMenu(null); openRename(m); }} />
            <MenuItem icon="trash-outline" color={COLORS.red} label="Eliminar" onPress={() => removeNode(menu)} />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Input agregar/renombrar */}
      <Modal visible={!!input} transparent animationType="slide" onRequestClose={() => setInput(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {input?.mode === 'rename' ? 'Renombrar' : (input?.parentId ? 'Nueva sub-área' : 'Nueva área')}
            </Text>
            <TextInput
              style={styles.inputBox}
              value={input?.text}
              onChangeText={(v) => setInput((s) => ({ ...s, text: v }))}
              placeholder="Nombre (ej. Empresa, App móvil...)"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />
            {input?.mode !== 'rename' && (
              <View style={styles.colorRow}>
                {PALETTE.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setInput((s) => ({ ...s, color: c }))} style={[styles.colorDot, { backgroundColor: c }, input?.color === c && styles.colorDotOn]} />
                ))}
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setInput(null)}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveInput}><Text style={styles.saveText}>Guardar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  container: { paddingBottom: 10 },
  hero: { padding: 24, paddingTop: 56, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  heroSub: { fontSize: 13, color: COLORS.purpleLight, marginTop: 4 },
  tree: { padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.card, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, marginBottom: 8, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  chev: { width: 24, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  meta: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  iconBtn: { padding: 6 },
  tip: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 8 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center', shadowColor: '#7C3AED', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  backdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  menuSheet: { backgroundColor: COLORS.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 14, paddingBottom: 30 },
  menuTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, padding: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 12 },
  menuLabel: { fontSize: 15, color: COLORS.text },
  sheet: { backgroundColor: COLORS.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  inputBox: { backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 15, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14, marginBottom: 6 },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  colorDotOn: { borderWidth: 3, borderColor: '#fff' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  cancelText: { color: COLORS.textSub, fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.purple },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
