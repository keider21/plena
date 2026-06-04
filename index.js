import { Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';

// LogBox no existe en react-native-web; lo usamos solo en móvil.
// Silenciamos los avisos de expo-notifications (push remoto no va en Expo Go).
if (Platform.OS !== 'web') {
  const { LogBox } = require('react-native');
  if (LogBox && LogBox.ignoreLogs) {
    LogBox.ignoreLogs([
      'expo-notifications',
      '`expo-notifications` functionality is not fully supported',
      'Push notifications (remote notifications)',
      'Android Push notifications',
    ]);
  }
}

registerRootComponent(App);
