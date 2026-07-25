/**
 * Citation formatting. Turns cited references into in-text markers and an
 * ordered, formatted reference list according to the template's citation
 * style and ordering (sequence vs alphabetical).
 *
 * Citations live inline in paragraph text as tokens: [[cite:refId]].
 */
import type { Reference, DocumentBlock, ParagraphBlock } from '../../types/document';
import type { Template } from '../../types/compliance';

export const CITE_RE = /\[\[cite:([a-z0-9-]+)\]\]/gi;

export function citedInOrder(blocks: DocumentBlock[]): string[] {
  const seen: string[] = [];
  for (const b of blocks) {
    if (b.type !== 'paragraph') continue;
    const text = (b as ParagraphBlock).content;
    for (const m of text.matchAll(CITE_RE)) {
      const id = m[1];
      if (!seen.includes(id)) seen.push(id);
    }
  }
  return seen;
}

export function orderedReferences(
  blocks: DocumentBlock[], pool: Reference[], tpl: Template | null,
): Reference[] {
  const citedIds = citedInOrder(blocks);
  const cited = citedIds
    .map((id) => pool.find((r) => r.id === id))
    .filter((r): r is Reference => Boolean(r));
  if (tpl?.citationOrder === 'alphabetical') {
    return [...cited].sort((a, b) =>
      (a.authors[0] ?? a.title).localeCompare(b.authors[0] ?? b.title));
  }
  return cited;
}

export function markerMap(
  blocks: DocumentBlock[], pool: Reference[], tpl: Template | null,
): Map<string, string> {
  const ordered = orderedReferences(blocks, pool, tpl);
  const map = new Map<string, string>();
  const numeric = tpl?.citationStyle === 'ieee';
  ordered.forEach((r, i) => {
    if (numeric) map.set(r.id, `[${i + 1}]`);
    else {
      const first = r.authors[0]?.split(',')[0] ?? 'Ref';
      map.set(r.id, `(${first}, ${r.year ?? 'n.d.'})`);
    }
  });
  return map;
}

export function renderCitations(text: string, markers: Map<string, string>): string {
  return text.replace(CITE_RE, (_, id) => markers.get(id) ?? '[?]');
}

export function formatEntry(r: Reference, index: number, tpl: Template | null): string {
  const authors = r.authors.length ? r.authors.join(', ') : 'Unknown';
  const yr = r.year ?? 'n.d.';
  const cont = r.container ? `, ${r.container}` : '';
  const doi = r.doi ? ` https://doi.org/${r.doi}` : '';
  if (tpl?.citationStyle === 'ieee') {
    return `[${index + 1}] ${authors}, "${r.title}"${cont}, ${yr}.${doi}`;
  }
  return `${authors} (${yr}). ${r.title}${cont}.${doi}`;
}
