import { Platform, NativeModules } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activityTimesForDate } from './timeOrganizer';

// Native full-screen intent module (Android only)
const FSN = Platform.OS === 'android' ? NativeModules.FullScreenNotif : null;

const isWeb = Platform.OS === 'web';

const SCHEDULE_DAYS = 14;
const SCHED_IDS_KEY = 'fsn_scheduled_ids';

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function loadScheduledIds() {
  try { const raw = await AsyncStorage.getItem(SCHED_IDS_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
async function saveScheduledIds(ids) {
  try { await AsyncStorage.setItem(SCHED_IDS_KEY, JSON.stringify(ids)); } catch {}
}
async function cancelAllNative() {
  if (!FSN) return;
  const ids = await loadScheduledIds();
  for (const id of ids) { try { FSN.cancelNotif(id); } catch {} }
  await saveScheduledIds([]);
}

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

async function ensureChannels() {
  if (isWeb || Platform.OS !== 'android') return;
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

export async function setupNotifications() {
  if (isWeb) return false;
  try {
    await ensureChannels();
    await Notifications.setNotificationCategoryAsync('actividad', [
      { identifier: 'ACEPTAR', buttonTitle: 'Aceptar' },
      { identifier: 'POSPONER', buttonTitle: 'Posponer' },
      { identifier: 'RECHAZAR', buttonTitle: 'Rechazar', options: { isDestructive: true } },
    ]);
    const { status } = await Notifications.getPermissionsAsync();
    let final = status;
    if (status !== 'granted') final = (await Notifications.requestPermissionsAsync()).status;
    return final === 'granted';
  } catch (e) { console.log('notif setup error:', e); return false; }
}

export async function registerForPushNotifications() {
  return setupNotifications();
}

export function addResponseListener(cb) {
  if (isWeb) return { remove() {} };
  try { return Notifications.addNotificationResponseReceivedListener(cb); }
  catch (e) { return { remove() {} }; }
}

async function schedule(id, content, trigger) {
  if (isWeb) return null;
  try {
    return await Notifications.scheduleNotificationAsync(
      id ? { identifier: id, content, trigger } : { content, trigger }
    );
  } catch (e) {
    console.log('[notif] schedule error:', id, e?.message || e);
    return null;
  }
}

function scheduleActivityAt(id, title, body, data, when) {
  const dataJson = JSON.stringify(data);
  if (FSN && FSN.schedule) {
    FSN.schedule(id, title, body, when.getTime(), dataJson);
  } else {
    schedule(id, { title, body, sound: 'default', categoryIdentifier: 'actividad', data },
      { type: T().DATE, date: when, channelId: CH_ALARM });
  }
}

export function rescheduleActivity(notifId, title, body, data = {}) {
  if (isWeb || !notifId) return;
  const when = new Date();
  if (Number.isFinite(data.hour) && Number.isFinite(data.minute)) {
    when.setDate(when.getDate() + 7);
    when.setHours(data.hour, data.minute, 0, 0);
  } else {
    when.setTime(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  scheduleActivityAt(notifId, title, body, data, when);
  loadScheduledIds().then((ids) => { if (!ids.includes(notifId)) saveScheduledIds([...ids, notifId]); });
}

export function scheduleWeekly(id, title, body, jsDay, hour, minute, { alarm = false, data = {} } = {}) {
  return schedule(
    id,
    { title, body, sound: 'default', data, categoryIdentifier: 'actividad' },
    { type: T().WEEKLY, weekday: ((jsDay % 7) + 1), hour, minute, channelId: alarm ? CH_ALARM : CH_DEFAULT }
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

export async function notifyScheduleChange(activityNames = []) {
  if (isWeb) return;
  const body = activityNames.length > 0
    ? activityNames.slice(0, 3).join(' · ') + (activityNames.length > 3 ? ` +${activityNames.length - 3}` : '')
    : 'Tu horario fue actualizado';
  await schedule(
    'schedule_change_alert',
    { title: '📅 Horario actualizado', body, sound: 'default', categoryIdentifier: 'actividad', data: { type: 'schedule_change', names: activityNames } },
    { type: T().TIME_INTERVAL, seconds: 1, channelId: CH_ALARM }
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

export async function requestNotificationListenerPermission() {
  if (Platform.OS !== 'android') return;
  const il = IL();
  try {
    await il.startActivityAsync('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS');
  } catch (e) {
    console.log('Error al abrir ajustes de acceso a notificaciones:', e);
  }
}

function cancelLegacyNativeActivities(activities) {
  if (!FSN || !activities?.length) return;
  for (const act of activities) {
    for (let d = 0; d < 7; d++) {
      const id = `act_${d}_${act.id}`;
      try { FSN.cancelNotif(id); FSN.cancelNotif(id + '_w1'); } catch {}
    }
  }
}

export async function rescheduleAll({ habits = [], schedule: sch, activities = [], dayPlans = {} } = {}) {
  if (isWeb) return;
  await ensureChannels();
  await cancelAll();
  await cancelAllNative();
  cancelLegacyNativeActivities(activities);

  for (const hb of habits.filter((x) => x.active && x.reminder)) {
    const [h, m] = hb.reminder.split(':').map(Number);
    await scheduleDaily(`habit_${hb.id}`, `⏰ ${hb.name}`, 'Es momento de tu hábito.', h || 0, m || 0, { data: { type: 'habit', id: hb.id } });
  }

  if (!sch) { await saveScheduledIds([]); return; }

  const newIds = [];
  const now = Date.now();
  const base = new Date(); base.setHours(0, 0, 0, 0);

  for (let d = 0; d < SCHEDULE_DAYS; d++) {
    const date = new Date(base.getTime() + d * 86400000);
    const dateStr = ymd(date);
    const weekday = date.getDay();
    const placements = activityTimesForDate(sch, weekday, activities, dayPlans[dateStr]);

    placements.forEach((p, i) => {
      if (!Number.isFinite(p.start)) return;
      const dayOffset = Math.floor(p.start / 1440);
      const mins = ((p.start % 1440) + 1440) % 1440;
      const hour = Math.floor(mins / 60);
      const minute = mins % 60;
      const when = new Date(date.getFullYear(), date.getMonth(), date.getDate() + dayOffset, hour, minute, 0, 0);
      if (when.getTime() <= now + 5000) return;

      const id = `act_${dateStr}_${p.activityId}_${i}`;
      scheduleActivityAt(
        id,
        `🔔 ${p.name}`,
        'Comienza tu actividad. ¿Aceptas, pospones o rechazas?',
        { type: 'activity', id: p.activityId, name: p.name, notifId: id, hour, minute },
        when
      );
      newIds.push(id);
    });
  }

  await saveScheduledIds(newIds);
}

export async function reschedulePlan(planning, habits = []) {
  if (isWeb || !planning?.schedule) return;
  await rescheduleAll({
    habits,
    schedule: planning.schedule,
    activities: planning.activities || [],
    dayPlans: planning.dayPlans || {},
  });
}

export function startKeepAliveService() {
  if (Platform.OS !== 'android' || !FSN || !FSN.startKeepAlive) return;
  try {
    if (FSN.startKeepAlive) FSN.startKeepAlive();
  } catch (e) {}
}
