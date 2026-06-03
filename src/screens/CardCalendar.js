import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, subDays, isSameMonth, isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import { formatMoney } from '../utils/currency';
import { dayInfo, nextCutoff, nextPay, recommendation } from '../utils/cardCycle';

const WD = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const LEVEL_COLOR = { green: COLORS.green, yellow: COLORS.amber, red: COLORS.red };

export default function CardCalendar({ navigation, route }) {
  const { id } = route.params || {};
  const card = useStore((s) => s.finance.cards.find((c) => c.id === id));
  const [cursor, setCursor] = useState(new Date());

  if (!card) {
    return (
      <View style={[styles.bg, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: COLORS.textSub }}>Tarjeta no encontrada.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}><Text style={{ color: COLORS.purpleLight }}>Volver</Text></TouchableOpacity>
      </View>
    );
  }

  const configured = card.cutoffDay && card.payDay;
  const today = new Date();
  const nc = configured ? nextCutoff(today, card.cutoffDay) : null;
  const np = configured ? nextPay(today, card.payDay) : null;
  const payReminder = np ? subDays(np, 5) : null;
  const reco = configured ? recommendation(card) : null;

  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <View style={styles.bg}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}><Ionicons name="arrow-back" size={22} color={COLORS.text} /></TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{card.bank}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* resumen tarjeta */}
        <View style={styles.cardSummary}>
          <Ionicons name="card" size={22} color={COLORS.purpleLight} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{card.bank}</Text>
            <Text style={styles.cardUse}>Usado {formatMoney(card.used, card.currency)} de {formatMoney(card.limit, card.currency)}</Text>
          </View>
        </View>

        {!configured ? (
          <View style={styles.warnCard}>
            <Ionicons name="alert-circle-outline" size={20} color={COLORS.amber} />
            <Text style={styles.warnText}>Configura el <Text style={{ fontWeight: '700' }}>día de corte</Text> y el <Text style={{ fontWeight: '700' }}>día de pago</Text> de la tarjeta (editándola en Finanzas) para ver el calendario de compras y pagos.</Text>
          </View>
        ) : (
          <>
            {/* recordatorios */}
            <View style={[styles.recoCard, { borderColor: LEVEL_COLOR[reco.color] + '88' }]}>
              <Text style={[styles.recoTitle, { color: LEVEL_COLOR[reco.color] }]}>{reco.title}</Text>
              <Text style={styles.recoText}>{reco.text}</Text>
            </View>

            <View style={styles.remRow}>
              <View style={styles.remCard}>
                <Ionicons name="cut-outline" size={18} color={COLORS.blue} />
                <Text style={styles.remLbl}>Próximo cierre</Text>
                <Text style={styles.remVal}>{cap(format(nc, "EEE d 'de' MMM", { locale: es }))}</Text>
              </View>
              <View style={styles.remCard}>
                <Ionicons name="card-outline" size={18} color={COLORS.amber} />
                <Text style={styles.remLbl}>Próximo pago</Text>
                <Text style={styles.remVal}>{cap(format(np, "EEE d 'de' MMM", { locale: es }))}</Text>
              </View>
            </View>
            <View style={styles.payReminder}>
              <Ionicons name="alarm-outline" size={18} color={COLORS.red} />
              <Text style={styles.payReminderText}>Recordatorio: paga antes del <Text style={{ fontWeight: '800' }}>{cap(format(payReminder, "EEE d 'de' MMM", { locale: es }))}</Text> (5 días antes) para no arriesgar intereses.</Text>
            </View>

            {/* navegador de mes */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={() => setCursor(subMonths(cursor, 1))} style={styles.iconBtn}><Ionicons name="chevron-back" size={20} color={COLORS.purpleLight} /></TouchableOpacity>
              <Text style={styles.monthTitle}>{cap(format(cursor, 'MMMM yyyy', { locale: es }))}</Text>
              <TouchableOpacity onPress={() => setCursor(addMonths(cursor, 1))} style={styles.iconBtn}><Ionicons name="chevron-forward" size={20} color={COLORS.purpleLight} /></TouchableOpacity>
            </View>

            <View style={styles.weekHeader}>{WD.map((w, i) => <Text key={i} style={styles.weekHeaderText}>{w}</Text>)}</View>
            <View style={styles.grid}>
              {days.map((d) => {
                const inMonth = isSameMonth(d, cursor);
                const info = dayInfo(d, card);
                const col = LEVEL_COLOR[info.level];
                return (
                  <View key={d.toISOString()} style={styles.cellWrap}>
                    <View style={[styles.cell, { backgroundColor: col + (inMonth ? '2E' : '12') }, isToday(d) && styles.cellToday]}>
                      <Text style={[styles.cellNum, { color: inMonth ? COLORS.text : COLORS.textMuted }]}>{format(d, 'd')}</Text>
                      <View style={styles.markers}>
                        {info.isCorte && <Ionicons name="cut" size={9} color={COLORS.blue} />}
                        {info.isPago && <Ionicons name="card" size={9} color={COLORS.amber} />}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* leyenda */}
            <View style={styles.legend}>
              <Legend color={COLORS.green} text="Mejor para comprar (máx. días sin interés)" />
              <Legend color={COLORS.amber} text="Intermedio" />
              <Legend color={COLORS.red} text="Evita comprar (cerca del cierre)" />
              <View style={styles.legendItem}><Ionicons name="cut" size={12} color={COLORS.blue} /><Text style={styles.legendText}>Día de cierre/corte</Text></View>
              <View style={styles.legendItem}><Ionicons name="card" size={12} color={COLORS.amber} /><Text style={styles.legendText}>Día de pago</Text></View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>💡 Cómo aprovecharlo</Text>
              <Text style={styles.infoText}>
                Compra en los días <Text style={{ color: COLORS.green, fontWeight: '700' }}>verdes</Text> (justo después del cierre): así tu compra se cobra en el siguiente cierre y la pagas hasta la fecha de pago de ese ciclo, ganando el máximo de días sin intereses. Evita los días <Text style={{ color: COLORS.red, fontWeight: '700' }}>rojos</Text> (pegados al cierre). Y paga siempre antes de tu fecha límite.
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const Legend = ({ color, text }) => (
  <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{text}</Text></View>
);

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 52, paddingBottom: 12, backgroundColor: COLORS.bg2 },
  iconBtn: { padding: 6 },
  topTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },
  container: { padding: 16 },
  cardSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  cardName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardUse: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  warnCard: { flexDirection: 'row', gap: 10, backgroundColor: COLORS.amberDim + '55', borderRadius: 14, padding: 14, marginTop: 14, borderWidth: 0.5, borderColor: COLORS.amber + '44' },
  warnText: { flex: 1, fontSize: 13, color: COLORS.amber, lineHeight: 19 },
  recoCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginTop: 14, borderWidth: 1 },
  recoTitle: { fontSize: 15, fontWeight: '800' },
  recoText: { fontSize: 13, color: COLORS.text, lineHeight: 19, marginTop: 4 },
  remRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  remCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 12, borderWidth: 0.5, borderColor: COLORS.cardBorder, gap: 2 },
  remLbl: { fontSize: 11, color: COLORS.textSub, marginTop: 4 },
  remVal: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  payReminder: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.redDim + '55', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 0.5, borderColor: COLORS.red + '44' },
  payReminderText: { flex: 1, fontSize: 12, color: COLORS.text, lineHeight: 17 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 },
  monthTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  weekHeader: { flexDirection: 'row', marginBottom: 6 },
  weekHeaderText: { flex: 1, textAlign: 'center', fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellWrap: { width: `${100 / 7}%`, padding: 2 },
  cell: { aspectRatio: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cellToday: { borderWidth: 2, borderColor: COLORS.purpleLight },
  cellNum: { fontSize: 14, fontWeight: '600' },
  markers: { flexDirection: 'row', gap: 2, height: 10, alignItems: 'center' },
  legend: { marginTop: 16, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 4 },
  legendText: { fontSize: 12, color: COLORS.textSub },
  infoCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  infoTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  infoText: { fontSize: 13, color: COLORS.textSub, lineHeight: 20 },
});
