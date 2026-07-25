/**
 * Derives auto-numbering for figures, tables, and equations from block order,
 * LaTeX-style. Figures -> "Figure 1, 2…", tables -> "Table 1…",
 * equations -> "(1), (2)…". Section numbers derived when the template asks.
 */
import type { DocumentBlock } from '../../types/document';

export interface Numbering {
  figures: Map<string, number>;
  tables: Map<string, number>;
  equations: Map<string, number>;
  sections: Map<string, string>; // blockId -> "1", "2.1", etc (flat for now)
}

export function computeNumbering(blocks: DocumentBlock[], numberSections: boolean): Numbering {
  const figures = new Map<string, number>();
  const tables = new Map<string, number>();
  const equations = new Map<string, number>();
  const sections = new Map<string, string>();
  let f = 0, t = 0, e = 0, s = 0;
  for (const b of blocks) {
    if (b.type === 'figure') figures.set(b.id, ++f);
    else if (b.type === 'table') tables.set(b.id, ++t);
    else if (b.type === 'equation') equations.set(b.id, ++e);
    else if (b.type === 'section' && numberSections) sections.set(b.id, String(++s));
  }
  return { figures, tables, equations, sections };
}
