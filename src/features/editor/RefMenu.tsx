/**
 * Cascading cross-reference picker. Top level: Figures / Tables / Equations.
 * Hovering a category opens a column of items beside it; a figure that has
 * subfigures opens a further column of its subfigures. Inserts a \ref to the
 * chosen target.
 */
import { useState } from 'react';
import type { DocumentBlock } from '../../types/document';
import { crossRefData } from '../references/format';

interface Item { id: string; label: string; subs?: { id: string; label: string }[]; }

export function RefMenu({ blocks, onPick }: {
  blocks: DocumentBlock[];
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<'figure' | 'table' | 'equation' | null>(null);
  const [figOpen, setFigOpen] = useState<string | null>(null);

  const data = crossRefData(blocks);

  // Build grouped items with subfigures nested under their figure.
  const figures: Item[] = [];
  const tables: Item[] = [];
  const equations: Item[] = [];
  // Top-level (non-subfigure) entries first.
  data.forEach((d, id) => {
    if (id.includes(':')) return; // subfigure, handled below
    if (d.kind === 'figure') figures.push({ id, label: `Fig. ${d.number}` });
    else if (d.kind === 'table') tables.push({ id, label: `Table ${d.number}` });
    else equations.push({ id, label: `Eq. (${d.number})` });
  });
  // Attach subfigures to their parent figure.
  data.forEach((d, id) => {
    if (!id.includes(':')) return;
    const parentId = id.split(':')[0];
    const fig = figures.find((f) => f.id === parentId);
    if (fig) { (fig.subs ??= []).push({ id, label: `Fig. ${d.number}` }); }
  });

  const hasAny = figures.length + tables.length + equations.length > 0;
  if (!hasAny) {
    return <span className="text-[11px] text-[var(--color-faint)]">Add a figure/table/equation to cross-reference it</span>;
  }

  function pick(id: string) { onPick(id); setOpen(false); setCat(null); setFigOpen(null); }

  const cats = ([
    { key: 'figure' as const, label: 'Figures', items: figures },
    { key: 'table' as const, label: 'Tables', items: tables },
    { key: 'equation' as const, label: 'Equations', items: equations },
  ]).filter((c) => c.items.length > 0);

  const colCls = 'min-w-[130px] max-h-[280px] overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius)] shadow-[var(--shadow-modal)] py-1';
  const itemCls = 'w-full text-left text-[12px] px-3 py-1.5 cursor-pointer border-none bg-transparent text-[var(--color-text)] hover:bg-[var(--color-accent-bg)] hover:text-[var(--color-accent)] flex items-center justify-between gap-2';

  return (
    <div className="relative" onMouseLeave={() => { setOpen(false); setCat(null); setFigOpen(null); }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="text-[12px] px-2 py-1.5 border border-[var(--color-border)] rounded-[var(--radius)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer flex items-center gap-1">
        Insert \ref <span className="text-[var(--color-faint)]">▾</span>
      </button>

      {open && (
        <div className="absolute z-40 top-9 left-0 flex items-start gap-1">
          {/* level 1: categories */}
          <div className={colCls}>
            {cats.map((c) => (
              <button key={c.key} className={itemCls}
                onMouseEnter={() => { setCat(c.key); setFigOpen(null); }}>
                {c.label} <span className="text-[var(--color-faint)]">›</span>
              </button>
            ))}
          </div>

          {/* level 2: items in the hovered category */}
          {cat && (
            <div className={colCls}>
              {cats.find((c) => c.key === cat)!.items.map((it) => (
                <button key={it.id} className={itemCls}
                  onMouseEnter={() => setFigOpen(it.subs && it.subs.length ? it.id : null)}
                  onClick={() => pick(it.id)}>
                  {it.label}
                  {it.subs && it.subs.length > 0 && <span className="text-[var(--color-faint)]">›</span>}
                </button>
              ))}
            </div>
          )}

          {/* level 3: subfigures of the hovered figure */}
          {figOpen && (
            <div className={colCls}>
              {figures.find((f) => f.id === figOpen)?.subs?.map((s) => (
                <button key={s.id} className={itemCls} onClick={() => pick(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
