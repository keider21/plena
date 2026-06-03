import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

const MENTALIDAD = [
  { name: 'Disciplina', sub: 'Haz lo que debes, aunque no quieras', icon: 'shield', color: '#7C3AED' },
  { name: 'Toma de decisiones', sub: 'Actúa con claridad y rapidez', icon: 'flash', color: '#F59E0B' },
  { name: 'Aceptar el cambio', sub: 'Fluye, no resistas', icon: 'refresh', color: '#10B981' },
  { name: 'Hacer equipo', sub: 'Juntos llegamos más lejos', icon: 'people', color: '#0EA5E9' },
  { name: 'Afirmación', sub: 'Declara tu futuro en voz alta', icon: 'megaphone', color: '#EC4899' },
  { name: 'Mentalidad positiva', sub: 'Elige el optimismo cada mañana', icon: 'sunny', color: '#F59E0B' },
  { name: 'Resistencia', sub: 'Aguanta cuando duele, ahí creces', icon: 'flame', color: '#EF4444' },
  { name: 'Consistencia', sub: 'Pequeñas acciones todos los días', icon: 'calendar', color: '#7C3AED' },
  { name: 'Confianza', sub: 'Cree en ti antes que nadie', icon: 'star', color: '#10B981' },
  { name: 'Caminar con propósito', sub: 'Cada paso tiene dirección', icon: 'compass', color: '#6366F1' },
  { name: 'Paciencia', sub: 'El tiempo trabaja a tu favor', icon: 'hourglass', color: '#0EA5E9' },
  { name: 'Ser tu mejor versión', sub: 'Supérate a ti, no a los demás', icon: 'arrow-up-circle', color: '#EC4899' },
];

const REFS = [
  { name: 'Elon Musk', trait: 'Visión imposible a largo plazo', lesson: 'Piensa en 10 años, no en 10 meses. Define una misión que parezca imposible y trabaja cada día hacia ella.', color: '#7C3AED', bg: '#2D1B69' },
  { name: 'Jeff Bezos', trait: 'Obsesión por el cliente, paciencia', lesson: 'El día 1 siempre. Nunca te acomodes. La complacencia es el enemigo del crecimiento.', color: '#F59E0B', bg: '#78350F' },
  { name: 'Warren Buffett', trait: 'Disciplina, valor y paciencia compuesta', lesson: 'No compres lo que no entiendes. Invierte en ti mismo primero. El interés compuesto aplica a hábitos también.', color: '#10B981', bg: '#064E3B' },
  { name: 'Jensen Huang', trait: 'Resiliencia y tecnología profunda', lesson: 'Nvidia estuvo al borde del colapso varias veces. La resiliencia y creer en tu visión lo es todo.', color: '#0EA5E9', bg: '#0C4A6E' },
  { name: 'Mark Zuckerberg', trait: 'Velocidad de ejecución y escala', lesson: 'Muévete rápido. Una idea ejecutada imperfectamente vale más que la idea perfecta no lanzada.', color: '#6366F1', bg: '#1E1B4B' },
  { name: 'Larry Page', trait: 'Pensamiento 10x, no 10%', lesson: 'Si piensas en mejorar un 10%, compites con todos. Si piensas en mejorar 10 veces, tienes que empezar desde cero con creatividad.', color: '#EC4899', bg: '#831843' },
  { name: 'Sergey Brin', trait: 'Curiosidad científica aplicada', lesson: 'Las mejores ideas nacen de la intersección entre ciencia y problemas reales del mundo.', color: '#EF4444', bg: '#7F1D1D' },
  { name: 'Bernard Arnault', trait: 'Legado, marca y lujo', lesson: 'Construye marcas que duren décadas. La familia y el legado son activos igual que el dinero.', color: '#F59E0B', bg: '#78350F' },
  { name: 'Amancio Ortega', trait: 'Trabajo constante, bajo perfil', lesson: 'El más rico de España no da entrevistas. El trabajo habla solo. La acción supera a las palabras.', color: '#10B981', bg: '#064E3B' },
  { name: 'Larry Ellison', trait: 'Competitividad y dominio', lesson: 'No es suficiente ganar, los demás deben perder. La ambición sin límites crea imperios.', color: '#0EA5E9', bg: '#0C4A6E' },
];

const AFIRMACIONES = [
  '"Soy capaz de construir la vida que sueño para mi familia y para mí."',
  '"Cada día que trabajo en mis hábitos me acerco más a mi mejor versión."',
  '"Mi empresa crecerá porque yo crezco primero como persona."',
  '"Soy disciplinado, consistente y camino con propósito."',
  '"Mi familia es mi mayor motivación y mi mayor legado."',
  '"El dinero fluye hacia mí porque soy responsable y tengo un plan."',
  '"Acepto el cambio y lo convierto en oportunidad."',
  '"Hoy hago lo que los mediocres no hacen, para mañana vivir como los mediocres no pueden."',
];

