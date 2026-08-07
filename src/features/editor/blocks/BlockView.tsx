/**
 * Block editor views — the writing surface.
 * Each block renders as an editable element in the author's serif.
 * Equations render live with KaTeX (click to edit, blur to render).
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { RichParagraph } from './RichParagraph';
import { setActiveTableCell } from '../activeField';
import { useClickOutside } from '../useClickOutside';
import * as tableOps from '../tableOps';
import { ImageInput } from './ImageInput';
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

/** Small "*" toggle for unnumbered sections/figures/tables/equations —
 *  matches the same toggle offered at insert time (InsertMenu.tsx), so it
 *  can be flipped after the fact too. */
function UnnumberedToggle({ on, onToggle, title }: { on?: boolean; onToggle: () => void; title?: string }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={!!on}
      title={title ?? (on ? 'Unnumbered — click to number it' : 'Numbered — click to make unnumbered (*)')}
      style={{
        border: `1px solid ${on ? 'var(--color-accent)' : 'var(--color-border)'}`,
        background: on ? 'var(--color-accent-bg)' : 'transparent',
        color: on ? 'var(--color-accent)' : 'var(--color-faint)',
        borderRadius: 4, fontSize: 10, fontFamily: 'var(--font-mono)', lineHeight: 1,
        padding: '2px 5px', cursor: 'pointer',
      }}>*</button>
  );
}

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
  const level = block.level ?? 1;
  const levelLabel = level === 1 ? 'Chapter' : level === 2 ? 'Section' : level === 3 ? 'Subsection' : 'Sub-subsection';
  return (
    <BlockShell onDelete={onDelete} blockId={block.id}>
      <div style={{ marginLeft: (level - 1) * 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
            textTransform: 'uppercase', color: 'var(--color-faint)',
            background: 'var(--color-surface-2)', padding: '1px 6px', borderRadius: 4 }}>
            {levelLabel}
          </span>
          <button title="Promote (outdent)" onClick={() => onChange({ level: Math.max(1, level - 1) })}
            disabled={level === 1}
            style={{ border: 'none', background: 'transparent', cursor: level === 1 ? 'default' : 'pointer',
              color: level === 1 ? 'var(--color-faint)' : 'var(--color-muted)', fontSize: 13, padding: '0 3px', opacity: level === 1 ? 0.4 : 1 }}>◄</button>
          <button title="Demote (indent)" onClick={() => onChange({ level: Math.min(4, level + 1) })}
            disabled={level === 4}
            style={{ border: 'none', background: 'transparent', cursor: level === 4 ? 'default' : 'pointer',
              color: level === 4 ? 'var(--color-faint)' : 'var(--color-muted)', fontSize: 13, padding: '0 3px', opacity: level === 4 ? 0.4 : 1 }}>►</button>
          <UnnumberedToggle on={block.unnumbered} onToggle={() => onChange({ unnumbered: !block.unnumbered })} />
        </div>
        <input value={block.title} placeholder={`${levelLabel} title`}
          onChange={(e) => onChange({ title: e.target.value })}
          style={{ ...bare, fontFamily: 'var(--font-document)', fontWeight: 600,
            fontSize: level === 1 ? 19 : level === 2 ? 16 : level === 3 ? 14 : 13 }} />
      </div>
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
  const greekBtnRef = useRef<HTMLButtonElement>(null);
  const greekMenuRef = useRef<HTMLDivElement>(null);
  const [greekPos, setGreekPos] = useState<{ top: number; left: number } | null>(null);
  useClickOutside(showGreek, [greekBtnRef, greekMenuRef], () => setShowGreek(false));
  function toggleGreek() {
    setShowGreek((s) => {
      const next = !s;
      if (next && greekBtnRef.current) {
        const r = greekBtnRef.current.getBoundingClientRect();
        setGreekPos({ top: r.bottom + 4, left: r.left });
      }
      return next;
    });
  }
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
        background: 'var(--color-surface)', margin: '6px 0' }}>
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
            <button ref={greekBtnRef} type="button" className={tBtn} title="Greek letters" onMouseDown={(e) => e.preventDefault()} onClick={toggleGreek}>αβγ</button>
            {showGreek && greekPos && createPortal(
              <div ref={greekMenuRef} style={{ position: 'fixed', top: greekPos.top, left: greekPos.left, zIndex: 1000 }}
                className="w-[200px] p-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius)] shadow-[var(--shadow-modal)] grid grid-cols-4 gap-0.5">
                {GREEK.map((g) => (
                  <button key={g} type="button" onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { insert(g + ' '); setShowGreek(false); }}
                    className="text-[13px] p-1 rounded hover:bg-[var(--color-accent-bg)] cursor-pointer border-none bg-transparent"
                    dangerouslySetInnerHTML={{ __html: (() => { try { return katex.renderToString(g, { throwOnError: false }); } catch { return g; } })() }} />
                ))}
              </div>,
              document.body
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
          <UnnumberedToggle on={block.unnumbered}
            onToggle={() => onChange({ unnumbered: !block.unnumbered } as Partial<EquationBlock>)} />
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
          <label className="flex items-center gap-1 text-[10.5px] text-[var(--color-muted)] ml-1">
            width:
            <input type="range" min={20} max={100} step={5} value={block.width ?? 100}
              onChange={(e) => onChange({ width: parseInt(e.target.value, 10) } as Partial<FigureBlock>)}
              className="w-20 cursor-pointer" />
            <span className="w-8 tabular-nums">{block.width ?? 100}%</span>
          </label>
          <span className="text-[10.5px] text-[var(--color-faint)] ml-auto">
            {subs.length > 0 ? `${subs.length} subfigure${subs.length === 1 ? '' : 's'}` : 'single image'}
          </span>
          <UnnumberedToggle on={block.unnumbered}
            onToggle={() => onChange({ unnumbered: !block.unnumbered } as Partial<FigureBlock>)} />
        </div>

        {subs.length === 0 ? (
          <div className="p-2" style={{ width: `${block.width ?? 100}%`, margin: '0 auto' }}>
            <ImageInput src={block.src} onChange={(url) => onChange({ src: url } as Partial<FigureBlock>)} />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 p-2 justify-center">
            {subs.map((s, i) => (
              <div key={s.id} className="border border-[var(--color-border)] rounded overflow-hidden"
                style={{ flex: '0 0 auto', width: `calc((100% - ${((block.perRow ?? 2) - 1) * 8}px) / ${block.perRow ?? 2})` }}>
                <ImageInput src={s.src} height={90}
                  onChange={(url) => onChange({ subfigures: subs.map((x) => x.id === s.id ? { ...x, src: url } : x) } as Partial<FigureBlock>)} />
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

/** A table cell: contenteditable so Bold/Italic/Superscript/Subscript from
 *  the shared toolbar (execCommand) work here, same as a rich paragraph. */
function RichCell({ html, style, onChange, onFocusCell, onBlurCell }: {
  html: string;
  style: React.CSSProperties;
  onChange: (html: string) => void;
  onFocusCell: () => void;
  onBlurCell: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = html;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Re-sync from the `html` prop whenever it changes externally (undo/redo)
    // — only while unfocused, so we never clobber the caret mid-keystroke.
    const el = ref.current;
    if (el && document.activeElement !== el) el.innerHTML = html;
  }, [html]);

  function emit() { if (ref.current) onChange(ref.current.innerHTML); }

  return (
    <div ref={ref} contentEditable suppressContentEditableWarning
      onInput={emit} onFocus={onFocusCell} onBlur={onBlurCell}
      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
      style={{ ...bare, width: 'auto', minHeight: '1.4em', outline: 'none', ...style }} />
  );
}

export function TableView({ block, onChange, onDelete }: BlockProps<TableBlock>) {
  const align = block.align ?? Array(block.rows[0]?.length ?? 0).fill('left');
  const widths = block.colWidths ?? Array(block.rows[0]?.length ?? 0).fill(0);

  function setCell(r: number, c: number, v: string) {
    onChange(tableOps.setCell(block, r, c, v) as Partial<TableBlock>);
  }

  const border = '1px solid var(--color-text)';
  const vline = block.colLines ? '1px solid var(--color-border)' : undefined;
  return (
    <BlockShell onDelete={onDelete} blockId={block.id}>
      <div style={{ margin: '8px 0' }}>
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
                {row.map((cell, c) => (
                  <td key={c} style={{ padding: 0, borderLeft: c > 0 ? vline : undefined,
                    width: widths[c] > 0 ? `${widths[c]}%` : undefined }}>
                    <RichCell html={cell} onChange={(v) => setCell(r, c, v)}
                      onFocusCell={() => setActiveTableCell({ blockId: block.id, row: r, col: c })}
                      onBlurCell={() => setActiveTableCell(null)}
                      style={{ fontFamily: 'var(--font-document)', fontSize: 14,
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
