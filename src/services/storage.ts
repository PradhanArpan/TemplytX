/**
 * Image storage — uploads figure images to the Supabase `figures` bucket and
 * returns a public URL. Falls back gracefully when Supabase isn't configured.
 */
import { supabase, SUPABASE_READY } from '../lib/supabase';

export const STORAGE_READY = SUPABASE_READY;

/** Upload an image file; returns its public URL. Throws on failure. */
export async function uploadImage(file: File): Promise<string> {
  if (!supabase) throw new Error('Storage not configured');
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? 'anon';
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('figures').upload(path, file, {
    cacheControl: '3600', upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('figures').getPublicUrl(path);
  return data.publicUrl;
}

/** Basic client-side validation before upload. */
export function validateImage(file: File): string | null {
  const name = file.name.toLowerCase();
  if (name.endsWith('.eps') || file.type === 'application/postscript') {
    return 'EPS can\'t display in browsers/PDF. Export your figure as SVG (vector) or PNG instead.';
  }
  if (!file.type.startsWith('image/')) return 'Please choose an image (PNG, JPG, SVG, GIF, or WebP).';
  if (file.size > 5 * 1024 * 1024) return 'Image must be under 5 MB.';
  return null;
}
