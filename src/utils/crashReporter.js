// Captura global de errores no atrapados.
// Guarda el último error en AsyncStorage para que la proxima vez
// que abras la app te lo muestre en pantalla (no en consola).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const KEY = 'last_crash_v1';

export async function getLastCrash() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function clearLastCrash() {
  try { await AsyncStorage.removeItem(KEY); } catch {}
}

export async function reportCrash(err, isFatal = true) {
  try {
    const payload = {
      message: String(err?.message || err),
      stack: String(err?.stack || ''),
      isFatal: !!isFatal,
      at: new Date().toISOString(),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  } catch {}
}

// Handler global de errores JS no atrapados.
// Lo instalamos UNA sola vez desde App.js con installCrashHandler().
let installed = false;
let originalHandler = null;
export function installCrashHandler() {
  if (installed) return;
  installed = true;
  if (typeof global !== 'undefined' && global.ErrorUtils) {
    originalHandler = global.ErrorUtils.getGlobalHandler();
    global.ErrorUtils.setGlobalHandler(async (err, isFatal) => {
      await reportCrash(err, isFatal);
      // Llamamos al handler original (que normalmente crashea la app)
      if (originalHandler) originalHandler(err, isFatal);
    });
  }
}

// Captura promesas rechazadas sin handler (no rompe por si sola, pero queda registrada)
export function installPromiseHandler() {
  if (typeof global !== 'undefined' && global.HermesInternal) {
    global.HermesInternal.enablePromiseRejectionTracker?.({
      allRejections: true,
      onUnhandled: (id, err) => { reportCrash(err || new Error('Unhandled rejection ' + id), false); },
    });
  }
}
