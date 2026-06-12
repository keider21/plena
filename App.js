import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { format } from 'date-fns';
import { auth } from './src/utils/firebase';
import { useStore } from './src/store/useStore';
import { setupNotifications, rescheduleAll, snooze, addResponseListener } from './src/utils/notifications';
import { placementsByDay } from './src/utils/timeOrganizer';
import { installCrashHandler, installPromiseHandler, getLastCrash } from './src/utils/crashReporter';
import CrashScreen from './src/components/CrashScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/utils/theme';

// Instalar handlers ANTES de que React monte nada
installCrashHandler();
installPromiseHandler();

export default function App() {
  const { currentUser, onboardingDone, loadFromStorage } = useStore();
  const [ready, setReady] = useState(false);
  const [lastCrash, setLastCrash] = useState(null);

  useEffect(() => {
    // Cargar último crash al inicio
    getLastCrash().then((c) => { if (c) setLastCrash(c); });

    loadFromStorage().then(async () => {
      setReady(true);
      try {
        const s = useStore.getState();
        await setupNotifications();
        await rescheduleAll({
          habits: s.habits,
          schedule: s.planning.schedule,
          activities: s.planning.activities,
          placementsByDay: s.planning.schedule ? placementsByDay(s.planning.schedule, s.planning.activities) : null,
        });
      } catch (e) { console.log('[App] Notifications init error:', e); }
    });

    // Auto-sync con Firebase cuando hay cambios
    const interval = setInterval(async () => {
      const user = auth.currentUser;
      if (user) {
        const { syncAllToFirebase } = useStore.getState();
        await syncAllToFirebase(user.uid).catch(() => {});
      }
    }, 30000); // Sync cada 30 segundos

    const sub = addResponseListener((resp) => {
      const data = resp?.notification?.request?.content?.data || {};
      const action = resp?.actionIdentifier;
      if (data.type === 'activity' && data.id) {
        const today = format(new Date(), 'yyyy-MM-dd');
        const st = useStore.getState();
        if (action === 'RECHAZAR') st.logActivity(today, data.id, { status: 'rejected', pct: 0 });
        else if (action === 'POSPONER') snooze('Actividad', 'Recordatorio pospuesto', 5, data);
        else st.logActivity(today, data.id, { status: 'done', pct: 100 });
      }
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.purple} size="large" />
      </View>
    );
  }

  // Si hay un crash guardado de la sesión anterior, mostrarlo
  if (lastCrash) {
    return <CrashScreen crash={lastCrash} onContinue={() => setLastCrash(null)} />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <NavigationContainer
            theme={{
              dark: true,
              colors: {
                primary: COLORS.purple,
                background: COLORS.bg,
                card: COLORS.bg2,
                text: COLORS.text,
                border: COLORS.border,
                notification: COLORS.purple,
              },
            }}
          >
            {!currentUser ? (
              <AuthScreen />
            ) : !onboardingDone ? (
              <OnboardingScreen />
            ) : (
              <AppNavigator />
            )}
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
