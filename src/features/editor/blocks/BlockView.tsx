/**
 * Block editor views — the writing surface.
 * Each block renders as an editable element in the author's serif.
 * Equations render live with KaTeX (click to edit, blur to render).
 */
import { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
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
      {hover && (
        <button onClick={onDelete} aria-label="Delete block"
          style={{ position: 'absolute', right: -34, top: 2, border: 'none',
            background: 'transparent', color: 'var(--color-faint)', cursor: 'pointer', fontSize: 14, padding: 4 }}>✕</button>
      )}
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

export function ParagraphView({ block, onChange, onDelete, onFocusCursor }: BlockProps<ParagraphBlock> & {
  onFocusCursor?: (blockId: string, getCursor: () => number) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  // Grow to fit content on mount and whenever content changes (e.g. on load).
  useEffect(() => {
    const el = taRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
  }, [block.content]);
  return (
    <BlockShell onDelete={onDelete} blockId={block.id}>
      <textarea ref={taRef} value={block.content} placeholder="Write… (cite from the References panel)"
        rows={1}
        onFocus={() => onFocusCursor?.(block.id, () => taRef.current?.selectionStart ?? block.content.length)}
        onChange={(e) => {
          onChange({ content: e.target.value } as Partial<ParagraphBlock>);
          const el = e.target; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`;
        }}
        onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }}
        style={{ ...bare, fontFamily: 'var(--font-document)', fontSize: 16, lineHeight: 1.7, overflow: 'hidden' }} />
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
  return (
    <BlockShell onDelete={onDelete} blockId={block.id}>
      <figure style={{ margin: '8px 0', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--color-surface)' }}>
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--color-surface-2)', color: 'var(--color-faint)',
          fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)' }}>
          {block.src ? 'Image' : 'Figure placeholder — image upload comes with the backend'}
        </div>
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
  function setCell(r: number, c: number, v: string) {
    const rows = block.rows.map((row, ri) => ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row);
    onChange({ rows } as Partial<TableBlock>);
  }
  function addRow() { onChange({ rows: [...block.rows, block.rows[0].map(() => '')] } as Partial<TableBlock>); }
  return (
    <BlockShell onDelete={onDelete} blockId={block.id}>
      <div style={{ margin: '8px 0' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} style={{ border: '1px solid var(--color-border)', padding: 0 }}>
                    <input value={cell} onChange={(e) => setCell(r, c, e.target.value)}
                      style={{ ...bare, fontFamily: 'var(--font-document)', fontSize: 14, padding: '6px 9px', fontWeight: r === 0 ? 600 : 400 }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addRow} style={{ border: 'none', background: 'none', cursor: 'pointer',
          color: 'var(--color-accent)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-ui)', padding: '4px 0' }}>+ Row</button>
      </div>
    </BlockShell>
  );
}

export function BlockView({ block, onChange, onDelete, onFocusCursor }: BlockProps<DocumentBlock> & {
  onFocusCursor?: (blockId: string, getCursor: () => number) => void;
}) {
  switch (block.type) {
    case 'section': return <SectionView block={block} onChange={onChange} onDelete={onDelete} />;
    case 'paragraph': return <ParagraphView block={block} onChange={onChange} onDelete={onDelete} onFocusCursor={onFocusCursor} />;
    case 'equation': return <EquationView block={block} onChange={onChange} onDelete={onDelete} />;
    case 'figure': return <FigureView block={block} onChange={onChange} onDelete={onDelete} />;
    case 'table': return <TableView block={block} onChange={onChange} onDelete={onDelete} />;
    default: return null;
  }
}
