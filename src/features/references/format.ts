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
