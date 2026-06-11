import { useStore } from '../store/useStore';
import { COLORS as DARK } from './theme';

const LIGHT = {
  bg: '#F7F7FB',
  bg2: '#FFFFFF',
  bg3: '#EFEFF5',
  card: '#FFFFFF',
  cardBorder: '#E2E2EA',
  purple: '#7C3AED',
  purpleLight: '#7C3AED',
  purpleDim: '#EDE9FE',
  green: '#059669',
  greenDim: '#D1FAE5',
  blue: '#0284C7',
  blueDim: '#DBEAFE',
  amber: '#D97706',
  amberDim: '#FEF3C7',
  pink: '#DB2777',
  pinkDim: '#FCE7F3',
  red: '#DC2626',
  redDim: '#FEE2E2',
  indigo: '#4F46E5',
  text: '#1F1F2E',
  textSub: '#5C5C70',
  textMuted: '#9A9AAE',
  border: '#E5E5EE',
  white: '#FFFFFF',
};

// Hook que devuelve los COLORS según el modo del store.
// Si el modo no es 'light', devuelve los dark.
export function useColors() {
  const mode = useStore((s) => s.settings?.themeMode || 'dark');
  return mode === 'light' ? LIGHT : DARK;
}

export { LIGHT, DARK };
