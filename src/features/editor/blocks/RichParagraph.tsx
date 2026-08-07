/**
 * Rich-text paragraph editor (contentEditable). Formatting comes from the
 * shared top toolbar. Renders two kinds of non-editable chips:
 *   [[cite:id]] -> citation marker ([1] / (Author, year))
 *   [[ref:id]]  -> cross-reference to a figure/table/equation ("Fig. 2")
 * and converts both back to tokens on save.
 */
import { useEffect, useRef } from 'react';

const CITE_RE = /\[\[cite:([a-z0-9-]+)\]\]/gi;
const REF_RE = /\[\[ref:([a-z0-9:-]+)\]\]/gi;

function tokensToChips(html: string, markers: Map<string, string>, refs: Map<string, string>): string {
  return html
    .replace(CITE_RE, (_, id) =>
      `<span class="tx-cite" contenteditable="false" data-cite="${id}">${markers.get(id) ?? '[?]'}</span>`)
    .replace(REF_RE, (_, id) =>
      `<span class="tx-xref" contenteditable="false" data-ref="${id}">${refs.get(id) ?? 'Ref. ?'}</span>`);
}

function chipsToTokens(node: HTMLElement): string {
  const clone = node.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('span.tx-cite').forEach((el) => {
    el.replaceWith(document.createTextNode(`[[cite:${el.getAttribute('data-cite')}]]`));
  });
  clone.querySelectorAll('span.tx-xref').forEach((el) => {
    el.replaceWith(document.createTextNode(`[[ref:${el.getAttribute('data-ref')}]]`));
  });
  return clone.innerHTML;
}

export function RichParagraph({ html, markers, crossRefs, onChange, onFocusCursor, blockId }: {
  html: string;
  markers: Map<string, string>;
  crossRefs: Map<string, string>;
  onChange: (html: string) => void;
  onFocusCursor?: (blockId: string) => void;
  blockId: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = tokensToChips(html, markers, crossRefs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = ref.current;
    // Re-sync from the `html` prop whenever it changes externally (undo/redo,
    // citation updates) — but only while unfocused, so we never clobber the
    // caret mid-keystroke. While focused, our own onInput is the source of
    // truth and `html` merely echoes back what we just typed.
    if (el && document.activeElement !== el) {
      el.innerHTML = tokensToChips(html, markers, crossRefs);
    }
  }, [html, markers, crossRefs]);

  function emit() { if (ref.current) onChange(chipsToTokens(ref.current)); }

  return (
    <div ref={ref} contentEditable suppressContentEditableWarning
      data-rich-block={blockId}
      onInput={emit}
      onFocus={() => onFocusCursor?.(blockId)}
      data-placeholder="Write…"
      className="tx-document tx-rich outline-none min-h-[1.7em] leading-[1.7] text-[16px] text-[var(--color-text)] empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--color-faint)]"
      style={{ fontFamily: 'var(--font-document)' }} />
  );
}