export default function MentalidadScreen() {
  const [activeRasgos, setActiveRasgos] = useState(new Set([0, 2, 4]));
  const [expandedRef, setExpandedRef] = useState(null);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [tab, setTab] = useState('mentalidad');

  const toggleRasgo = (i) => {
    const s = new Set(activeRasgos);
    s.has(i) ? s.delete(i) : s.add(i);
    setActiveRasgos(s);
  };

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      <LinearGradient colors={['#1A0A3E', '#0D0D1A']} style={styles.header}>
        <Text style={styles.headerTitle}>Crecimiento</Text>
        <Text style={styles.headerSub}>Mentalidad y referencias de éxito</Text>
        <View style={styles.tabRow}>
          {['mentalidad', 'referencias'].map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {tab === 'mentalidad' && (
        <>
          <View style={styles.section}>
            <View style={styles.quoteCard}>
              <Ionicons name="flash" size={18} color={COLORS.purpleLight} style={{ marginBottom: 8 }} />
              <Text style={styles.quoteText}>{AFIRMACIONES[quoteIdx]}</Text>
              <TouchableOpacity
                onPress={() => setQuoteIdx((quoteIdx + 1) % AFIRMACIONES.length)}
                style={styles.nextQuoteBtn}
              >
                <Ionicons name="refresh-outline" size={14} color={COLORS.purpleLight} />
                <Text style={styles.nextQuoteBtnText}>Nueva afirmación</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Rasgos que estoy desarrollando
              <Text style={styles.sectionCount}> · {activeRasgos.size} activos</Text>
            </Text>
            <View style={styles.rasgoGrid}>
              {MENTALIDAD.map((m, i) => {
                const active = activeRasgos.has(i);
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => toggleRasgo(i)}
                    activeOpacity={0.75}
                    style={[styles.rasgoCard, active && { borderColor: m.color, backgroundColor: m.color + '12' }]}
                  >
                    <View style={[styles.rasgoIcon, { backgroundColor: m.color + (active ? '33' : '18') }]}>
                      <Ionicons name={m.icon + '-outline'} size={18} color={m.color} />
                    </View>
                    <Text style={[styles.rasgoName, active && { color: m.color }]}>{m.name}</Text>
                    <Text style={styles.rasgoSub}>{m.sub}</Text>
                    {active && (
                      <View style={[styles.activeDot, { backgroundColor: m.color }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.frasePizarra}>
              <Text style={styles.fraseLabel}>Frase de tu pizarra</Text>
              <Text style={styles.fraseMain}>"Piensa como, habla como, actúa como, viste como."</Text>
              <Text style={styles.fraseSub}>La transformación empieza en la mente antes que en las acciones.</Text>
            </View>
          </View>
        </>
      )}

      {tab === 'referencias' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tus 10 referencias de éxito</Text>
          {REFS.map((r, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setExpandedRef(expandedRef === i ? null : i)}
              activeOpacity={0.8}
              style={[styles.refCard, expandedRef === i && { borderColor: r.color }]}
            >
              <View style={styles.refTop}>
                <View style={[styles.refNum, { backgroundColor: r.bg }]}>
                  <Text style={[styles.refNumText, { color: r.color }]}>{i + 1}</Text>
                </View>
                <View style={[styles.refAvatar, { backgroundColor: r.bg }]}>
                  <Text style={[styles.refAvatarText, { color: r.color }]}>
                    {r.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.refName}>{r.name}</Text>
                  <Text style={[styles.refTrait, { color: r.color }]}>{r.trait}</Text>
                </View>
                <Ionicons
                  name={expandedRef === i ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={COLORS.textMuted}
                />
              </View>
              {expandedRef === i && (
                <View style={[styles.refLesson, { borderLeftColor: r.color }]}>
                  <Text style={styles.refLessonText}>{r.lesson}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  container: {},
  header: { padding: 20, paddingTop: 56, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.textSub, marginTop: 2, marginBottom: 16 },
  tabRow: { flexDirection: 'row', backgroundColor: COLORS.card + 'AA', borderRadius: 12, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: COLORS.purple },
  tabText: { fontSize: 13, color: COLORS.textSub, fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  sectionCount: { color: COLORS.textMuted, fontWeight: '400', fontSize: 13 },
  quoteCard: { backgroundColor: COLORS.purpleDim, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: COLORS.purple + '44' },
  quoteText: { fontSize: 15, color: COLORS.text, lineHeight: 24, fontStyle: 'italic', marginBottom: 12 },
  nextQuoteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: COLORS.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  nextQuoteBtnText: { fontSize: 12, color: COLORS.purpleLight, fontWeight: '600' },
  rasgoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rasgoCard: {
    width: '47%', backgroundColor: COLORS.card, borderRadius: 14, padding: 12,
    borderWidth: 0.5, borderColor: COLORS.cardBorder, position: 'relative',
  },
  rasgoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  rasgoName: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  rasgoSub: { fontSize: 11, color: COLORS.textMuted, lineHeight: 15 },
  activeDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },
  frasePizarra: { backgroundColor: COLORS.card, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: COLORS.cardBorder, borderLeftWidth: 3, borderLeftColor: COLORS.purpleLight },
  fraseLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fraseMain: { fontSize: 16, color: COLORS.text, fontWeight: '600', lineHeight: 24, marginBottom: 8, fontStyle: 'italic' },
  fraseSub: { fontSize: 13, color: COLORS.textSub, lineHeight: 20 },
  refCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  refTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  refNum: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  refNumText: { fontSize: 12, fontWeight: '800' },
  refAvatar: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  refAvatarText: { fontSize: 13, fontWeight: '700' },
  refName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  refTrait: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  refLesson: { marginTop: 12, paddingTop: 12, paddingLeft: 12, borderTopWidth: 0.5, borderTopColor: COLORS.border, borderLeftWidth: 2 },
  refLessonText: { fontSize: 13, color: COLORS.textSub, lineHeight: 20 },
});
