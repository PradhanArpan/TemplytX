/**
 * Rich-text paragraph editor (contentEditable). Formatting is driven by the
 * shared top toolbar (see EditorToolbar) which acts on the focused block, so
 * this component no longer carries its own toolbar. It renders [[cite:id]]
 * tokens as non-editable chips and converts back to tokens on save.
 */
import { useEffect, useRef } from 'react';

const CITE_RE = /\[\[cite:([a-z0-9-]+)\]\]/gi;

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
