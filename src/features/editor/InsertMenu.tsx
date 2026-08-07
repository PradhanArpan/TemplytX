/**
 * Toolbar "Insert" dropdown — replaces the old in-document hover "+insert"
 * bar and the bottom "Add content" bar. Inserts a new block right after
 * whichever block was last focused (falls back to document end).
 */
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import type { DocumentBlock } from '../../types/document';
import { useClickOutside } from './useClickOutside';

const ITEMS: { type: DocumentBlock['type']; level?: number; label: string }[] = [
  { type: 'section', level: 1, label: 'Chapter' },
  { type: 'section', level: 2, label: 'Section' },
  { type: 'section', level: 3, label: 'Subsection' },
  { type: 'section', level: 4, label: 'Sub-subsection' },
  { type: 'paragraph', label: 'Text' },
  { type: 'equation', label: 'Equation' },
  { type: 'figure', label: 'Figure' },
  { type: 'table', label: 'Table' },
];

export function InsertMenu({ onInsert }: {
  onInsert: (type: DocumentBlock['type'], level?: number, unnumbered?: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [unnumbered, setUnnumbered] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useClickOutside(open, [trigger, menuRef], () => setOpen(false));

  function toggle() {
    setOpen((v) => {
      const next = !v;
      if (next && trigger.current) {
        const r = trigger.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left });
      }
      return next;
    });
  }

  function pick(type: DocumentBlock['type'], level?: number) {
    onInsert(type, level, unnumbered);
    setOpen(false);
    setUnnumbered(false);
  }

  const btn = 'min-h-8 text-[12px] font-medium px-2.5 py-1.5 border border-[var(--color-border)] rounded-[var(--radius)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer flex items-center gap-1.5 shadow-[var(--shadow-card)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-raised)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]';
  const itemCls = 'w-full text-left text-[12px] font-medium px-3 py-2 cursor-pointer border-none rounded-md bg-transparent text-[var(--color-text)] hover:bg-[var(--color-accent-bg)] hover:text-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]';

  return (
    <div className="relative">
      <button ref={trigger} type="button" onClick={toggle}
        aria-haspopup="menu" aria-expanded={open} aria-controls="editor-insert-menu" className={btn}>
        <Plus size={14} /> Insert <span className="text-[var(--color-faint)]">▾</span>
      </button>

      {open && pos && createPortal(
        <div ref={menuRef} id="editor-insert-menu" role="menu"
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1000 }}
          className="min-w-[190px] max-h-[360px] overflow-y-auto bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius)] shadow-[var(--shadow-modal)] p-1">
          <button type="button" onClick={() => setUnnumbered((v) => !v)} aria-pressed={unnumbered}
            title="Insert without a number (e.g. \chapter*, \caption*, equation*)"
            className={`w-full flex items-center gap-2 text-left text-[11px] px-3 py-1.5 mb-1 rounded-md border-none cursor-pointer transition-colors ${unnumbered ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)]' : 'bg-transparent text-[var(--color-muted)] hover:bg-[var(--color-surface)]'}`}>
            <span className={`inline-flex items-center justify-center w-4 h-4 rounded border font-mono text-[11px] ${unnumbered ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]'}`}>*</span>
            Insert unnumbered
          </button>
          <div className="border-t border-[var(--color-border)] mb-1" />
          {ITEMS.map((it) => (
            <button key={it.label} type="button" role="menuitem" className={itemCls}
              onClick={() => pick(it.type, it.level)}>
              {it.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
