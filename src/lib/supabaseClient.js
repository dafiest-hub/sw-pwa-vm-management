import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

/** Valores de plantilla que no deben tomarse por credenciales reales. */
const isPlaceholder = (v) =>
  !v || /tu-proyecto|tu-anon-key|your-project|<.*>|xxx/i.test(v);

export const isSupabaseConfigured =
  !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/** 'live' | 'demo' — para poder indicarlo en la interfaz. */
export const supabaseStatus = isSupabaseConfigured ? 'live' : 'demo';

if (!isSupabaseConfigured) {
  // Aviso explícito: sin esto, ver datos de ejemplo se confunde con ver datos reales.
  console.warn(
    '[supabase] Sin credenciales VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY: ' +
      'la aplicación funciona en MODO DEMOSTRACIÓN con datos de ejemplo en memoria.'
  );
}
