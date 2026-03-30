/**
 * supabase.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Supabase client initialisation for BidZo.
 *
 * HOW TO CONNECT TO REAL SUPABASE:
 *   1. Go to https://supabase.com → your project → Settings → API
 *   2. Copy "Project URL"  →  paste as VITE_SUPABASE_URL in your .env file
 *   3. Copy "anon public"  →  paste as VITE_SUPABASE_ANON_KEY in your .env file
 *   4. Restart the dev server (`npm run dev`)
 *
 * Without credentials the app runs in "offline" mode using localStorage data.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';

// Read from Vite env (only VITE_* variables are exposed to the browser)
const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Placeholder / fallback values that mean "not configured".
 */
const UNCONFIGURED = new Set([
  undefined,
  '',
  'placeholder',
  'your-anon-public-key-here',
  'your_supabase_anon_key',
  'your_supabase_project_url',
  'https://your-project-ref.supabase.co',
]);

/**
 * Returns true only when real, non-placeholder Supabase credentials exist.
 * Called every time a network request would be made, so hot-reloads work too.
 */
export const isSupabaseConfigured = (): boolean => {
  const validUrl =
    !UNCONFIGURED.has(supabaseUrl) &&
    typeof supabaseUrl === 'string' &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co');

  const validKey =
    !UNCONFIGURED.has(supabaseKey) &&
    typeof supabaseKey === 'string' &&
    supabaseKey.length > 20;

  return validUrl && validKey;
};

/** Singleton Supabase client */
export const supabase = createClient(
  supabaseUrl  ?? 'https://placeholder.supabase.co',
  supabaseKey  ?? 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  },
);

/**
 * Quick health check — runs a lightweight query against the auctions table.
 * Returns true if the connection succeeds.
 *
 * Usage (e.g. in a dev-only banner):
 *   const ok = await testConnection();
 */
export const testConnection = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase
      .from('auctions')
      .select('id')
      .limit(1);
    return !error;
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Storage helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uploads an image to the 'auctions' Supabase storage bucket and returns its
 * public URL. Throws if the upload fails.
 */
export const uploadImage = async (file: File): Promise<string> => {
  const ext      = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('auctions')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('auctions').getPublicUrl(fileName);
  return data.publicUrl;
};
