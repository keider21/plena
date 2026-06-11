// Exporta transacciones a CSV. Usa expo-file-system y expo-sharing.
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const escape = (v) => {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
};

export async function exportTransactionsCSV(transactions, currency) {
  if (!transactions || transactions.length === 0) throw new Error('No hay movimientos para exportar.');

  // Header + rows
  const header = ['Fecha', 'Tipo', 'Categoria', 'Nota', 'Monto', 'Moneda'];
  const lines = [header.join(',')];
  for (const t of transactions) {
    const tipo = t.type || '';
    const fecha = t.date || '';
    const cat = t.category || '';
    const nota = t.note || '';
    const monto = t.amount || 0;
    lines.push([fecha, tipo, cat, nota, monto, currency || 'PEN'].map(escape).join(','));
  }
  const csv = lines.join('\n');

  // Guardar a archivo temporal
  const filename = `vida-plena-movimientos-${new Date().toISOString().slice(0, 10)}.csv`;
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });

  // Compartir (abre el sheet de Android para elegir app: Drive, Gmail, WhatsApp, etc)
  const canShare = await Sharing.isAvailableAsync().catch(() => false);
  if (canShare) {
    await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Exportar movimientos' });
  } else {
    return path; // Devolvemos la ruta para casos sin share
  }
}
