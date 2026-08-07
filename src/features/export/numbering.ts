/**
 * Derives auto-numbering for figures, tables, and equations from block order,
 * LaTeX-style. Figures -> "Figure 1, 2…", tables -> "Table 1…",
 * equations -> "(1), (2)…" — or, in 'byChapter' style, "1.1, 1.2, 2.1…"
 * scoped to the enclosing chapter. Section numbers derived when the template
 * asks. Blocks with `unnumbered: true` are skipped entirely — they get no
 * map entry, which is what excludes them from cross-referencing (callers
 * like crossRefData/crossRefMap build their reference lists from these maps).
 */
import type { DocumentBlock } from '../../types/document';

export type NumberingStyle = 'continuous' | 'byChapter';

export interface Numbering {
  figures: Map<string, string>;
  tables: Map<string, string>;
  equations: Map<string, string>;
  sections: Map<string, string>; // blockId -> "1", "2.1", etc (flat for now)
}

export function computeNumbering(
  blocks: DocumentBlock[],
  numberSections: boolean,
  style: NumberingStyle = 'continuous',
): Numbering {
  const figures = new Map<string, string>();
  const tables = new Map<string, string>();
  const equations = new Map<string, string>();
  const sections = new Map<string, string>();

  let chapter = 0;
  let f = 0, t = 0, e = 0, s = 0; // continuous fallback counters
  let cf = 0, ct = 0, ce = 0; // per-chapter counters, reset on each chapter

  for (const b of blocks) {
    const unnumbered = (b as { unnumbered?: boolean }).unnumbered === true;

    if (b.type === 'section') {
      const lvl = (b as { level?: number }).level ?? 1;
      if (lvl <= 1 && !unnumbered) { chapter++; cf = 0; ct = 0; ce = 0; }
      if (numberSections && !unnumbered) sections.set(b.id, String(++s));
      continue;
    }
    if (unnumbered) continue;

    // Once inside a chapter, byChapter scopes the counter to it; content
    // before any chapter (chapter === 0) falls back to a plain running count
    // rather than a "0.N" prefix, which would read as a bug in-app.
    if (b.type === 'figure') {
      figures.set(b.id, style === 'byChapter' && chapter > 0 ? `${chapter}.${++cf}` : String(++f));
    } else if (b.type === 'table') {
      tables.set(b.id, style === 'byChapter' && chapter > 0 ? `${chapter}.${++ct}` : String(++t));
    } else if (b.type === 'equation') {
      equations.set(b.id, style === 'byChapter' && chapter > 0 ? `${chapter}.${++ce}` : String(++e));
    }
  }
  return { figures, tables, equations, sections };
}
