import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';
import {
  getNotifPermission, requestNotifPermission, requestIgnoreBattery,
  requestExactAlarm, openAppNotifSettings, sendTestNotification,
  requestNotificationListenerPermission,
} from '../utils/notifications';

const NEED_BUILD = 'Esta función necesita que regeneres el dev build (npx eas-cli build -p android --profile development) para que el permiso nativo quede instalado.';

function Item({ icon, color, title, desc, btnLabel, onPress, status }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={[styles.icon, { backgroundColor: color + '22' }]}><Ionicons name={icon} size={20} color={color} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          {status ? <Text style={[styles.status, { color }]}>{status}</Text> : null}
        </View>
      </View>
      <Text style={styles.cardDesc}>{desc}</Text>
      <TouchableOpacity style={[styles.btn, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.btnText}>{btnLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function PermisosScreen({ navigation }) {
  const [perm, setPerm] = useState('—');

  const refresh = async () => setPerm(await getNotifPermission());
  useEffect(() => { refresh(); }, []);

  const guard = (fn) => async () => {
    try { await fn(); } catch (e) { Alert.alert('Falta el dev build', NEED_BUILD); }
  };

  const activarNotif = guard(async () => {
    const s = await requestNotifPermission();
    setPerm(s);
    Alert.alert('Notificaciones', s === 'granted' ? '¡Activadas!' : `Estado: ${s}`);
  });
  const bateria = guard(requestIgnoreBattery);
  const alarmas = guard(requestExactAlarm);
  const ajustes = guard(openAppNotifSettings);
  const leerNotif = guard(requestNotificationListenerPermission);
  const probar = guard(async () => { await sendTestNotification('Prueba'); Alert.alert('Enviada', 'En 3 segundos deberías ver la notificación.'); });

  const permLabel = perm === 'granted' ? '✅ Concedido' : perm === 'denied' ? '❌ Denegado' : perm === 'web' ? 'No aplica en web' : `Estado: ${perm}`;

  return (
    <View style={styles.bg}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={22} color={COLORS.text} /></TouchableOpacity>
        <Text style={styles.topTitle}>Notificaciones y permisos</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.purpleLight} />
          <Text style={styles.noteText}>Para que las alarmas suenen siempre (incluso con la app cerrada), concede estos permisos en tu teléfono. Android los pide uno por uno.</Text>
        </View>

        <Item icon="notifications" color={COLORS.purpleLight} title="Notificaciones" status={permLabel}
          desc="Permite que la app te avise de actividades y hábitos." btnLabel="Activar notificaciones" onPress={activarNotif} />

        <Item icon="battery-charging" color={COLORS.green} title="Segundo plano (batería)"
          desc="Evita que el sistema 'duerma' la app y mate las alarmas. Elige 'No optimizar' / 'Sin restricciones'." btnLabel="Permitir segundo plano" onPress={bateria} />

        <Item icon="alarm" color={COLORS.amber} title="Alarmas exactas"
          desc="Permite que las alarmas suenen a la hora exacta (Android 12+)." btnLabel="Permitir alarmas exactas" onPress={alarmas} />

        <Item icon="options" color={COLORS.blue} title="Ajustes de notificaciones"
          desc="Abre los ajustes de notificación de Vida Plena (sonido, prioridad, pantalla)." btnLabel="Abrir ajustes" onPress={ajustes} />

        <Item icon="reader-outline" color={COLORS.pink} title="Leer notificaciones (Yape/Plin)"
          desc="Permite que la app detecte cuando recibes un pago por Yape o Plin para ayudarte a registrarlo." btnLabel="Permitir lectura" onPress={leerNotif} />

        <Item icon="flash" color={COLORS.purple} title="Probar"
          desc="Envía una notificación de prueba en 3 segundos." btnLabel="Enviar prueba" onPress={probar} />

        <Text style={styles.foot}>
          Nota: la ventana de alarma a pantalla completa sobre otras apps y la burbuja flotante requieren código nativo adicional (no incluido todavía). El aviso sí aparece como notificación emergente con sonido y vibración.
        </Text>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 52, paddingBottom: 12, backgroundColor: COLORS.bg2 },
  back: { padding: 6 },
  topTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  container: { padding: 16 },
  note: { flexDirection: 'row', gap: 10, backgroundColor: COLORS.purpleDim + '55', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 0.5, borderColor: COLORS.purpleLight + '44' },
  noteText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 19 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  status: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  cardDesc: { fontSize: 13, color: COLORS.textSub, lineHeight: 19, marginTop: 10 },
  btn: { marginTop: 12, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  foot: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18, marginTop: 6 },
});
