import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Questa è la funzione che useremo per interagire con il database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);