import { createClient } from "@supabase/supabase-js";

// Prefer using environment variables. Vite env variables start with VITE_
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ??
  "https://jqhiubituqmwouaszjpc.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "sb_publishable_yk9cpugGvHpx_0Ys8hKEsw_h8NH14CR";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;

// Debugging aid: in development, print which URL and whether env vars are present.
if (import.meta.env.DEV) {
  try {
    const hasUrl = Boolean(import.meta.env.VITE_SUPABASE_URL);
    const hasKey = Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
    // don't log full anon key to avoid accidental exposure
    const maskedKey =
      (import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY)
        .toString()
        .slice(0, 8) + "...";
    // eslint-disable-next-line no-console
    console.debug(
      "[supabase] URL:",
      SUPABASE_URL,
      "envVarPresent:",
      hasUrl,
      "keyPresent:",
      hasKey,
      "keySample:",
      maskedKey
    );
  } catch (e) {
    // ignore
  }
}
