// ─── NEUMORPHISM SOFT THEME ─────────────────────────────────────────────────
// Tokens centrales. Todas las pantallas importan de aquí.
// Para cambiar el look: edita solo este archivo.

export const COLORS = {
  // Fondos
  bg: '#EBE9F3',
  bg2: '#EFEDF7',
  bg3: '#E5E3EF',

  // Superficies
  card: '#EFEDF7',
  cardBorder: 'transparent',

  // Acentos
  purple: '#7C5CE6',
  purpleLight: '#9B84F4',
  purpleDim: '#E3DEFC',

  green: '#35C77B',
  greenDim: '#D4F5E5',

  blue: '#5B9BF5',
  blueDim: '#DBE9FD',

  amber: '#F5A623',
  amberDim: '#FEF0D6',

  pink: '#F4607A',
  pinkDim: '#FDE1E6',

  red: '#E63959',
  redDim: '#FDE1E6',

  indigo: '#7C5CE6',

  // Texto
  text: '#1E1C30',
  textSub: '#615E7A',
  textMuted: '#7C7990',

  // Líneas
  border: '#C8C4DD',

  white: '#FFFFFF',
};

// Sombras neumorfismo
export const NEOM = {
  card: {
    shadowColor: '#AEAAC8',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
    backgroundColor: '#EFEDF7',
    borderRadius: 22,
  },
  float: {
    shadowColor: '#AEAAC8',
    shadowOffset: { width: 7, height: 9 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: '#EFEDF7',
    borderRadius: 22,
  },
  pressed: {
    shadowColor: '#AEAAC8',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 0,
    backgroundColor: '#E4E2EF',
    borderRadius: 16,
  },
  chip: {
    shadowColor: '#AEAAC8',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
    backgroundColor: '#EFEDF7',
    borderRadius: 16,
  },
};

export const FONTS = {
  regular: { fontFamily: 'System', fontWeight: '400' },
  medium: { fontFamily: 'System', fontWeight: '500' },
  semibold: { fontFamily: 'System', fontWeight: '600' },
  bold: { fontFamily: 'System', fontWeight: '700' },
};

// Compat con código anterior que usaba SHADOW.sm / SHADOW.md
export const SHADOW = {
  sm: {
    shadowColor: '#AEAAC8',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: '#AEAAC8',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const CAT_COLORS = {
  salud: '#35C77B',
  mente: '#5B9BF5',
  finanzas: '#F5A623',
  familia: '#F4607A',
  empresa: '#7C5CE6',
  Materiales: '#7C5CE6',
  Finanzas: '#35C77B',
  Familia: '#F4607A',
  Empresa: '#F5A623',
  Aprendizaje: '#5B9BF5',
};
