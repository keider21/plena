import { LogBox } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';

// Las notificaciones push remotas no funcionan en Expo Go (SDK 53+).
// Silenciamos esos avisos: la app funciona igual. Para recordatorios
// reales hay que generar un development build / APK.
LogBox.ignoreLogs([
  'expo-notifications',
  '`expo-notifications` functionality is not fully supported',
  'Push notifications (remote notifications)',
  'Android Push notifications',
]);

registerRootComponent(App);
