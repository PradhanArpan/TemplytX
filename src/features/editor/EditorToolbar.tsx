/**
 * Shared formatting toolbar (Word-like). Sits at the top of the editor and
 * applies bold/italic/superscript/subscript and symbol insertion to the
 * currently focused rich-text block. Because execCommand acts on the live
 * selection, this works for whichever paragraph the caret is in.
 */
import { useState } from 'react';
import { Bold, Italic, Superscript, Subscript, Sigma } from 'lucide-react';

const SYMBOLS = [
  'α','β','γ','δ','ε','θ','λ','μ','π','σ','φ','ω','Δ','Σ','Ω',
  '±','×','÷','≤','≥','≠','≈','→','←','↔','∞','°','·','∑','∫','√','∂','∇','∝','∈',
];

export function EditorToolbar({ onAfter }: { onAfter?: () => void }) {
  const [showSymbols, setShowSymbols] = useState(false);

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
    // Insert the symbol in italics (math variables are conventionally italic).
    document.execCommand('insertHTML', false, `<i>${sym}</i>`);
    setShowSymbols(false);
    onAfter?.();
  }

  const btn =
    'p-1.5 rounded cursor-pointer text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-colors border-none bg-transparent';

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border border-[var(--color-border)] rounded-[var(--radius)] bg-[var(--color-surface)]">
      {/* onMouseDown + preventDefault keeps the editor selection alive */}
      <button type="button" onMouseDown={(e) => { e.preventDefault(); run('bold'); }} className={btn} title="Bold (Ctrl+B)"><Bold size={15} /></button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); run('italic'); }} className={btn} title="Italic (Ctrl+I)"><Italic size={15} /></button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); runScript('superscript'); }} className={btn} title="Superscript (toggle)"><Superscript size={15} /></button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); runScript('subscript'); }} className={btn} title="Subscript (toggle)"><Subscript size={15} /></button>
      <div className="relative">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); setShowSymbols((s) => !s); }} className={btn} title="Insert symbol"><Sigma size={15} /></button>
        {showSymbols && (
          <div className="absolute z-30 top-9 left-0 w-[248px] p-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius)] shadow-[var(--shadow-modal)] grid grid-cols-8 gap-0.5">
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
  );
}
