// Sistema de moneda — Soles (S/) principal, Dólares (USD) secundario.
// Formateo manual de miles para no depender de Intl (Hermes/Android puede fallar).

export const CURRENCIES = {
  PEN: { code: 'PEN', symbol: 'S/', name: 'Soles' },
  USD: { code: 'USD', symbol: '$', name: 'Dólares' },
};

export const CURRENCY_LIST = [CURRENCIES.PEN, CURRENCIES.USD];

function formatNumber(n) {
  const num = Number(n);
  if (isNaN(num)) return '0.00';
  const fixed = Math.abs(num).toFixed(2);
  const [int, dec] = fixed.split('.');
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${num < 0 ? '-' : ''}${withSep}.${dec}`;
}

// Devuelve "S/ 1,250.00"
export function formatMoney(amount, code = 'PEN') {
  const cur = CURRENCIES[code] || CURRENCIES.PEN;
  return `${cur.symbol} ${formatNumber(amount)}`;
}

// Para campos donde no quieres decimales si son enteros
export function formatMoneyShort(amount, code = 'PEN') {
  const cur = CURRENCIES[code] || CURRENCIES.PEN;
  const num = Number(amount) || 0;
  if (Number.isInteger(num)) {
    const withSep = Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${cur.symbol} ${num < 0 ? '-' : ''}${withSep}`;
  }
  return formatMoney(amount, code);
}

export function currencySymbol(code = 'PEN') {
  return (CURRENCIES[code] || CURRENCIES.PEN).symbol;
}
