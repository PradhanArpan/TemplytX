/**
 * Supabase client — reads config from Vite env vars (.env locally, Vercel
 * env in production). SUPABASE_READY is false if keys are missing, letting
 * the app fall back to session-mock so it never hard-crashes.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const SUPABASE_READY = Boolean(url && anonKey);

export const supabase: SupabaseClient | null =
  SUPABASE_READY ? createClient(url!, anonKey!) : null;
