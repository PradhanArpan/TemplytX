/**
 * Reference pool — account-level library. Persists to Supabase when logged in
 * (durable, Mendeley-style), else session-only. Keeps an in-memory cache so
 * the synchronous exporters keep working; the cache is a write-through mirror
 * of the database.
 */
import type { Reference } from '../types/document';
import { supabase, SUPABASE_READY } from '../lib/supabase';

export interface ReferenceFolder { id: string; name: string; }

// In-memory caches (mirror of DB when logged in).
let folders: ReferenceFolder[] = [];

// In-memory cache (mirror of DB when logged in; the whole pool when not).
let pool: Reference[] = [
  {
    id: 'ref-seed-1',
    citeKey: 'leopold1966',
    title: 'River meanders and the theory of minimum variance',
    authors: ['Leopold, L. B.', 'Langbein, W. B.'],
    year: 1966,
    container: 'US Geological Survey Professional Paper',
    doi: '10.3133/pp422H',
    cslJson: {},
  },
];

/** Generate a clean, unique BibTeX-style key from author surname + year. */
function makeCiteKey(authors: string[], year: number | null, existing: Reference[]): string {
  const surname = (authors[0]?.split(',')[0] ?? 'ref')
    .toLowerCase().replace(/[^a-z]/g, '') || 'ref';
  const base = `${surname}${year ?? ''}`;
  let key = base; let n = 0;
  const taken = new Set(existing.map((r) => r.citeKey));
  while (taken.has(key)) { n++; key = `${base}${String.fromCharCode(96 + n)}`; }
  return key;
}

async function uid(): Promise<string | null> {
  if (!SUPABASE_READY || !supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Load the pool from Supabase into the cache (call on login / editor open). */
export async function loadReferences(): Promise<Reference[]> {
  const u = await uid();
  if (!u || !supabase) return [...pool];
  const { data, error } = await supabase
    .from('reference_pool').select('id, data').order('created_at', { ascending: false });
  if (error) throw error;
  pool = (data ?? []).map((row: { id: string; data: Reference }) => ({ ...row.data, id: row.id }));
  return [...pool];
}

export async function listReferences(): Promise<Reference[]> {
  return loadReferences();
}

/** Synchronous accessor for the exporters (reads the cache). */
export function listReferencesSync(): Reference[] {
  return [...pool];
}

export async function addReference(
  ref: Omit<Reference, 'id' | 'citeKey'> & { citeKey?: string },
): Promise<Reference> {
  // Ensure a clean, unique cite key (use provided BibTeX key, else generate).
  let citeKey = (ref.citeKey ?? '').trim().replace(/[^A-Za-z0-9]/g, '');
  const taken = new Set(pool.map((r) => r.citeKey));
  if (!citeKey || taken.has(citeKey)) {
    citeKey = makeCiteKey(ref.authors, ref.year, pool);
  }
  const withKey = { ...ref, citeKey };

  const u = await uid();
  if (!u || !supabase) {
    const r: Reference = { ...withKey, id: `ref-${crypto.randomUUID()}` };
    pool.unshift(r);
    return r;
  }
  const { data, error } = await supabase
    .from('reference_pool').insert({ owner_id: u, data: withKey }).select('id, data').single();
  if (error) throw error;
  const r: Reference = { ...(data.data as Reference), id: data.id };
  pool.unshift(r);
  return r;
}

export async function removeReference(id: string): Promise<void> {
  const i = pool.findIndex((r) => r.id === id);
  if (i !== -1) pool.splice(i, 1);
  const u = await uid();
  if (u && supabase) {
    const { error } = await supabase.from('reference_pool').delete().eq('id', id);
    if (error) throw error;
  }
}

// --- DOI auto-fetch via Crossref (public, no key) ----------------------------
export async function fetchByDoi(doiRaw: string): Promise<Omit<Reference, 'id' | 'citeKey'>> {
  const doi = doiRaw.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  if (!res.ok) throw new Error('DOI not found');
  const data = await res.json();
  const m = data.message;
  const authors: string[] = (m.author ?? []).map((a: { family?: string; given?: string }) =>
    [a.family, a.given].filter(Boolean).join(', '));
  const year: number | null =
    m.issued?.['date-parts']?.[0]?.[0] ?? m.created?.['date-parts']?.[0]?.[0] ?? null;
  return {
    title: Array.isArray(m.title) ? m.title[0] : (m.title ?? 'Untitled'),
    authors,
    year,
    container: Array.isArray(m['container-title']) ? m['container-title'][0] : m['container-title'],
    doi,
    url: m.URL,
    cslJson: m,
  };
}

// --- minimal BibTeX parse (one entry, common fields) -------------------------
export function parseBibtex(src: string): Omit<Reference, 'id' | 'citeKey'> & { citeKey?: string } {
  const field = (name: string) => {
    const re = new RegExp(`${name}\\s*=\\s*[{"]([^}"]*)[}"]`, 'i');
    return src.match(re)?.[1]?.trim();
  };
  const authorsRaw = field('author') ?? '';
  const authors = authorsRaw ? authorsRaw.split(/\s+and\s+/).map((a) => a.trim()) : [];
  const y = field('year');
  const keyMatch = src.match(/@\w+\s*\{\s*([^,\s]+)/);
  return {
    citeKey: keyMatch?.[1],
    title: field('title') ?? 'Untitled',
    authors,
    year: y ? parseInt(y, 10) : null,
    container: field('journal') ?? field('booktitle'),
    doi: field('doi'),
    url: field('url'),
    cslJson: {},
  };
}

// --- BibTeX generation for export --------------------------------------------
export function toBibtex(refs: Reference[]): string {
  return refs.map((r) => {
    const key = r.citeKey;
    const lines = [
      `  title = {${r.title}}`,
      r.authors.length ? `  author = {${r.authors.join(' and ')}}` : null,
      r.year ? `  year = {${r.year}}` : null,
      r.container ? `  journal = {${r.container}}` : null,
      r.doi ? `  doi = {${r.doi}}` : null,
      r.url ? `  url = {${r.url}}` : null,
    ].filter(Boolean).join(',\n');
    return `@article{${key},\n${lines}\n}`;
  }).join('\n\n');
}

// --- folders -----------------------------------------------------------------
export async function listFolders(): Promise<ReferenceFolder[]> {
  const u = await uid();
  if (!u || !supabase) return [...folders];
  const { data, error } = await supabase
    .from('reference_folders').select('id, name').order('created_at');
  if (error) throw error;
  folders = (data ?? []) as ReferenceFolder[];
  return [...folders];
}

export async function createFolder(name: string): Promise<ReferenceFolder> {
  const u = await uid();
  if (!u || !supabase) {
    const f = { id: `fold-${crypto.randomUUID()}`, name };
    folders.push(f);
    return f;
  }
  const { data, error } = await supabase
    .from('reference_folders').insert({ owner_id: u, name }).select('id, name').single();
  if (error) throw error;
  const f = data as ReferenceFolder;
  folders.push(f);
  return f;
}
