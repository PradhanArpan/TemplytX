/**
 * Block editor views — the writing surface.
 * Each block renders as an editable element in the author's serif.
 * Equations render live with KaTeX (click to edit, blur to render).
 */
import { useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { RichParagraph } from './RichParagraph';
import type {
  DocumentBlock, SectionBlock, ParagraphBlock,
  EquationBlock, FigureBlock, TableBlock,
} from '../../../types/document';

interface BlockProps<T extends DocumentBlock> {
  block: T;
  onChange: (patch: Partial<T>) => void;
  onDelete: () => void;
}

const bare: React.CSSProperties = {
  width: '100%', border: 'none', outline: 'none', background: 'transparent',
  color: 'var(--color-text)', padding: 0, resize: 'none',
};

function BlockShell({ children, onDelete, blockId }: {
  children: React.ReactNode; onDelete: () => void; blockId: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div id={`block-${blockId}`} data-block-id={blockId}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', padding: '2px 0', borderRadius: 4 }}>
      <button onClick={onDelete} aria-label="Delete block" title="Delete this block"
        style={{
          position: 'absolute', right: 4, top: 4, zIndex: 5,
          border: '1px solid var(--color-border)', borderRadius: 6,
          background: 'var(--color-surface)',
          color: hover ? 'var(--status-error)' : 'var(--color-faint)',
          cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '3px 6px',
          opacity: hover ? 1 : 0, transition: 'opacity 120ms',
          boxShadow: 'var(--shadow-card)',
        }}>✕</button>
      {children}
    </div>
  );
}

export function SectionView({ block, onChange, onDelete }: BlockProps<SectionBlock>) {
  return (
    <BlockShell onDelete={onDelete} blockId={block.id}>
      <input value={block.title} placeholder="Section title"
        onChange={(e) => onChange({ title: e.target.value })}
        style={{ ...bare, fontFamily: 'var(--font-document)', fontWeight: 600,
          fontSize: block.level === 1 ? 19 : 17, marginTop: 10 }} />
    </BlockShell>
  );
}

export function ParagraphView({ block, onChange, onDelete, onFocusCursor, markers, crossRefs }: BlockProps<ParagraphBlock> & {
  onFocusCursor?: (blockId: string, getCursor: () => number) => void;
  markers: Map<string, string>;
  crossRefs: Map<string, string>;
}) {
  return (
    <BlockShell onDelete={onDelete} blockId={block.id}>
      <RichParagraph html={block.content}
        blockId={block.id}
        markers={markers}
        crossRefs={crossRefs}
        onChange={(content) => onChange({ content } as Partial<ParagraphBlock>)}
        onFocusCursor={(bid) => onFocusCursor?.(bid, () => 0)} />
    </BlockShell>
  );
}

export function EquationView({ block, onChange, onDelete }: BlockProps<EquationBlock>) {
  const [editing, setEditing] = useState(block.latex === '');
  const [draft, setDraft] = useState(block.latex);
  let rendered = ''; let renderError = false;
  try {
    rendered = katex.renderToString(block.latex || '\\;', { displayMode: true, throwOnError: true });
  } catch { renderError = true; }
  return (
    <BlockShell onDelete={onDelete} blockId={block.id}>
      <div style={{ border: '1px dashed var(--color-border-strong)', borderRadius: 'var(--radius)',
        padding: '10px 14px', background: 'var(--color-surface)', margin: '6px 0' }}>
        {editing ? (
          <input autoFocus value={draft} placeholder="LaTeX, e.g. E = mc^2"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { onChange({ latex: draft } as Partial<EquationBlock>); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            style={{ ...bare, fontFamily: 'var(--font-mono)', fontSize: 14 }} />
        ) : (
          <div onClick={() => { setDraft(block.latex); setEditing(true); }}
            style={{ cursor: 'text', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {renderError ? (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--status-error)' }}>Invalid LaTeX: {block.latex}</span>
            ) : (
              <span dangerouslySetInnerHTML={{ __html: rendered }} />
            )}
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-faint)' }}>{block.label ?? 'equation'}</span>
          </div>
        )}
      </div>
    </BlockShell>
  );
}

export function FigureView({ block, onChange, onDelete }: BlockProps<FigureBlock>) {
  const subs = block.subfigures ?? [];
  const ctrlBtn = 'text-[11px] px-2 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer transition-colors';

  function addSub() {
    const next = [...subs, { id: `sf-${crypto.randomUUID()}`, src: '', caption: '' }];
    onChange({ subfigures: next } as Partial<FigureBlock>);
  }
  function removeSub(sfId: string) {
    onChange({ subfigures: subs.filter((s) => s.id !== sfId) } as Partial<FigureBlock>);
  }
  function setSubCaption(sfId: string, v: string) {
    onChange({ subfigures: subs.map((s) => (s.id === sfId ? { ...s, caption: v } : s)) } as Partial<FigureBlock>);
  }

  const placeholder = (label: string) => (
    <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-surface-2)', color: 'var(--color-faint)',
      fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)' }}>{label}</div>
  );

  return (
    <BlockShell onDelete={onDelete} blockId={block.id}>
      <figure style={{ margin: '8px 0', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--color-surface)' }}>
        <div className="flex items-center gap-1 p-2 border-b border-[var(--color-border)]">
          <button className={ctrlBtn} onClick={addSub}>+ Subfigure</button>
          <span className="text-[10.5px] text-[var(--color-faint)]">
            {subs.length > 0 ? `${subs.length} subfigure${subs.length === 1 ? '' : 's'}` : 'single image'}
          </span>
        </div>

        {subs.length === 0 ? (
          placeholder(block.src ? 'Image' : 'Figure placeholder — image upload comes with the backend')
        ) : (
          <div className="flex flex-wrap gap-2 p-2">
            {subs.map((s, i) => (
              <div key={s.id} className="flex-1 min-w-[120px] border border-[var(--color-border)] rounded overflow-hidden">
                {placeholder(`(${String.fromCharCode(97 + i)})`)}
                <div className="p-1.5">
                  <input value={s.caption} placeholder={`(${String.fromCharCode(97 + i)}) caption`}
                    onChange={(e) => setSubCaption(s.id, e.target.value)}
                    style={{ ...bare, fontFamily: 'var(--font-document)', fontSize: 12, fontStyle: 'italic' }} />
                </div>
                <button onClick={() => removeSub(s.id)}
                  className="w-full text-[10.5px] text-[var(--color-faint)] hover:text-[var(--status-error)] cursor-pointer border-none bg-transparent pb-1">
                  remove
                </button>
              </div>
            ))}
          </div>
        )}

        <figcaption style={{ padding: '8px 12px' }}>
          <input value={block.caption} placeholder="Figure caption"
            onChange={(e) => onChange({ caption: e.target.value } as Partial<FigureBlock>)}
            style={{ ...bare, fontFamily: 'var(--font-document)', fontSize: 14, fontStyle: 'italic' }} />
        </figcaption>
      </figure>
    </BlockShell>
  );
}

export function TableView({ block, onChange, onDelete }: BlockProps<TableBlock>) {
  const cols = block.rows[0]?.length ?? 0;
  const align = block.align ?? Array(cols).fill('left');
  const ctrlBtn = 'text-[11px] px-2 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer transition-colors';
  const activeBtn = 'text-[11px] px-2 py-0.5 rounded border border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)] cursor-pointer';

  function setCell(r: number, c: number, v: string) {
    const rows = block.rows.map((row, ri) => ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row);
    onChange({ rows } as Partial<TableBlock>);
  }
  function addRow() { onChange({ rows: [...block.rows, Array(cols).fill('')] } as Partial<TableBlock>); }
  function removeRow() { if (block.rows.length > 1) onChange({ rows: block.rows.slice(0, -1) } as Partial<TableBlock>); }
  function addCol() {
    onChange({ rows: block.rows.map((row) => [...row, '']), align: [...align, 'left'] } as Partial<TableBlock>);
  }
  function removeCol() {
    if (cols > 1) onChange({
      rows: block.rows.map((row) => row.slice(0, -1)),
      align: align.slice(0, -1),
    } as Partial<TableBlock>);
  }
  function setColAlign(c: number, a: 'left' | 'center' | 'right') {
    const next = [...align]; next[c] = a;
    onChange({ align: next } as Partial<TableBlock>);
  }
  function toggle(key: keyof TableBlock) {
    onChange({ [key]: !block[key] } as Partial<TableBlock>);
  }

  const border = '1px solid var(--color-text)';
  return (
    <BlockShell onDelete={onDelete} blockId={block.id}>
      <div style={{ margin: '8px 0' }}>
        {/* control bar */}
        <div className="flex flex-wrap items-center gap-1 mb-2">
          <button className={ctrlBtn} onClick={addRow}>+ Row</button>
          <button className={ctrlBtn} onClick={removeRow}>− Row</button>
          <button className={ctrlBtn} onClick={addCol}>+ Col</button>
          <button className={ctrlBtn} onClick={removeCol}>− Col</button>
          <span className="w-px h-4 bg-[var(--color-border)] mx-1" />
          <button className={block.topRule ? activeBtn : ctrlBtn} onClick={() => toggle('topRule')}>top rule</button>
          <button className={block.headerRule ? activeBtn : ctrlBtn} onClick={() => toggle('headerRule')}>header rule</button>
          <button className={block.bottomRule ? activeBtn : ctrlBtn} onClick={() => toggle('bottomRule')}>bottom rule</button>
          <button className={block.rowLines ? activeBtn : ctrlBtn} onClick={() => toggle('rowLines')}>row lines</button>
          <button className={block.centered ? activeBtn : ctrlBtn} onClick={() => toggle('centered')}>center</button>
        </div>

        {/* per-column alignment row */}
        <div className="flex gap-1 mb-1">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="flex-1 flex justify-center gap-0.5">
              {(['left', 'center', 'right'] as const).map((a) => (
                <button key={a} onClick={() => setColAlign(c, a)} title={`Align ${a}`}
                  className={`text-[10px] px-1 rounded cursor-pointer border ${align[c] === a ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : 'border-transparent text-[var(--color-faint)]'}`}>
                  {a === 'left' ? '⌷◁' : a === 'center' ? '▷◁' : '▷⌷'}
                </button>
              ))}
            </div>
          ))}
        </div>

        <table style={{ borderCollapse: 'collapse', width: '100%',
          margin: block.centered ? '0 auto' : undefined }}>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r} style={{
                borderTop: (r === 0 && block.topRule) ? border
                  : (r === 1 && block.headerRule) ? border
                  : (r > 0 && block.rowLines) ? '1px solid var(--color-border)' : undefined,
                borderBottom: (r === block.rows.length - 1 && block.bottomRule) ? border : undefined,
              }}>
                {row.map((cell, c) => (
                  <td key={c} style={{ padding: 0 }}>
                    <input value={cell} onChange={(e) => setCell(r, c, e.target.value)}
                      style={{ ...bare, fontFamily: 'var(--font-document)', fontSize: 14,
                        padding: '6px 9px', fontWeight: r === 0 ? 600 : 400,
                        textAlign: align[c] ?? 'left' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <input value={block.caption ?? ''} placeholder="Table caption"
          onChange={(e) => onChange({ caption: e.target.value } as Partial<TableBlock>)}
          style={{ ...bare, fontFamily: 'var(--font-document)', fontSize: 13, fontStyle: 'italic', marginTop: 6,
            textAlign: block.centered ? 'center' : 'left' }} />
      </div>
    </BlockShell>
  );
}

export function BlockView({ block, onChange, onDelete, onFocusCursor, markers, crossRefs }: BlockProps<DocumentBlock> & {
  onFocusCursor?: (blockId: string, getCursor: () => number) => void;
  markers: Map<string, string>;
  crossRefs: Map<string, string>;
}) {
  switch (block.type) {
    case 'section': return <SectionView block={block} onChange={onChange} onDelete={onDelete} />;
    case 'paragraph': return <ParagraphView block={block} onChange={onChange} onDelete={onDelete} onFocusCursor={onFocusCursor} markers={markers} crossRefs={crossRefs} />;
    case 'equation': return <EquationView block={block} onChange={onChange} onDelete={onDelete} />;
    case 'figure': return <FigureView block={block} onChange={onChange} onDelete={onDelete} />;
    case 'table': return <TableView block={block} onChange={onChange} onDelete={onDelete} />;
    default: return null;
  }
}
