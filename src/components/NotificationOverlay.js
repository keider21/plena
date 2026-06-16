import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Vibration, Platform,
  NativeModules, NativeEventEmitter,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';
import { snooze, reschedulePlan } from '../utils/notifications';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';

const ACTIVITY_TYPES = ['activity', 'schedule_change'];

export default function NotificationOverlay() {
  const [visible, setVisible] = useState(false);
  const [notif, setNotif] = useState(null);
  const slideY = useRef(new Animated.Value(-300)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const show = (notification) => {
    slideY.setValue(-300);
    opacity.setValue(0);
    setNotif(notification);
    setVisible(true);
    if (Platform.OS === 'android') Vibration.vibrate([0, 250, 150, 250]);
    // Start after next frame so Modal is mounted
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const hide = (cb) => {
    Animated.parallel([
      Animated.timing(slideY, { toValue: -300, duration: 280, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setNotif(null);
      if (cb) cb();
    });
  };

  useEffect(() => {
    // ── Expo-notifications: hábitos, snooze, test (siguen usando expo) ──
    const foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data || {};
      if (!ACTIVITY_TYPES.includes(data.type)) return;
      // Actividades de AlarmManager se manejan por FSN_EVENT abajo; ignorar duplicados expo
      if (data.type === 'activity') return;
      show(notification);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data || {};
      if (!ACTIVITY_TYPES.includes(data.type)) return;
      if (data.type === 'activity') return; // Manejado por FSN_EVENT
      const actionId = response.actionIdentifier;
      if (actionId === 'ACEPTAR') handleAcceptData(data);
      else if (actionId === 'POSPONER') handleSnoozeData(response.notification);
    });

    // ── FSN: módulo nativo AlarmManager (actividades, pantalla bloqueada) ──
    let fsnSub;
    const fsn = NativeModules.FullScreenNotif;
    if (Platform.OS === 'android' && fsn) {
      const emitter = new NativeEventEmitter(fsn);

      const handleFSNEvent = (event) => {
        const data = typeof event.data === 'string'
          ? (() => { try { return JSON.parse(event.data); } catch { return {}; } })()
          : (event.data || {});

        if (event.action === 'SHOW') {
          // Alarma disparada con app en primer plano → mostrar overlay
          if (Platform.OS === 'android') Vibration.vibrate([0, 250, 150, 250]);
          show({ request: { content: { title: event.title, body: event.body, data } } });

        } else if (event.action === 'ACEPTAR') {
          // Acción desde PopupActivity (pantalla bloqueada / app en background)
          handleAcceptData(data);

        } else if (event.action === 'POSPONER') {
          snooze(data.name || 'Actividad', 'Actividad pospuesta', 5, data).catch(() => {});
        }
        // RECHAZAR: solo cierra, no hace nada más

        // Tras cualquier alarma disparada, refresca la ventana de 14 días
        // (mantiene las alarmas vivas sin riesgo de duplicados).
        try {
          const { planning, habits } = useStore.getState();
          reschedulePlan(planning, habits).catch(() => {});
        } catch {}
      };

      fsnSub = emitter.addListener('FSN_EVENT', handleFSNEvent);

      // Recuperar acción pendiente si la app fue iniciada desde PopupActivity
      fsn.getPendingEvent().then((event) => {
        if (event) handleFSNEvent(event);
      }).catch(() => {});
    }

    return () => {
      foregroundSub.remove();
      responseSub.remove();
      fsnSub?.remove();
    };
  }, []);

  const handleAcceptData = (data) => {
    if (data.type === 'activity' && data.id) {
      const today = format(new Date(), 'yyyy-MM-dd');
      useStore.getState().logActivity(today, data.id, { status: 'done', pct: 100 });
    }
  };

  const handleSnoozeData = async (notification) => {
    const { title, body } = notification.request.content;
    const data = notification.request.content.data || {};
    await snooze(title, body, 5, data);
  };

  const handleAccept = () => {
    if (notif) handleAcceptData(notif.request.content.data || {});
    hide();
  };

  const handleSnooze = async () => {
    if (notif) await handleSnoozeData(notif);
    hide();
  };

  const handleCancel = () => hide();

  const title = notif?.request.content.title || '';
  const body = notif?.request.content.body || '';
  const data = notif?.request.content.data || {};
  const isScheduleChange = data.type === 'schedule_change';

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={handleCancel}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleCancel} />
        <Animated.View style={[styles.card, { transform: [{ translateY: slideY }] }]}>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: isScheduleChange ? COLORS.purple : '#F5A623' }]}>
              <Ionicons name={isScheduleChange ? 'calendar' : 'alarm'} size={20} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.appLabel}>Vida Plena · Plan</Text>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
            </View>
            <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <Text style={styles.body} numberOfLines={2}>{body}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.btnAccept]} onPress={handleAccept} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.btnTextAccept}>Aceptar</Text>
            </TouchableOpacity>

            {!isScheduleChange && (
              <TouchableOpacity style={[styles.btn, styles.btnSnooze]} onPress={handleSnooze} activeOpacity={0.85}>
                <Ionicons name="time-outline" size={18} color={COLORS.purple} />
                <Text style={styles.btnTextSnooze}>+5 min</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={handleCancel} activeOpacity={0.85}>
              <Ionicons name="close-circle-outline" size={18} color={COLORS.textSub} />
              <Text style={styles.btnTextCancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-start',
    paddingTop: 44,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: COLORS.bg2 || '#F5F3FF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
    borderWidth: 0.5,
    borderColor: COLORS.cardBorder || '#ddd',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appLabel: {
    fontSize: 10,
    color: COLORS.textMuted || '#aaa',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text || '#1a1a2e',
  },
  body: {
    fontSize: 13,
    color: COLORS.textSub || '#666',
    lineHeight: 18,
    marginBottom: 14,
  },
  divider: {
    height: 0.5,
    backgroundColor: COLORS.border || '#e0e0e0',
    marginBottom: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  btnAccept: {
    backgroundColor: COLORS.purple || '#7C3AED',
  },
  btnTextAccept: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  btnSnooze: {
    backgroundColor: (COLORS.purpleDim || '#EDE9FE'),
  },
  btnTextSnooze: {
    color: COLORS.purple || '#7C3AED',
    fontWeight: '700',
    fontSize: 14,
  },
  btnCancel: {
    backgroundColor: COLORS.bg3 || '#F0EEF8',
  },
  btnTextCancel: {
    color: COLORS.textSub || '#666',
    fontWeight: '600',
    fontSize: 14,
  },
});
