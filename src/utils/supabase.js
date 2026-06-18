// Cliente Supabase. SOLO usa la publishable (anon) key — segura en cliente,
// protegida por Row Level Security. NUNCA pongas aquí la secret/service_role key.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://thvcxowhhxsgqgxpzhfc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nlI7iqr0n49Cgnw_7Ygsjw_vaHsDujB';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
