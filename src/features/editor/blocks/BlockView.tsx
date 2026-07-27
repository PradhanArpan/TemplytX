/**
 * Block editor views — the writing surface.
 * Each block renders as an editable element in the author's serif.
 * Equations render live with KaTeX (click to edit, blur to render).
 */
import { useRef, useState } from 'react';
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
  const [draft, setDraft] = useState(block.latex);
  const [focused, setFocused] = useState(false);
  const [showGreek, setShowGreek] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  let rendered = ''; let renderError = false; let errorMsg = '';
  try {
    rendered = katex.renderToString(draft || '\\;', { displayMode: true, throwOnError: true });
  } catch (e) { renderError = true; errorMsg = e instanceof Error ? e.message : 'Invalid LaTeX'; }

  function commit(v: string) { setDraft(v); onChange({ latex: v } as Partial<EquationBlock>); }

  /** Insert a snippet at the cursor; `caret` is where to place the cursor
   *  after insertion (offset from insertion point). */
  function insert(snippet: string, caret?: number) {
    const el = inputRef.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + snippet + draft.slice(end);
    commit(next);
    // restore focus + caret after React updates the value
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + (caret ?? snippet.length);
      el.setSelectionRange(pos, pos);
    });
  }

  const tBtn = 'text-[12px] px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer font-mono';
  const GREEK = ['\\alpha','\\beta','\\gamma','\\delta','\\theta','\\lambda','\\mu','\\pi','\\sigma','\\phi','\\omega','\\Delta','\\Sigma','\\Omega','\\nabla','\\partial'];

  return (
    <BlockShell onDelete={onDelete} blockId={block.id}>
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
        background: 'var(--color-surface)', margin: '6px 0', overflow: 'hidden' }}>
        <div style={{ padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center',
          minHeight: 48, borderBottom: '1px solid var(--color-border)',
          background: renderError ? 'var(--status-error-bg)' : 'var(--color-bg)' }}>
          {renderError && draft
            ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--status-error)' }}>{errorMsg}</span>
            : <span dangerouslySetInnerHTML={{ __html: rendered }} />}
        </div>

        {/* template row — insert LaTeX skeletons without knowing LaTeX */}
        <div className="flex flex-wrap items-center gap-1 px-3 pt-2" style={{ position: 'relative' }}>
          <button type="button" className={tBtn} title="Fraction" onMouseDown={(e) => e.preventDefault()} onClick={() => insert('\\frac{}{}', 6)}>a/b</button>
          <button type="button" className={tBtn} title="Superscript" onMouseDown={(e) => e.preventDefault()} onClick={() => insert('^{}', 2)}>x²</button>
          <button type="button" className={tBtn} title="Subscript" onMouseDown={(e) => e.preventDefault()} onClick={() => insert('_{}', 2)}>x₂</button>
          <button type="button" className={tBtn} title="Square root" onMouseDown={(e) => e.preventDefault()} onClick={() => insert('\\sqrt{}', 6)}>√</button>
          <button type="button" className={tBtn} title="Summation" onMouseDown={(e) => e.preventDefault()} onClick={() => insert('\\sum_{}^{}', 6)}>∑</button>
          <button type="button" className={tBtn} title="Integral" onMouseDown={(e) => e.preventDefault()} onClick={() => insert('\\int_{}^{}', 6)}>∫</button>
          <button type="button" className={tBtn} title="Brackets" onMouseDown={(e) => e.preventDefault()} onClick={() => insert('\\left( \\right)', 7)}>( )</button>
          <div style={{ position: 'relative' }}>
            <button type="button" className={tBtn} title="Greek letters" onMouseDown={(e) => e.preventDefault()} onClick={() => setShowGreek((s) => !s)}>αβγ</button>
            {showGreek && (
              <div className="absolute z-30 top-8 left-0 w-[200px] p-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius)] shadow-[var(--shadow-modal)] grid grid-cols-4 gap-0.5">
                {GREEK.map((g) => (
                  <button key={g} type="button" onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { insert(g + ' '); setShowGreek(false); }}
                    className="text-[13px] p-1 rounded hover:bg-[var(--color-accent-bg)] cursor-pointer border-none bg-transparent"
                    dangerouslySetInnerHTML={{ __html: (() => { try { return katex.renderToString(g, { throwOnError: false }); } catch { return g; } })() }} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-faint)' }}>ƒx</span>
          <input ref={inputRef} value={draft} placeholder="Type LaTeX, or use the buttons above"
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            onChange={(e) => commit(e.target.value)}
            style={{ ...bare, fontFamily: 'var(--font-mono)', fontSize: 13, flex: 1 }} />
          <input value={block.label ?? ''} placeholder="label (opt.)"
            onChange={(e) => onChange({ label: e.target.value } as Partial<EquationBlock>)}
            style={{ ...bare, fontFamily: 'var(--font-ui)', fontSize: 12, width: 90, textAlign: 'right',
              color: 'var(--color-muted)' }} />
        </div>
        {focused && (
          <div style={{ padding: '0 12px 8px', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--color-faint)' }}>
            Tip: click a button to insert a template, then fill in the blanks. Live preview updates above.
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
          {subs.length > 0 && (
            <label className="flex items-center gap-1 text-[10.5px] text-[var(--color-muted)] ml-1">
              per row:
              <select value={block.perRow ?? 2}
                onChange={(e) => onChange({ perRow: parseInt(e.target.value, 10) } as Partial<FigureBlock>)}
                className="text-[10.5px] border border-[var(--color-border)] rounded px-1 py-0.5 bg-[var(--color-surface)] cursor-pointer outline-none">
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          )}
          <span className="text-[10.5px] text-[var(--color-faint)] ml-auto">
            {subs.length > 0 ? `${subs.length} subfigure${subs.length === 1 ? '' : 's'}` : 'single image'}
          </span>
        </div>

        {subs.length === 0 ? (
          placeholder(block.src ? 'Image' : 'Figure placeholder — image upload comes with the backend')
        ) : (
          <div className="flex flex-wrap gap-2 p-2 justify-center">
            {subs.map((s, i) => (
              <div key={s.id} className="border border-[var(--color-border)] rounded overflow-hidden"
                style={{ flex: '0 0 auto', width: `calc((100% - ${((block.perRow ?? 2) - 1) * 8}px) / ${block.perRow ?? 2})` }}>
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
  const widths = block.colWidths ?? Array(cols).fill(0);
  const ctrlBtn = 'text-[11px] px-2 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer transition-colors';
  const activeBtn = 'text-[11px] px-2 py-0.5 rounded border border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)] cursor-pointer';
  const miniBtn = 'text-[10px] leading-none w-4 h-4 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer flex items-center justify-center';

  function setCell(r: number, c: number, v: string) {
    const rows = block.rows.map((row, ri) => ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row);
    onChange({ rows } as Partial<TableBlock>);
  }
  /** Insert a row at index i (i can equal length to append). */
  function insertRow(i: number) {
    const rows = [...block.rows];
    rows.splice(i, 0, Array(cols).fill(''));
    onChange({ rows } as Partial<TableBlock>);
  }
  function deleteRow(i: number) {
    if (block.rows.length <= 1) return;
    onChange({ rows: block.rows.filter((_, ri) => ri !== i) } as Partial<TableBlock>);
  }
  /** Insert a column at index c. */
  function insertCol(c: number) {
    const rows = block.rows.map((row) => { const n = [...row]; n.splice(c, 0, ''); return n; });
    const a = [...align]; a.splice(c, 0, 'left');
    const w = [...widths]; w.splice(c, 0, 0);
    onChange({ rows, align: a, colWidths: w } as Partial<TableBlock>);
  }
  function deleteCol(c: number) {
    if (cols <= 1) return;
    onChange({
      rows: block.rows.map((row) => row.filter((_, ci) => ci !== c)),
      align: align.filter((_, ci) => ci !== c),
      colWidths: widths.filter((_, ci) => ci !== c),
    } as Partial<TableBlock>);
  }
  function setColAlign(c: number, a: 'left' | 'center' | 'right') {
    const next = [...align]; next[c] = a;
    onChange({ align: next } as Partial<TableBlock>);
  }
  function setColWidth(c: number, w: number) {
    const next = [...widths]; next[c] = w;
    onChange({ colWidths: next } as Partial<TableBlock>);
  }
  function toggle(key: keyof TableBlock) {
    onChange({ [key]: !block[key] } as Partial<TableBlock>);
  }

  const border = '1px solid var(--color-text)';
  const vline = block.colLines ? '1px solid var(--color-border)' : undefined;
  return (
    <BlockShell onDelete={onDelete} blockId={block.id}>
      <div style={{ margin: '8px 0' }}>
        {/* rule + layout toggles */}
        <div className="flex flex-wrap items-center gap-1 mb-2">
          <button className={block.topRule ? activeBtn : ctrlBtn} onClick={() => toggle('topRule')}>top rule</button>
          <button className={block.headerRule ? activeBtn : ctrlBtn} onClick={() => toggle('headerRule')}>header rule</button>
          <button className={block.bottomRule ? activeBtn : ctrlBtn} onClick={() => toggle('bottomRule')}>bottom rule</button>
          <button className={block.rowLines ? activeBtn : ctrlBtn} onClick={() => toggle('rowLines')}>row lines</button>
          <button className={block.colLines ? activeBtn : ctrlBtn} onClick={() => toggle('colLines')}>col lines</button>
          <button className={block.centered ? activeBtn : ctrlBtn} onClick={() => toggle('centered')}>center</button>
        </div>

        {/* column header controls: insert-left, delete, align, width, insert-right */}
        <div className="flex gap-1 mb-1 items-end">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-0.5">
                <button className={miniBtn} title="Insert column left" onClick={() => insertCol(c)}>+</button>
                <button className={miniBtn} title="Delete column" onClick={() => deleteCol(c)}>×</button>
                {c === cols - 1 && <button className={miniBtn} title="Insert column right" onClick={() => insertCol(c + 1)}>+</button>}
              </div>
              <div className="flex gap-0.5">
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button key={a} onClick={() => setColAlign(c, a)} title={`Align ${a}`}
                    className={`text-[9px] px-1 rounded cursor-pointer border ${align[c] === a ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : 'border-transparent text-[var(--color-faint)]'}`}>
                    {a[0].toUpperCase()}
                  </button>
                ))}
              </div>
              <input type="number" min={0} max={100} value={widths[c] || ''} placeholder="auto"
                onChange={(e) => setColWidth(c, parseInt(e.target.value, 10) || 0)}
                title="Column width %"
                className="w-12 text-[9px] px-1 py-0.5 border border-[var(--color-border)] rounded text-center bg-[var(--color-surface)] outline-none" />
            </div>
          ))}
        </div>

        <table style={{ borderCollapse: 'collapse', width: '100%',
          margin: block.centered ? '0 auto' : undefined, tableLayout: widths.some((w) => w > 0) ? 'fixed' : 'auto' }}>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r} style={{
                borderTop: (r === 0 && block.topRule) ? border
                  : (r === 1 && block.headerRule) ? border
                  : (r > 0 && block.rowLines) ? '1px solid var(--color-border)' : undefined,
                borderBottom: (r === block.rows.length - 1 && block.bottomRule) ? border : undefined,
              }}>
                {/* row controls in a leading mini-cell */}
                <td style={{ padding: 0, width: 18, verticalAlign: 'middle' }}>
                  <div className="flex flex-col gap-0.5">
                    <button className={miniBtn} title="Insert row above" onClick={() => insertRow(r)}>+</button>
                    <button className={miniBtn} title="Delete row" onClick={() => deleteRow(r)}>×</button>
                    {r === block.rows.length - 1 && <button className={miniBtn} title="Insert row below" onClick={() => insertRow(r + 1)}>+</button>}
                  </div>
                </td>
                {row.map((cell, c) => (
                  <td key={c} style={{ padding: 0, borderLeft: c > 0 ? vline : undefined,
                    width: widths[c] > 0 ? `${widths[c]}%` : undefined }}>
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
