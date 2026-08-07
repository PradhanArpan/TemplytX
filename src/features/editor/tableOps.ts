/**
 * Pure table-mutation helpers, each returning a patch to apply via
 * patchBlock(blockId, patch). Shared by TableFormatMenu (toolbar) — the
 * on-canvas table itself only renders cells now.
 */
import type { TableBlock } from '../../types/document';

function colsOf(block: TableBlock): number { return block.rows[0]?.length ?? 0; }
function alignOf(block: TableBlock): ('left' | 'center' | 'right')[] {
  return block.align ?? Array(colsOf(block)).fill('left');
}
function widthsOf(block: TableBlock): number[] {
  return block.colWidths ?? Array(colsOf(block)).fill(0);
}

/** Insert a row at index i (i can equal rows.length to append). */
export function insertRow(block: TableBlock, i: number): Partial<TableBlock> {
  const rows = [...block.rows];
  rows.splice(i, 0, Array(colsOf(block)).fill(''));
  return { rows };
}

export function deleteRow(block: TableBlock, i: number): Partial<TableBlock> {
  if (block.rows.length <= 1) return {};
  return { rows: block.rows.filter((_, ri) => ri !== i) };
}

/** Insert a column at index c. */
export function insertCol(block: TableBlock, c: number): Partial<TableBlock> {
  const rows = block.rows.map((row) => { const n = [...row]; n.splice(c, 0, ''); return n; });
  const align = [...alignOf(block)]; align.splice(c, 0, 'left');
  const colWidths = [...widthsOf(block)]; colWidths.splice(c, 0, 0);
  return { rows, align, colWidths };
}

export function deleteCol(block: TableBlock, c: number): Partial<TableBlock> {
  if (colsOf(block) <= 1) return {};
  return {
    rows: block.rows.map((row) => row.filter((_, ci) => ci !== c)),
    align: alignOf(block).filter((_, ci) => ci !== c),
    colWidths: widthsOf(block).filter((_, ci) => ci !== c),
  };
}

export function setColAlign(block: TableBlock, c: number, a: 'left' | 'center' | 'right'): Partial<TableBlock> {
  const align = [...alignOf(block)]; align[c] = a;
  return { align };
}

export function setColWidth(block: TableBlock, c: number, w: number): Partial<TableBlock> {
  const colWidths = [...widthsOf(block)]; colWidths[c] = w;
  return { colWidths };
}

export function toggleRule(block: TableBlock, key: keyof TableBlock): Partial<TableBlock> {
  return { [key]: !block[key] } as Partial<TableBlock>;
}

export function setCell(block: TableBlock, r: number, c: number, v: string): Partial<TableBlock> {
  const rows = block.rows.map((row, ri) => ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row);
  return { rows };
}
