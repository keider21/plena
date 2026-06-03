import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useStore } from './src/store/useStore';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/utils/theme';

export default function App() {
  const { currentUser, onboardingDone, loadFromStorage } = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadFromStorage().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.purple} size="large" />
      </View>
    );
  }

  return (
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
  );
}
