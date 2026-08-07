/**
 * Toolbar dropdown for table formatting — row/column insert-delete, column
 * align/width, and whole-table rule toggles. Acts on whichever table cell was
 * focused when the menu was opened.
 *
 * The target {blockId,row,col} is snapshotted into `openTarget` at open time
 * rather than read live from `activeCell` on every render: focusing the width
 * <input> inside this dropdown (it needs real focus to be typable) would
 * otherwise null out the live "active table cell" and unmount the menu out
 * from under the user. `blocks` itself is still read live, so toggled rules /
 * inserted rows still show up immediately — only *which* cell we're acting on
 * is frozen for the life of the open menu.
 */
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Table2 } from 'lucide-react';
import type { DocumentBlock, TableBlock } from '../../types/document';
import * as tableOps from './tableOps';
import { useClickOutside } from './useClickOutside';

export function TableFormatMenu({ blocks, activeCell, patchBlock }: {
  blocks: DocumentBlock[];
  activeCell: { blockId: string; row: number; col: number } | null;
  patchBlock: (blockId: string, patch: Partial<DocumentBlock>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [openTarget, setOpenTarget] = useState<{ blockId: string; row: number; col: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useClickOutside(open, [trigger, menuRef], () => setOpen(false));

  const disabled = !activeCell;

  function toggle() {
    if (disabled) return;
    setOpen((v) => {
      const next = !v;
      if (next && trigger.current) {
        const rect = trigger.current.getBoundingClientRect();
        setPos({ top: rect.bottom + 4, left: rect.left });
        setOpenTarget(activeCell);
      }
      return next;
    });
  }

  const block = openTarget ? blocks.find((b) => b.id === openTarget.blockId && b.type === 'table') as TableBlock | undefined : undefined;

  function patch(p: Partial<TableBlock>) {
    if (!openTarget) return;
    patchBlock(openTarget.blockId, p as Partial<DocumentBlock>);
  }

  const cols = block ? (block.rows[0]?.length ?? 0) : 0;
  const align = block ? (block.align ?? Array(cols).fill('left')) : [];
  const widths = block ? (block.colWidths ?? Array(cols).fill(0)) : [];
  const r = openTarget?.row ?? 0;
  const c = openTarget?.col ?? 0;

  const btn = 'min-h-8 text-[12px] font-medium px-2.5 py-1.5 border border-[var(--color-border)] rounded-[var(--radius)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer flex items-center gap-1.5 shadow-[var(--shadow-card)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-raised)] transition-colors disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]';
  const groupLabel = 'text-[10px] uppercase tracking-[0.06em] text-[var(--color-faint)] font-semibold mb-1';
  const ctrlBtn = 'text-[11px] px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer transition-colors';
  const activeBtn = 'text-[11px] px-2 py-1 rounded border border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)] cursor-pointer';

  return (
    <div className="relative">
      <button ref={trigger} type="button" disabled={disabled} title={disabled ? 'Click a table cell to format it' : 'Table formatting'}
        onMouseDown={(e) => e.preventDefault()} onClick={toggle}
        aria-haspopup="menu" aria-expanded={open} aria-controls="editor-table-menu" className={btn}>
        <Table2 size={14} /> Table <span className="text-[var(--color-faint)]">▾</span>
      </button>

      {open && pos && block && openTarget && createPortal(
        <div ref={menuRef} id="editor-table-menu" role="menu"
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1000 }}
          className="w-[270px] p-3 flex flex-col gap-3 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)]">
          <div>
            <div className={groupLabel}>Row {r + 1}</div>
            <div className="flex flex-wrap gap-1">
              <button className={ctrlBtn} onClick={() => patch(tableOps.insertRow(block, r))}>Insert above</button>
              <button className={ctrlBtn} onClick={() => patch(tableOps.insertRow(block, r + 1))}>Insert below</button>
              <button className={ctrlBtn} onClick={() => patch(tableOps.deleteRow(block, r))}>Delete row</button>
            </div>
          </div>

          <div>
            <div className={groupLabel}>Column {c + 1}</div>
            <div className="flex flex-wrap gap-1 mb-1.5">
              <button className={ctrlBtn} onClick={() => patch(tableOps.insertCol(block, c))}>Insert left</button>
              <button className={ctrlBtn} onClick={() => patch(tableOps.insertCol(block, c + 1))}>Insert right</button>
              <button className={ctrlBtn} onClick={() => patch(tableOps.deleteCol(block, c))}>Delete col</button>
            </div>
            <div className="flex items-center gap-1">
              {(['left', 'center', 'right'] as const).map((a) => (
                <button key={a} className={align[c] === a ? activeBtn : ctrlBtn}
                  onClick={() => patch(tableOps.setColAlign(block, c, a))}>{a[0].toUpperCase() + a.slice(1)}</button>
              ))}
              <label className="flex items-center gap-1 ml-auto text-[11px] text-[var(--color-muted)]">
                width
                <input type="number" min={0} max={100} value={widths[c] || ''} placeholder="auto"
                  onChange={(e) => patch(tableOps.setColWidth(block, c, parseInt(e.target.value, 10) || 0))}
                  className="w-12 text-[11px] px-1 py-0.5 border border-[var(--color-border)] rounded text-center bg-[var(--color-surface)] outline-none" />
                %
              </label>
            </div>
          </div>

          <div>
            <div className={groupLabel}>Table style</div>
            <div className="flex flex-wrap gap-1">
              <button className={block.topRule ? activeBtn : ctrlBtn} onClick={() => patch(tableOps.toggleRule(block, 'topRule'))}>Top rule</button>
              <button className={block.headerRule ? activeBtn : ctrlBtn} onClick={() => patch(tableOps.toggleRule(block, 'headerRule'))}>Header rule</button>
              <button className={block.bottomRule ? activeBtn : ctrlBtn} onClick={() => patch(tableOps.toggleRule(block, 'bottomRule'))}>Bottom rule</button>
              <button className={block.rowLines ? activeBtn : ctrlBtn} onClick={() => patch(tableOps.toggleRule(block, 'rowLines'))}>Row lines</button>
              <button className={block.colLines ? activeBtn : ctrlBtn} onClick={() => patch(tableOps.toggleRule(block, 'colLines'))}>Col lines</button>
              <button className={block.centered ? activeBtn : ctrlBtn} onClick={() => patch(tableOps.toggleRule(block, 'centered'))}>Center</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
