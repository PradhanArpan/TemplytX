/**
 * Rich-text paragraph editor (contentEditable).
 *
 * Stores HTML (bold/italic/sup/sub) in block.content. A floating toolbar
 * appears on text selection with the manuscript-relevant controls plus a
 * symbol inserter. Citation tokens [[cite:id]] are preserved as plain text
 * inside the HTML and still resolve at render/export time.
 */
import { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Superscript, Subscript, Sigma } from 'lucide-react';

const SYMBOLS = [
  'α','β','γ','δ','ε','θ','λ','μ','π','σ','φ','ω','Δ','Σ','Ω',
  '±','×','÷','≤','≥','≠','≈','→','←','↔','∞','°','·','∑','∫','√','∂','∇','∝','∈',
];

function exec(cmd: string) { document.execCommand(cmd, false); }

export function RichParagraph({ html, onChange, onFocusCursor, blockId }: {
  html: string;
  onChange: (html: string) => void;
  onFocusCursor?: (blockId: string) => void;
  blockId: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showSymbols, setShowSymbols] = useState(false);

  // Initialize content once (avoid clobbering cursor on every render).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) {
      ref.current.innerHTML = html;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emit() { if (ref.current) onChange(ref.current.innerHTML); }

  function insertSymbol(sym: string) {
    ref.current?.focus();
    document.execCommand('insertText', false, sym);
    emit();
    setShowSymbols(false);
  }

  const btn =
    'p-1.5 rounded cursor-pointer text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-colors border-none bg-transparent';

  return (
    <div className="relative">
      {/* formatting toolbar */}
      <div className="flex items-center gap-0.5 mb-1 opacity-60 hover:opacity-100 transition-opacity">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('bold'); emit(); }} className={btn} aria-label="Bold"><Bold size={14} /></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('italic'); emit(); }} className={btn} aria-label="Italic"><Italic size={14} /></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('superscript'); emit(); }} className={btn} aria-label="Superscript"><Superscript size={14} /></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('subscript'); emit(); }} className={btn} aria-label="Subscript"><Subscript size={14} /></button>
        <div className="relative">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); setShowSymbols((s) => !s); }} className={btn} aria-label="Insert symbol"><Sigma size={14} /></button>
          {showSymbols && (
            <div className="absolute z-20 top-8 left-0 w-[240px] p-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius)] shadow-[var(--shadow-modal)] grid grid-cols-8 gap-0.5">
              {SYMBOLS.map((s) => (
                <button key={s} type="button" onMouseDown={(e) => { e.preventDefault(); insertSymbol(s); }}
                  className="text-[15px] p-1 rounded hover:bg-[var(--color-accent-bg)] cursor-pointer border-none bg-transparent text-[var(--color-text)]">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div ref={ref} contentEditable suppressContentEditableWarning
        onInput={emit}
        onFocus={() => onFocusCursor?.(blockId)}
        data-placeholder="Write…"
        className="tx-document tx-rich outline-none min-h-[1.7em] leading-[1.7] text-[16px] text-[var(--color-text)] empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--color-faint)]"
        style={{ fontFamily: 'var(--font-document)' }} />
    </div>
  );
}
