import { createClient } from '@supabase/supabase-js';

// Prefer using environment variables. Vite env variables start with VITE_
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://svpprgzklqwsnevejihu.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_kfq79EwWoGaQd13OxcHO4Q_pLQutDkB';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
