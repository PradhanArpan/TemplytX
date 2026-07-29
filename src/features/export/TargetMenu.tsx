/**
 * Cascading target-format picker for export. Top level: category
 * (Journals / Thesis / Reports / …); hover, focus, or click a category to open
 * its templates. Click a template to select it.
 */
import { useState } from 'react';
import type { Template } from '../../types/compliance';

const LABELS: Record<string, string> = {
  journal: 'Journals', thesis: 'Thesis', report: 'Reports',
  proposal: 'Proposals', 'lab-report': 'Lab Reports', cv: 'Academic CV',
};
const ORDER = ['journal', 'thesis', 'report', 'proposal', 'lab-report', 'cv'];

export function TargetMenu({ templates, value, onChange }: {
  templates: Template[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<string | null>(null);

  const cats = ORDER
    .map((type) => ({ type, label: LABELS[type], items: templates.filter((t) => t.type === type) }))
    .filter((c) => c.items.length > 0);

  const selected = templates.find((t) => t.id === value);

  const colCls = 'w-full sm:w-auto sm:min-w-[200px] max-h-[300px] overflow-y-auto bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] p-1.5';
  const itemCls = 'w-full text-left text-[13px] font-medium px-3 py-2.5 cursor-pointer border-none rounded-[var(--radius)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-accent-bg)] hover:text-[var(--color-accent)] flex items-center justify-between gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]';

  return (
    <div className="relative mb-2 min-w-0" onMouseLeave={() => { setOpen(false); setCat(null); }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu" aria-expanded={open} aria-controls="target-template-menu"
        className="w-full min-h-11 text-left text-[14px] px-3.5 py-2 border border-[var(--color-border-strong)] rounded-[var(--radius)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer flex items-center justify-between shadow-[var(--shadow-card)] hover:border-[var(--color-accent)] transition-[border-color,box-shadow] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]">
        <span className="min-w-0 truncate">{selected ? selected.name : 'Choose a target…'}</span>
        <span className="text-[var(--color-faint)]">▾</span>
      </button>

      {open && (
        <div id="target-template-menu" role="menu"
          className="absolute z-40 top-12 left-0 right-0 sm:right-auto flex flex-col sm:flex-row items-stretch sm:items-start gap-1.5">
          <div className={colCls}>
            {cats.map((c) => (
              <button type="button" role="menuitem" key={c.type} className={itemCls}
                aria-haspopup="menu" aria-expanded={cat === c.type}
                onMouseEnter={() => setCat(c.type)} onFocus={() => setCat(c.type)} onClick={() => setCat(c.type)}>
                {c.label} <span className="text-[var(--color-faint)]">›</span>
              </button>
            ))}
          </div>
          {cat && (
            <div className={colCls}>
              {cats.find((c) => c.type === cat)!.items.map((t) => (
                <button type="button" role="menuitem" key={t.id} className={itemCls}
                  onClick={() => { onChange(t.id); setOpen(false); setCat(null); }}>
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
