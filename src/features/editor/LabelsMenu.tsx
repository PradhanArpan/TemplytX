/**
 * Toolbar "Labels" dropdown — wraps the existing LabelsPanel (label
 * create/select + pull-matching-references-into-document) in a popover so it
 * no longer needs a dedicated sidebar column.
 */
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Tag } from 'lucide-react';
import { LabelsPanel } from '../references/LabelsPanel';
import { useClickOutside } from './useClickOutside';

export function LabelsMenu({ documentId, onPulled }: {
  documentId: string;
  onPulled: () => void;
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

  const btn = 'min-h-8 text-[12px] font-medium px-2.5 py-1.5 border border-[var(--color-border)] rounded-[var(--radius)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer flex items-center gap-1.5 shadow-[var(--shadow-card)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-raised)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]';

  return (
    <div className="relative">
      <button ref={trigger} type="button" onClick={toggle}
        aria-haspopup="menu" aria-expanded={open} aria-controls="editor-labels-menu" className={btn}>
        <Tag size={14} /> Labels <span className="text-[var(--color-faint)]">▾</span>
      </button>

      {open && pos && createPortal(
        <div ref={menuRef} id="editor-labels-menu" role="menu"
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1000 }}
          className="w-[300px] max-h-[420px] overflow-y-auto p-3 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)]">
          <LabelsPanel documentId={documentId} onPulled={onPulled} />
        </div>,
        document.body,
      )}
    </div>
  );
}
