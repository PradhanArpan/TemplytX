/**
 * Rich-text paragraph editor (contentEditable).
 * Stores HTML with [[cite:id]] tokens. For DISPLAY, tokens render as
 * non-editable "chips" showing the resolved marker ([1] or (Author, year)).
 * On save, chips convert back to tokens so stored format stays token-based.
 */
import { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Superscript, Subscript, Sigma } from 'lucide-react';

const SYMBOLS = [
  'α','β','γ','δ','ε','θ','λ','μ','π','σ','φ','ω','Δ','Σ','Ω',
  '±','×','÷','≤','≥','≠','≈','→','←','↔','∞','°','·','∑','∫','√','∂','∇','∝','∈',
];

const CITE_RE = /\[\[cite:([a-z0-9-]+)\]\]/gi;

function exec(cmd: string) { document.execCommand(cmd, false); }

function tokensToChips(html: string, markers: Map<string, string>): string {
  return html.replace(CITE_RE, (_, id) => {
    const label = markers.get(id) ?? '[?]';
    return `<span class="tx-cite" contenteditable="false" data-cite="${id}">${label}</span>`;
  });
}

function chipsToTokens(node: HTMLElement): string {
  const clone = node.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('span.tx-cite').forEach((el) => {
    const id = el.getAttribute('data-cite');
    el.replaceWith(document.createTextNode(`[[cite:${id}]]`));
  });
  return clone.innerHTML;
}

export function RichParagraph({ html, markers, onChange, onFocusCursor, blockId }: {
  html: string;
  markers: Map<string, string>;
  onChange: (html: string) => void;
  onFocusCursor?: (blockId: string) => void;
  blockId: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showSymbols, setShowSymbols] = useState(false);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = tokensToChips(html, markers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el) {
      el.innerHTML = tokensToChips(chipsToTokens(el), markers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers]);

  function emit() { if (ref.current) onChange(chipsToTokens(ref.current)); }

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
