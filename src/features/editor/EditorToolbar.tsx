/**
 * Shared formatting toolbar (Word-like). Sits at the top of the editor and
 * applies bold/italic/superscript/subscript and symbol insertion to the
 * currently focused rich-text block. Because execCommand acts on the live
 * selection, this works for whichever paragraph the caret is in.
 */
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bold, Italic, Superscript, Subscript, Sigma } from 'lucide-react';
import { insertIntoActiveField } from './activeField';
import { useClickOutside } from './useClickOutside';

const SYMBOLS = [
  'α','β','γ','δ','ε','θ','λ','μ','π','σ','φ','ω','Δ','Σ','Ω',
  '±','×','÷','≤','≥','≠','≈','→','←','↔','∞','°','·','∑','∫','√','∂','∇','∝','∈',
];

export function EditorToolbar({ onAfter }: { onAfter?: () => void }) {
  const [showSymbols, setShowSymbols] = useState(false);
  const symBtnRef = useRef<HTMLButtonElement>(null);
  const symMenuRef = useRef<HTMLDivElement>(null);
  const [symPos, setSymPos] = useState<{ top: number; left: number } | null>(null);
  useClickOutside(showSymbols, [symBtnRef, symMenuRef], () => setShowSymbols(false));
  function toggleSymbols() {
    setShowSymbols((s) => {
      const next = !s;
      if (next && symBtnRef.current) {
        const r = symBtnRef.current.getBoundingClientRect();
        setSymPos({ top: r.bottom + 4, left: r.left });
      }
      return next;
    });
  }

  function run(cmd: string) {
    document.execCommand(cmd, false);
    onAfter?.();
  }
  /** Super/subscript need explicit toggle handling: execCommand toggles the
   *  format, but applying sup while sub is active can leave both — so clear
   *  the opposite first, then toggle the requested one. */
  function runScript(which: 'superscript' | 'subscript') {
    const other = which === 'superscript' ? 'subscript' : 'superscript';
    if (document.queryCommandState(other)) document.execCommand(other, false); // turn opposite off
    document.execCommand(which, false); // toggles requested on/off
    onAfter?.();
  }
  function insertSymbol(sym: string) {
    // If a plain input (e.g. a table cell) is focused, insert the symbol there.
    if (insertIntoActiveField(sym)) { setShowSymbols(false); onAfter?.(); return; }
    // Insert the symbol in italics (math variables are conventionally italic).
    document.execCommand('insertHTML', false, `<i>${sym}</i>`);
    setShowSymbols(false);
    onAfter?.();
  }

  const btn =
    'min-h-7 min-w-7 inline-flex items-center justify-center rounded-md cursor-pointer text-[var(--color-muted)] hover:bg-[var(--color-accent-bg)] hover:text-[var(--color-accent)] transition-colors border-none bg-transparent ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]';

  return (
    <div className="flex items-center gap-0.5 px-1.5 py-1 border border-[var(--color-border)] rounded-[var(--radius)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
      {/* onMouseDown + preventDefault keeps the editor selection alive */}
      <button type="button" aria-label="Bold" onMouseDown={(e) => { e.preventDefault(); run('bold'); }}
        onClick={(e) => { if (e.detail === 0) run('bold'); }} className={btn} title="Bold (Ctrl+B)"><Bold size={15} /></button>
      <button type="button" aria-label="Italic" onMouseDown={(e) => { e.preventDefault(); run('italic'); }}
        onClick={(e) => { if (e.detail === 0) run('italic'); }} className={btn} title="Italic (Ctrl+I)"><Italic size={15} /></button>
      <button type="button" aria-label="Superscript" onMouseDown={(e) => { e.preventDefault(); runScript('superscript'); }}
        onClick={(e) => { if (e.detail === 0) runScript('superscript'); }} className={btn} title="Superscript (toggle)"><Superscript size={15} /></button>
      <button type="button" aria-label="Subscript" onMouseDown={(e) => { e.preventDefault(); runScript('subscript'); }}
        onClick={(e) => { if (e.detail === 0) runScript('subscript'); }} className={btn} title="Subscript (toggle)"><Subscript size={15} /></button>
      <div className="relative">
        <button ref={symBtnRef} type="button" aria-label="Insert symbol" aria-haspopup="menu" aria-expanded={showSymbols} aria-controls="editor-symbol-menu"
          onMouseDown={(e) => { e.preventDefault(); toggleSymbols(); }}
          onClick={(e) => { if (e.detail === 0) toggleSymbols(); }} className={btn} title="Insert symbol"><Sigma size={15} /></button>
        {showSymbols && symPos && createPortal(
          <div ref={symMenuRef} id="editor-symbol-menu" role="menu" aria-label="Symbols"
            style={{ position: 'fixed', top: symPos.top, left: symPos.left, zIndex: 1000 }}
            className="w-[256px] p-2.5 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] grid grid-cols-8 gap-1">
            {SYMBOLS.map((s) => (
              <button key={s} type="button" role="menuitem" aria-label={`Insert ${s}`}
                onMouseDown={(e) => { e.preventDefault(); insertSymbol(s); }}
                onClick={(e) => { if (e.detail === 0) insertSymbol(s); }}
                className="text-[15px] min-h-7 rounded-md hover:bg-[var(--color-accent-bg)] hover:text-[var(--color-accent)] cursor-pointer border-none bg-transparent text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]">
                {s}
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
