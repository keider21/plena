// Logger debe ser lo primero — captura todos los console.log desde el inicio
import { installLogger } from './src/utils/logger';
installLogger();

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { format } from 'date-fns';
import { auth, checkLatestVersion, initializeGoogleSignIn } from './src/utils/firebase';
import { supabase } from './src/utils/supabase';
import { useStore } from './src/store/useStore';
import { Alert } from 'react-native';
import { setupNotifications, reschedulePlan, snooze, addResponseListener, startKeepAliveService } from './src/utils/notifications';
import { installCrashHandler, installPromiseHandler, getLastCrash } from './src/utils/crashReporter';
import CrashScreen from './src/components/CrashScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AppNavigator from './src/navigation/AppNavigator';
import PaymentBanner from './src/components/PaymentBanner';
import { COLORS } from './src/utils/theme';

// Instalar handlers ANTES de que React monte nada
console.log('[App] instalando crash handler...');
installCrashHandler();
installPromiseHandler();
console.log('[App] inicializando Google Sign-In...');
initializeGoogleSignIn();
console.log('[App] módulos inicializados');

export default function App() {
  const { currentUser, onboardingDone, loadFromStorage } = useStore();
  const [ready, setReady] = useState(false);
  const [lastCrash, setLastCrash] = useState(null);

  useEffect(() => {
    // Cargar último crash al inicio
    getLastCrash().then((c) => { if (c) setLastCrash(c); });

    console.log('[App] cargando storage...');
    loadFromStorage().then(async () => {
      console.log('[App] storage cargado, iniciando notificaciones...');
      setReady(true);
      try {
        const s = useStore.getState();
        await setupNotifications();
        startKeepAliveService(); // mantiene la app viva (anti force-stop en Honor/Huawei)
        await reschedulePlan(s.planning, s.habits);
      } catch (e) { console.error('[App] Notifications init error:', e); }

      // Check for app updates
      try {
        const { version: latestVersion } = await checkLatestVersion();
        const currentVersion = '1.0.0'; // Update this with your version
        if (latestVersion && latestVersion > currentVersion) {
          Alert.alert(
            '📲 Actualización disponible',
            `Versión ${latestVersion} está disponible.\n\n¿Descargar e instalar?`,
            [
              { text: 'No', style: 'cancel' },
              {
                text: 'Sí, actualizar',
                onPress: () => {
                  Alert.alert('Descargando...', 'El APK se descargará pronto. Abre manualmente el archivo descargado para instalar.');
                }
              }
            ]
          );
        }
      } catch (e) { console.log('[App] Version check error:', e); }
    });

    // Auto-sync con Supabase cuando hay sesión (cada 5 min para ahorro de batería y rendimiento)
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.auth.getSession();
        // Solo sincronizar si la app está siendo usada (no bloquear hilos críticos)
        if (data?.session) {
          console.log('[App] Iniciando sync en segundo plano...');
          useStore.getState().syncAllToCloud().catch(() => {});
        }
      } catch (e) {}
    }, 300000); // 5 minutos

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
              <>
              <AppNavigator />
              <PaymentBanner />
            </>
            )}
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
