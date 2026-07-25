/**
 * Reference pool — account-level library (session-mock now; backend-durable
 * when accounts land). Supports adding by DOI (Crossref auto-fetch), by
 * BibTeX paste, or by manual entry. Generates BibTeX for export.
 */
import type { Reference } from '../types/document';

// --- session-level pool (resets on hard refresh; persists across nav) --------
const pool: Reference[] = [
  {
    id: 'ref-seed-1',
    title: 'River meanders and the theory of minimum variance',
    authors: ['Leopold, L. B.', 'Langbein, W. B.'],
    year: 1966,
    container: 'US Geological Survey Professional Paper',
    doi: '10.3133/pp422H',
    cslJson: {},
  },
];

export async function listReferences(): Promise<Reference[]> {
  return [...pool];
}

/** Synchronous accessor for the exporters (which run synchronously). */
export function listReferencesSync(): Reference[] {
  return [...pool];
}

export function addReference(ref: Omit<Reference, 'id'>): Reference {
  const r: Reference = { ...ref, id: `ref-${crypto.randomUUID()}` };
  pool.unshift(r);
  return r;
}

export function removeReference(id: string) {
  const i = pool.findIndex((r) => r.id === id);
  if (i !== -1) pool.splice(i, 1);
}

// --- DOI auto-fetch via Crossref (public, no key) ----------------------------
export async function fetchByDoi(doiRaw: string): Promise<Omit<Reference, 'id'>> {
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
export function parseBibtex(src: string): Omit<Reference, 'id'> {
  const field = (name: string) => {
    const re = new RegExp(`${name}\\s*=\\s*[{"]([^}"]*)[}"]`, 'i');
    return src.match(re)?.[1]?.trim();
  };
  const authorsRaw = field('author') ?? '';
  const authors = authorsRaw ? authorsRaw.split(/\s+and\s+/).map((a) => a.trim()) : [];
  const y = field('year');
  return {
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
function citeKey(r: Reference): string {
  const first = r.authors[0]?.split(',')[0]?.replace(/\W/g, '') ?? 'ref';
  return `${first}${r.year ?? ''}`;
}

export function toBibtex(refs: Reference[]): string {
  return refs.map((r) => {
    const key = citeKey(r);
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
