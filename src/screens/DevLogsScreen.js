import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Share, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getLogs, clearLogs } from '../utils/logger';
import { getLastCrash, clearLastCrash } from '../utils/crashReporter';

const C = {
  bg: '#030308',
  bg2: '#0A0A14',
  border: '#1E1E3A',
  purple: '#7C3AED',
  purpleLight: '#A78BFA',
  text: '#E2E8F0',
  muted: '#4A5568',
  sub: '#718096',
  log: '#CBD5E0',
  warn: '#F6AD55',
  error: '#FC8181',
  warnBg: '#F6AD5510',
  errorBg: '#FC818110',
};

const LEVEL = {
  log:   { color: C.log,  bg: 'transparent', badge: 'LOG' },
  warn:  { color: C.warn, bg: C.warnBg,      badge: 'WRN' },
  error: { color: C.error, bg: C.errorBg,    badge: 'ERR' },
};

export default function DevLogsScreen({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [crash, setCrash] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all | warn | error

  const load = async () => {
    const [l, c] = await Promise.all([getLogs(), getLastCrash()]);
    setLogs(l);
    setCrash(c);
  };

  // Recarga cada vez que la pantalla recibe foco
  useFocusEffect(useCallback(() => { load(); }, []));

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const share = async () => {
    const lines = [];
    if (crash) {
      lines.push('═══ ÚLTIMO CRASH ═══');
      lines.push(`AT:    ${crash.at}`);
      lines.push(`MSG:   ${crash.message}`);
      if (crash.stack) lines.push(`STACK:\n${crash.stack.slice(0, 1500)}`);
      lines.push('');
    }
    lines.push('═══ LOGS ═══');
    logs.forEach(l => {
      lines.push(`[${LEVEL[l.level]?.badge || l.level}] ${l.at.slice(11, 23)}  ${l.msg}`);
    });
    try {
      await Share.share({ message: lines.join('\n'), title: 'Vida Plena – Dev Logs' });
    } catch {}
  };

  const clearAll = () => {
    Alert.alert('Limpiar logs', '¿Borrar todos los logs y crash?', [
      { text: 'Cancelar' },
      { text: 'Borrar', style: 'destructive', onPress: async () => {
        await Promise.all([clearLogs(), clearLastCrash()]);
        setLogs([]); setCrash(null);
      }},
    ]);
  };

  const visible = filter === 'all'
    ? logs
    : logs.filter(l => l.level === filter);

  const errorCount = logs.filter(l => l.level === 'error').length;
  const warnCount  = logs.filter(l => l.level === 'warn').length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.back}>
          <Ionicons name="chevron-back" size={20} color={C.purpleLight} />
        </TouchableOpacity>
        <Ionicons name="terminal" size={16} color={C.purpleLight} />
        <Text style={s.title}>Dev Logs</Text>
        <Text style={s.count}>{logs.length} líneas</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={refresh} style={s.hBtn}>
          <Ionicons name="refresh" size={16} color={C.purpleLight} />
        </TouchableOpacity>
        <TouchableOpacity onPress={share} style={s.hBtn}>
          <Ionicons name="share-outline" size={16} color={C.purpleLight} />
        </TouchableOpacity>
        <TouchableOpacity onPress={clearAll} style={s.hBtn}>
          <Ionicons name="trash-outline" size={16} color={C.error} />
        </TouchableOpacity>
      </View>

      {/* Crash banner */}
      {crash ? (
        <View style={s.crashCard}>
          <View style={s.crashRow}>
            <Ionicons name="skull-outline" size={14} color={C.error} />
            <Text style={s.crashLabel}>CRASH DETECTADO</Text>
            <Text style={s.crashAt}>{crash.at?.slice(0, 19).replace('T', ' ')}</Text>
          </View>
          <Text style={s.crashMsg}>{crash.message}</Text>
          {crash.stack ? (
            <Text style={s.crashStack} numberOfLines={6}>{crash.stack.slice(0, 600)}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Filter chips */}
      <View style={s.filters}>
        {[
          { key: 'all',   label: `Todos (${logs.length})` },
          { key: 'error', label: `Errores (${errorCount})` },
          { key: 'warn',  label: `Avisos (${warnCount})` },
        ].map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[s.chip, filter === f.key && s.chipOn]}
          >
            <Text style={[s.chipText, filter === f.key && s.chipTextOn]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Log list — los más recientes arriba */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.purpleLight} />}
      >
        {visible.length === 0 ? (
          <Text style={s.empty}>
            {filter === 'all'
              ? 'Sin logs. Usa la app y vuelve acá para ver los mensajes.'
              : `Sin registros de tipo "${filter}".`}
          </Text>
        ) : visible.map((l, i) => {
          const lv = LEVEL[l.level] || LEVEL.log;
          return (
            <View key={i} style={[s.row, { backgroundColor: lv.bg }]}>
              <Text style={[s.badge, { color: lv.color }]}>{lv.badge}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.time}>{l.at?.slice(11, 23)}</Text>
                <Text style={[s.msg, { color: lv.color }]}>{l.msg}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, paddingTop: 52, backgroundColor: C.bg2, borderBottomWidth: 0.5, borderBottomColor: C.border },
  back: { padding: 4, marginRight: 2 },
  title: { color: C.purpleLight, fontSize: 15, fontWeight: '700' },
  count: { color: C.muted, fontSize: 11, marginLeft: 2 },
  hBtn: { padding: 8, borderRadius: 8, backgroundColor: C.bg, marginLeft: 4 },
  crashCard: { margin: 8, borderRadius: 10, borderWidth: 1, borderColor: '#EF444444', backgroundColor: '#EF44440D', padding: 10 },
  crashRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  crashLabel: { color: C.error, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  crashAt: { color: C.muted, fontSize: 10, marginLeft: 'auto' },
  crashMsg: { color: '#FCA5A5', fontSize: 12, fontFamily: 'monospace', lineHeight: 17 },
  crashStack: { color: '#9B2C2C', fontSize: 10, fontFamily: 'monospace', marginTop: 6, lineHeight: 14 },
  filters: { flexDirection: 'row', gap: 6, padding: 8, backgroundColor: C.bg2 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 0.5, borderColor: C.border, backgroundColor: C.bg },
  chipOn: { backgroundColor: C.purple, borderColor: C.purple },
  chipText: { fontSize: 11, color: C.sub, fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  row: { flexDirection: 'row', gap: 6, paddingVertical: 5, paddingHorizontal: 4, borderRadius: 4, marginBottom: 1, borderBottomWidth: 0.3, borderBottomColor: C.border },
  badge: { fontSize: 9, fontWeight: '800', width: 28, paddingTop: 4, fontFamily: 'monospace' },
  time: { fontSize: 9, color: C.muted, fontFamily: 'monospace' },
  msg: { fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
  empty: { color: C.muted, textAlign: 'center', marginTop: 60, fontSize: 12, fontFamily: 'monospace', lineHeight: 20 },
});
