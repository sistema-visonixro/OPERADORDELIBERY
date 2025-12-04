import { createClient } from '@supabase/supabase-js';

// For server usage you typically need a service role key. Using the publishable key
// on the server limits some operations. It's recommended to set SUPABASE_SERVICE_KEY
// in your environment for full privileges.
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://svpprgzklqwsnevejihu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY ?? 'sb_publishable_kfq79EwWoGaQd13OxcHO4Q_pLQutDkB';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

export default supabase;
