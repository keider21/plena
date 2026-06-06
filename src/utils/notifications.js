import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const isWeb = Platform.OS === 'web';

// Cómo se muestran cuando la app está en primer plano
if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const CH_DEFAULT = 'recordatorios';
const CH_ALARM = 'alarmas';
const T = () => Notifications.SchedulableTriggerInputTypes;

// expo: weekday 1=Domingo .. 7=Sábado ; JS getDay 0=Domingo .. 6=Sábado
const expoWeekday = (jsDay) => (jsDay % 7) + 1;

// ─── Configuración inicial (canales + permisos) ─────────────
export async function setupNotifications() {
  if (isWeb) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CH_DEFAULT, {
        name: 'Recordatorios',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C3AED',
      });
      await Notifications.setNotificationChannelAsync(CH_ALARM, {
        name: 'Alarmas de actividades',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 400, 200, 400, 200, 400],
        lightColor: '#7C3AED',
        bypassDnd: true,
      });
    }
    await Notifications.setNotificationCategoryAsync('actividad', [
      { identifier: 'ACEPTAR', buttonTitle: 'Aceptar' },
      { identifier: 'POSPONER', buttonTitle: 'Posponer' },
      { identifier: 'RECHAZAR', buttonTitle: 'Rechazar', options: { isDestructive: true } },
    ]);
    const { status } = await Notifications.getPermissionsAsync();
    let final = status;
    if (status !== 'granted') final = (await Notifications.requestPermissionsAsync()).status;
    return final === 'granted';
  } catch (e) { console.log('notif setup', e); return false; }
}

// Compat: nombre antiguo usado por DashboardScreen
export async function registerForPushNotifications() {
  return setupNotifications();
}

export function addResponseListener(cb) {
  if (isWeb) return { remove() {} };
  try { return Notifications.addNotificationResponseReceivedListener(cb); }
  catch (e) { return { remove() {} }; }
}

// ─── Programación ───────────────────────────────────────────
async function schedule(id, content, trigger) {
  if (isWeb) return;
  try {
    await Notifications.scheduleNotificationAsync(id ? { identifier: id, content, trigger } : { content, trigger });
  } catch (e) { console.log('schedule', e); }
}

export function scheduleWeekly(id, title, body, jsDay, hour, minute, { alarm = false, data = {} } = {}) {
  return schedule(
    id,
    { title, body, sound: 'default', data, categoryIdentifier: 'actividad' },
    { type: T().WEEKLY, weekday: expoWeekday(jsDay), hour, minute, channelId: alarm ? CH_ALARM : CH_DEFAULT }
  );
}

export function scheduleDaily(id, title, body, hour, minute, { data = {} } = {}) {
  return schedule(
    id,
    { title, body, sound: 'default', data },
    { type: T().DAILY, hour, minute, channelId: CH_DEFAULT }
  );
}

export async function snooze(title, body, minutes = 5, data = {}) {
  if (isWeb) return;
  await schedule(
    undefined,
    { title: `⏰ ${title}`, body: body || 'Recordatorio pospuesto', sound: 'default', data, categoryIdentifier: 'actividad' },
    { type: T().TIME_INTERVAL, seconds: Math.max(60, minutes * 60), channelId: CH_ALARM }
  );
}

export async function sendTestNotification(name = 'Prueba') {
  if (isWeb) return;
  await schedule(
    undefined,
    { title: `✅ ${name}`, body: '¡Las notificaciones funcionan!', sound: 'default' },
    { type: T().TIME_INTERVAL, seconds: 3, channelId: CH_DEFAULT }
  );
}

// Compat: hábitos individuales (HabitosScreen)
export async function scheduleHabitReminder(habitId, habitName, timeStr) {
  if (isWeb || !timeStr) return;
  await cancelHabitReminder(habitId);
  const [h, m] = timeStr.split(':').map(Number);
  await scheduleDaily(`habit_${habitId}`, `⏰ ${habitName}`, 'Mantén tu racha. ¡Tú puedes!', h || 0, m || 0, { data: { type: 'habit', id: habitId } });
}
export async function cancelHabitReminder(habitId) {
  if (isWeb) return;
  try { await Notifications.cancelScheduledNotificationAsync(`habit_${habitId}`); } catch (e) {}
}

export async function cancelAll() {
  if (isWeb) return;
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch (e) {}
}

// ─── Permisos del sistema (requieren dev build con expo-intent-launcher) ──
const PKG = 'com.vidaplena.app';
const IL = () => require('expo-intent-launcher');

export async function getNotifPermission() {
  if (isWeb) return 'web';
  try { const { status } = await Notifications.getPermissionsAsync(); return status; } catch (e) { return 'desconocido'; }
}
export async function requestNotifPermission() {
  if (isWeb) return 'web';
  try { const { status } = await Notifications.requestPermissionsAsync(); return status; } catch (e) { return 'error'; }
}
export async function requestIgnoreBattery() {
  if (Platform.OS !== 'android') return;
  const il = IL();
  try { await il.startActivityAsync('android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS', { data: 'package:' + PKG }); }
  catch (e) { await il.startActivityAsync('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS'); }
}
export async function requestExactAlarm() {
  if (Platform.OS !== 'android') return;
  await IL().startActivityAsync('android.settings.REQUEST_SCHEDULE_EXACT_ALARM', { data: 'package:' + PKG });
}
export async function openAppNotifSettings() {
  if (Platform.OS !== 'android') return;
  await IL().startActivityAsync('android.settings.APP_NOTIFICATION_SETTINGS', { extra: { 'android.provider.extra.APP_PACKAGE': PKG } });
}

// ─── Reprogramación masiva (hábitos + actividades del horario) ──
export async function rescheduleAll({ habits = [], schedule: sch, activities = [], placementsByDay = null } = {}) {
  if (isWeb) return;
  await cancelAll();
  for (const hb of habits.filter((x) => x.active && x.reminder)) {
    const [h, m] = hb.reminder.split(':').map(Number);
    await scheduleDaily(`habit_${hb.id}`, `⏰ ${hb.name}`, 'Es momento de tu hábito.', h || 0, m || 0, { data: { type: 'habit', id: hb.id } });
  }
  if (sch && placementsByDay) {
    for (const jsDay of Object.keys(placementsByDay)) {
      for (const p of placementsByDay[jsDay]) {
        const hour = Math.floor(p.start / 60) % 24;
        const minute = Math.round(p.start % 60);
        await scheduleWeekly(
          `act_${jsDay}_${p.activityId}`,
          `🔔 ${p.name}`,
          'Comienza tu actividad. ¿Aceptar, posponer o rechazar?',
          Number(jsDay), hour, minute,
          { alarm: true, data: { type: 'activity', id: p.activityId } }
        );
      }
    }
  }
}
