/**
 * Tracks the most recently focused plain <input> field (e.g. a figure's
 * width control) so toolbar actions like "insert symbol" can target it. Rich
 * contenteditable blocks (paragraphs, table cells) use execCommand and don't
 * need this; plain inputs do, because execCommand('insertHTML') doesn't work
 * in <input>.
 */
export interface ActiveField {
  el: HTMLInputElement;
  /** Called with the new value after inserting at the cursor. */
  setValue: (v: string) => void;
}

let current: ActiveField | null = null;

export function setActiveField(f: ActiveField | null) { current = f; }
export function getActiveField(): ActiveField | null {
  // Only valid if the element is still the focused one.
  if (current && document.activeElement === current.el) return current;
  return null;
}

/** Insert text at the cursor of the active plain input. Returns true if done. */
export function insertIntoActiveField(text: string): boolean {
  const f = getActiveField();
  if (!f) return false;
  const el = f.el;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const next = el.value.slice(0, start) + text + el.value.slice(end);
  f.setValue(next);
  // Restore cursor just after the inserted text on the next tick.
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + text.length;
    try { el.setSelectionRange(pos, pos); } catch { /* ignore */ }
  });
  return true;
}

/** Which table cell (contenteditable, not a plain input) currently has
 *  focus, so the toolbar's table-format menu knows which block/row/column
 *  it's acting on. Independent of ActiveField above — a contenteditable div
 *  has no `.value`/`.selectionStart`, so it can't participate in that API. */
export interface ActiveTableCell { blockId: string; row: number; col: number }

let activeCell: ActiveTableCell | null = null;

export function setActiveTableCell(c: ActiveTableCell | null) { activeCell = c; }
export function getActiveTableCell(): ActiveTableCell | null { return activeCell; }
