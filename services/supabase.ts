
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tvjyskpiqzmujwfjhtcg.supabase.co';
const supabaseAnonKey = 'sb_publishable_e14ZXbI5JWT3Ay6V7WprVg_y-UgeGq_';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};
