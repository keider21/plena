import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import { GOAL_CATEGORIES, catOf, goalProgress, newGoal } from '../utils/goals';
import EmptyState from '../components/EmptyState';

export default function MetasScreen({ navigation }) {
  const { goals, addGoal } = useStore();
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [filter, setFilter] = useState('todas');

  const filtered = filter === 'todas' ? goals : goals.filter((g) => g.category === filter);

  const startAssistant = () => {
    const t = title.trim();
    if (!t) return;
    setModal(false);
    setTitle('');
    navigation.navigate('GoalAssistant', { title: t });
  };

  const startManual = async () => {
    const t = title.trim();
    if (!t) return;
    const g = await addGoal(newGoal({ title: t }));
    setModal(false);
    setTitle('');
    navigation.navigate('GoalDetail', { id: g.id });
  };

  return (
    <View style={styles.bg}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#1A0A3E', '#0D0D1A']} style={styles.hero}>
          <Text style={styles.heroTitle}>Mis metas</Text>
          <Text style={styles.heroSub}>
            {goals.length === 0
              ? 'Define lo que quieres lograr — con contexto, no solo un número.'
              : `${goals.length} meta${goals.length > 1 ? 's' : ''} en tu vida`}
          </Text>
        </LinearGradient>

        {goals.length === 0 ? (
          <EmptyState
            icon="star-outline"
            title="Aún no tienes metas"
            subtitle="Crea una meta con su porqué, plan, recursos y obstáculos. El asistente te ayuda a desglosarla paso a paso."
            actionLabel="Crear mi primera meta"
            onAction={() => setModal(true)}
          />
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterRow}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
            >
              {['todas', ...GOAL_CATEGORIES.map((c) => c.key)].map((k) => {
                const sel = filter === k;
                const label = k === 'todas' ? 'Todas' : catOf(k).label;
                return (
                  <TouchableOpacity key={k} onPress={() => setFilter(k)} style={[styles.filterChip, sel && styles.filterChipOn]}>
                    <Text style={[styles.filterText, sel && styles.filterTextOn]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 12 }}>
              {filtered.map((g) => {
                const cat = catOf(g.category);
                const pct = goalProgress(g);
                return (
                  <TouchableOpacity key={g.id} style={styles.card} activeOpacity={0.85} onPress={() => navigation.navigate('GoalDetail', { id: g.id })}>
                    <View style={styles.cardTop}>
                      <View style={[styles.cardIcon, { backgroundColor: cat.color + '22' }]}>
                        <Ionicons name={cat.icon} size={18} color={cat.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{g.title}</Text>
                        <View style={styles.cardMeta}>
                          <Text style={[styles.catTag, { color: cat.color }]}>{cat.label}</Text>
                          {g.targetDate ? <Text style={styles.dateTag}>· 🎯 {g.targetDate}</Text> : null}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                    </View>

                    {pct === null ? (
                      <Text style={styles.noInd}>Define indicadores para medir tu progreso</Text>
                    ) : (
                      <View style={styles.progWrap}>
                        <View style={styles.progBg}>
                          <View style={[styles.progFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                        </View>
                        <Text style={[styles.progPct, { color: cat.color }]}>{pct}%</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Nueva meta</Text>
              <TouchableOpacity onPress={() => setModal(false)}><Ionicons name="close" size={24} color={COLORS.textSub} /></TouchableOpacity>
            </View>
            <Text style={styles.sheetSub}>¿Qué quieres lograr?</Text>
            <TextInput
              placeholder="Ej. Tener una casa propia"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />
            <TouchableOpacity style={[styles.bigBtn, { backgroundColor: COLORS.purple }]} onPress={startAssistant} activeOpacity={0.85}>
              <Ionicons name="sparkles-outline" size={20} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bigBtnText}>Desglosar con asistente</Text>
                <Text style={styles.bigBtnSub}>Te hago preguntas y armo el plan</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bigBtn, styles.bigBtnAlt]} onPress={startManual} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={20} color={COLORS.purpleLight} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bigBtnText, { color: COLORS.text }]}>Crear y editar a mano</Text>
                <Text style={[styles.bigBtnSub, { color: COLORS.textSub }]}>Lleno los campos yo mismo</Text>
              </View>
            </TouchableOpacity>
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
  filterRow: { marginTop: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  filterChipOn: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  filterText: { fontSize: 13, color: COLORS.textSub },
  filterTextOn: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  catTag: { fontSize: 12, fontWeight: '600' },
  dateTag: { fontSize: 12, color: COLORS.textMuted },
  noInd: { fontSize: 12, color: COLORS.textMuted, marginTop: 12, fontStyle: 'italic' },
  progWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  progBg: { flex: 1, height: 6, backgroundColor: COLORS.bg3, borderRadius: 4, overflow: 'hidden' },
  progFill: { height: 6, borderRadius: 4 },
  progPct: { fontSize: 13, fontWeight: '700', width: 38, textAlign: 'right' },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  backdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  sheetSub: { fontSize: 13, color: COLORS.textSub, marginTop: 6, marginBottom: 10 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 0.5, borderColor: COLORS.cardBorder, marginBottom: 16,
  },
  bigBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 16, marginBottom: 12 },
  bigBtnAlt: { backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  bigBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  bigBtnSub: { color: '#ffffffaa', fontSize: 12, marginTop: 2 },
});
