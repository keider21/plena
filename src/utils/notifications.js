import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

export async function scheduleHabitReminder(habitId, habitName, timeStr) {
  // Cancel existing
  await cancelHabitReminder(habitId);

  const [hour, minute] = timeStr.split(':').map(Number);

  await Notifications.scheduleNotificationAsync({
    identifier: `habit_${habitId}`,
    content: {
      title: `⏰ Hora de: ${habitName}`,
      body: 'Mantén tu racha. ¡Tú puedes!',
      data: { habitId },
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    },
  });
}

export async function cancelHabitReminder(habitId) {
  await Notifications.cancelScheduledNotificationAsync(`habit_${habitId}`).catch(() => {});
}

export async function sendTestNotification(habitName) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `✅ ${habitName}`,
      body: '¡Recordatorio de prueba activado!',
    },
    trigger: { seconds: 2 },
  });
}
