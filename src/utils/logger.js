import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_KEY = 'dev_logs_v1';
const MAX = 400;
let buffer = [];

function toStr(a) {
  if (typeof a === 'string') return a;
  if (a instanceof Error) return `${a.message}\n${a.stack || ''}`;
  try { return JSON.stringify(a); } catch { return String(a); }
}

function push(level, args) {
  const msg = args.map(toStr).join(' ');
  const e = { level, msg, at: new Date().toISOString() };
  buffer = [e, ...buffer].slice(0, MAX);
  AsyncStorage.setItem(LOG_KEY, JSON.stringify(buffer)).catch(() => {});
}

let installed = false;
export function installLogger() {
  if (installed) return;
  installed = true;
  const _log = console.log.bind(console);
  const _warn = console.warn.bind(console);
  const _error = console.error.bind(console);
  console.log = (...a) => { push('log', a); _log(...a); };
  console.warn = (...a) => { push('warn', a); _warn(...a); };
  console.error = (...a) => { push('error', a); _error(...a); };
  console.log('[Logger] instalado');
}

export function getBufferedLogs() {
  return buffer;
}

export async function getLogs() {
  try {
    if (buffer.length > 0) return buffer;
    const raw = await AsyncStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return buffer; }
}

export async function clearLogs() {
  buffer = [];
  try { await AsyncStorage.removeItem(LOG_KEY); } catch {}
}
