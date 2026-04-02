
import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise fallback to hardcoded values
// Note: In Vite, environment variables must be prefixed with VITE_ to be accessible on the client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tvjyskpiqzmujwfjhtcg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_e14ZXbI5JWT3Ay6V7WprVg_y-UgeGq_';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey && !supabaseAnonKey.startsWith('sb_publishable_');
};
