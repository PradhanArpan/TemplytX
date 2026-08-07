/**
 * Toolbar dropdown for choosing how Figures/Tables/Equations number when the
 * document has chapters: continuous through the document, or reset per
 * chapter ("2.1"). Only rendered when the document actually has a chapter
 * (EditorScreen gates this). Backed by numberingPref.ts (localStorage,
 * session-only for now — see that file's comment for the persistence plan).
 */
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ListOrdered } from 'lucide-react';
import type { NumberingStyle } from '../export/numbering';
import { useClickOutside } from './useClickOutside';

export function NumberingMenu({ style, onChange }: {
  style: NumberingStyle;
  onChange: (style: NumberingStyle) => void;
}) {
  const [open, setOpen] = useState(false);
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

  function pick(s: NumberingStyle) { onChange(s); setOpen(false); }

  const btn = 'min-h-8 text-[12px] font-medium px-2.5 py-1.5 border border-[var(--color-border)] rounded-[var(--radius)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer flex items-center gap-1.5 shadow-[var(--shadow-card)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-raised)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]';
  const itemCls = 'w-full text-left text-[12px] font-medium px-3 py-2 cursor-pointer border-none rounded-md bg-transparent text-[var(--color-text)] hover:bg-[var(--color-accent-bg)] hover:text-[var(--color-accent)] flex items-center justify-between gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]';

  const label = style === 'byChapter' ? 'By chapter' : 'Continuous';

  return (
    <div className="relative">
      <button ref={trigger} type="button" onClick={toggle}
        title="How Figures/Tables/Equations are numbered"
        aria-haspopup="menu" aria-expanded={open} aria-controls="editor-numbering-menu" className={btn}>
        <ListOrdered size={14} /> {label} <span className="text-[var(--color-faint)]">▾</span>
      </button>

      {open && pos && createPortal(
        <div ref={menuRef} id="editor-numbering-menu" role="menu"
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1000 }}
          className="min-w-[190px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius)] shadow-[var(--shadow-modal)] p-1">
          <button type="button" role="menuitem" className={itemCls} onClick={() => pick('continuous')}>
            Continuous {style === 'continuous' && <span className="text-[var(--color-accent)]">✓</span>}
          </button>
          <button type="button" role="menuitem" className={itemCls} onClick={() => pick('byChapter')}>
            By chapter {style === 'byChapter' && <span className="text-[var(--color-accent)]">✓</span>}
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}
