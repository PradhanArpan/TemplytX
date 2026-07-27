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

/** "Bare" marker (no brackets/parens) per id, for grouping adjacent cites. */
export function bareMarkerMap(
  blocks: DocumentBlock[], pool: Reference[], tpl: Template | null,
): Map<string, string> {
  const ordered = orderedReferences(blocks, pool, tpl);
  const map = new Map<string, string>();
  const numeric = tpl?.citationStyle === 'ieee';
  ordered.forEach((r, i) => {
    if (numeric) map.set(r.id, String(i + 1));
    else {
      const first = r.authors[0]?.split(',')[0] ?? 'Ref';
      map.set(r.id, `${first}, ${r.year ?? 'n.d.'}`);
    }
  });
  return map;
}

/**
 * Render citations, MERGING runs of adjacent [[cite:id]] tokens into one
 * grouped marker: APA -> (A, 2025; B, 2013); IEEE -> [1, 2, 3]. Non-adjacent
 * citations stay separate.
 */
export function renderCitationsGrouped(
  text: string, bare: Map<string, string>, numeric: boolean,
): string {
  // Match a run of one-or-more citation tokens allowing only whitespace
  // between them (so "cited together" merges, but tokens with words between
  // them do not).
  const RUN = /(?:\[\[cite:[a-z0-9-]+\]\]\s*)+/gi;
  return text.replace(RUN, (run) => {
    const ids = [...run.matchAll(CITE_RE)].map((m) => m[1]);
    const parts = ids.map((id) => bare.get(id) ?? '?');
    const open = numeric ? '[' : '(';
    const close = numeric ? ']' : ')';
    const sep = numeric ? ', ' : '; ';
    return `${open}${parts.join(sep)}${close}`;
  });
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

/**
 * Sanitize rich-text paragraph HTML for export/consistency: keep only
 * semantic inline tags (b/strong, i/em, sup, sub) and citation markers;
 * strip inline styles, fonts, colours, classes, and any block wrappers.
 * This guarantees every paragraph renders identically — formatting comes
 * ONLY from the template at export, never from how the text was typed.
 */
export function sanitizeInlineHtml(html: string): string {
  if (typeof document === 'undefined') {
    // Node fallback: strip all tags except the allowed inline set.
    return html.replace(/<(?!\/?(b|strong|i|em|sup|sub)\b)[^>]*>/gi, '');
  }
  const src = document.createElement('div');
  src.innerHTML = html;
  const allowed = new Set(['B', 'STRONG', 'I', 'EM', 'SUP', 'SUB']);
  const out = document.createElement('div');

  const walk = (node: Node, parent: HTMLElement) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        parent.appendChild(document.createTextNode(child.textContent ?? ''));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (allowed.has(el.tagName)) {
          const clean = document.createElement(el.tagName.toLowerCase());
          parent.appendChild(clean);
          walk(el, clean);
        } else {
          // Unwrap disallowed elements (divs, spans, fonts) but keep contents.
          walk(el, parent);
        }
      }
    });
  };
  walk(src, out);
  return out.innerHTML;
}

// --- cross-references to figures / tables / equations ------------------------
import { computeNumbering } from '../export/numbering';

export const REF_RE = /\[\[ref:([a-z0-9-]+)\]\]/gi;

/** Map of blockId -> in-text label ("Fig. 2", "Table 1", "Eq. (3)"). */
export function crossRefMap(blocks: DocumentBlock[]): Map<string, string> {
  const num = computeNumbering(blocks, false);
  const map = new Map<string, string>();
  num.figures.forEach((n, id) => map.set(id, `Fig. ${n}`));
  num.tables.forEach((n, id) => map.set(id, `Table ${n}`));
  num.equations.forEach((n, id) => map.set(id, `Eq. (${n})`));
  return map;
}

/** Replace [[ref:id]] tokens with their label. */
export function renderCrossRefs(text: string, labels: Map<string, string>): string {
  return text.replace(REF_RE, (_, id) => labels.get(id) ?? 'Ref. ?');
}
