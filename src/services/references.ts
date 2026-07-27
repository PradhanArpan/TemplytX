/**
 * Reference pool — account-level library. Persists to Supabase when logged in
 * (durable, Mendeley-style), else session-only. Keeps an in-memory cache so
 * the synchronous exporters keep working; the cache is a write-through mirror
 * of the database.
 */
import type { Reference } from '../types/document';
import { supabase, SUPABASE_READY } from '../lib/supabase';

export interface Label { id: string; name: string; }
/** @deprecated use Label */
export type ReferenceFolder = Label;

// In-memory caches (mirror of DB when logged in).
let folders: Label[] = [];
// In-memory label links (labelId -> Set of referenceIds) for mock mode.
const labelLinks = new Map<string, Set<string>>();

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

// --- labels (account-wide tags; many-to-many with references) ---------------
export async function listLabels(): Promise<Label[]> {
  const u = await uid();
  if (!u || !supabase) return [...folders];
  const { data, error } = await supabase
    .from('reference_folders').select('id, name').order('created_at');
  if (error) throw error;
  folders = (data ?? []) as Label[];
  return [...folders];
}

export async function createLabel(name: string): Promise<Label> {
  const u = await uid();
  if (!u || !supabase) {
    const f = { id: `label-${crypto.randomUUID()}`, name };
    folders.push(f);
    return f;
  }
  const { data, error } = await supabase
    .from('reference_folders').insert({ owner_id: u, name }).select('id, name').single();
  if (error) throw error;
  const f = data as Label;
  folders.push(f);
  return f;
}

/** Toggle a label on a reference (add if absent, remove if present). */
export async function toggleLabel(referenceId: string, labelId: string): Promise<void> {
  const u = await uid();
  if (!u || !supabase) {
    const set = labelLinks.get(labelId) ?? new Set<string>();
    if (set.has(referenceId)) set.delete(referenceId); else set.add(referenceId);
    labelLinks.set(labelId, set);
    return;
  }
  const { data } = await supabase.from('reference_label_links')
    .select('reference_id').eq('reference_id', referenceId).eq('label_id', labelId).maybeSingle();
  if (data) {
    await supabase.from('reference_label_links').delete()
      .eq('reference_id', referenceId).eq('label_id', labelId);
  } else {
    await supabase.from('reference_label_links')
      .insert({ reference_id: referenceId, label_id: labelId, owner_id: u });
  }
}

/** The label ids currently attached to a reference. */
export async function labelsForReference(referenceId: string): Promise<string[]> {
  const u = await uid();
  if (!u || !supabase) {
    const ids: string[] = [];
    labelLinks.forEach((set, labelId) => { if (set.has(referenceId)) ids.push(labelId); });
    return ids;
  }
  const { data, error } = await supabase.from('reference_label_links')
    .select('label_id').eq('reference_id', referenceId);
  if (error) throw error;
  return (data ?? []).map((r: { label_id: string }) => r.label_id);
}

/** All references (from the whole account pool) carrying ANY of these labels. */
export async function referencesByLabels(labelIds: string[]): Promise<Reference[]> {
  if (labelIds.length === 0) return [];
  const all = await loadReferences();
  const u = await uid();
  if (!u || !supabase) {
    const wanted = new Set<string>();
    labelIds.forEach((lid) => labelLinks.get(lid)?.forEach((rid) => wanted.add(rid)));
    return all.filter((r) => wanted.has(r.id));
  }
  const { data, error } = await supabase.from('reference_label_links')
    .select('reference_id').in('label_id', labelIds);
  if (error) throw error;
  const wanted = new Set((data ?? []).map((r: { reference_id: string }) => r.reference_id));
  return all.filter((r) => wanted.has(r.id));
}

// --- per-document reference working set --------------------------------------
// A new document starts empty; references join when cited or pulled in.
const docRefs = new Map<string, Set<string>>(); // mock-mode cache

export async function listDocumentReferences(documentId: string): Promise<Reference[]> {
  const all = await loadReferences();
  const u = await uid();
  if (!u || !supabase) {
    const set = docRefs.get(documentId) ?? new Set<string>();
    return all.filter((r) => set.has(r.id));
  }
  const { data, error } = await supabase.from('document_references')
    .select('reference_id').eq('document_id', documentId);
  if (error) throw error;
  const set = new Set((data ?? []).map((r: { reference_id: string }) => r.reference_id));
  return all.filter((r) => set.has(r.id));
}

export async function addReferenceToDocument(documentId: string, referenceId: string): Promise<void> {
  const u = await uid();
  if (!u || !supabase) {
    const set = docRefs.get(documentId) ?? new Set<string>();
    set.add(referenceId); docRefs.set(documentId, set);
    return;
  }
  await supabase.from('document_references')
    .upsert({ document_id: documentId, reference_id: referenceId, owner_id: u });
}

export async function removeReferenceFromDocument(documentId: string, referenceId: string): Promise<void> {
  const u = await uid();
  if (!u || !supabase) {
    docRefs.get(documentId)?.delete(referenceId);
    return;
  }
  await supabase.from('document_references').delete()
    .eq('document_id', documentId).eq('reference_id', referenceId);
}

// Back-compat aliases (old names used elsewhere).
export const listFolders = listLabels;
export const createFolder = createLabel;
