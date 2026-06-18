// Adaptador de nube — capa agnóstica del backend.
// Hoy implementa Supabase (modelo key-value por usuario, paridad con el esquema
// anterior de Firebase users/{uid}/{key}). Mantener esta interfaz estable permite
// cambiar de backend sin tocar el resto de la app.
import { supabase } from './supabase';

async function uid() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

// Sube un bloque de datos del usuario bajo una clave (habits, finance, planning…)
export async function cloudSyncUp(key, data) {
  const id = await uid();
  if (!id) return { error: 'Sin sesión' };
  const { error } = await supabase
    .from('user_data')
    .upsert({ user_id: id, key, data }, { onConflict: 'user_id,key' });
  return { error: error?.message || null };
}

// Descarga el bloque de datos de una clave
export async function cloudSyncDown(key) {
  const id = await uid();
  if (!id) return { data: null, error: 'Sin sesión' };
  const { data, error } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', id)
    .eq('key', key)
    .maybeSingle();
  return { data: data?.data ?? null, error: error?.message || null };
}

// Descarga TODAS las claves del usuario de una sola vez
export async function cloudSyncDownAll() {
  const id = await uid();
  if (!id) return { data: null, error: 'Sin sesión' };
  const { data, error } = await supabase
    .from('user_data')
    .select('key, data')
    .eq('user_id', id);
  if (error) return { data: null, error: error.message };
  const out = {};
  (data || []).forEach((row) => { out[row.key] = row.data; });
  return { data: out, error: null };
}

export async function cloudCurrentUserId() {
  return uid();
}
