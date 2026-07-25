/**
 * HTML/PDF exporter. Renders the block model to a print-ready HTML document
 * styled to the template's MANUSCRIPT formatting (paper size, columns,
 * spacing, font, section numbering) with auto-numbered floats. The browser's
 * print-to-PDF turns this into the downloadable PDF — no backend needed.
 */
import katex from 'katex';
import type { TemplytXDocument } from '../../types/document';
import type { Template } from '../../types/compliance';
import { computeNumbering } from './numbering';
import { markerMap, renderCitations, orderedReferences, formatEntry } from '../references/format';
import { listReferencesSync } from '../../services/references';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const spacingMap = { single: 1.15, onehalf: 1.5, double: 2 };

export function buildManuscriptHtml(doc: TemplytXDocument, tpl: Template): string {
  const fmt = tpl.formatting;
  const num = computeNumbering(doc.blocks, fmt.numberSections);
  const margin = fmt.paperSize === 'a4' ? '2.5cm' : '1in';
  const pool = listReferencesSync();
  const markers = markerMap(doc.blocks, pool, tpl);
  const refList = orderedReferences(doc.blocks, pool, tpl);

  let secN = 0;
  const body = doc.blocks.map((b) => {
    switch (b.type) {
      case 'section': {
        const n = fmt.numberSections ? `${++secN}. ` : '';
        return `<h2 class="sec">${n}${esc(b.title)}</h2>`;
      }
      case 'paragraph':
        return `<p>${esc(renderCitations(b.content, markers))}</p>`;
      case 'equation': {
        const n = num.equations.get(b.id);
        let math = '';
        try { math = katex.renderToString(b.latex || '\\;', { displayMode: true, throwOnError: false }); }
        catch { math = esc(b.latex); }
        return `<div class="eq"><span class="eq-body">${math}</span><span class="eq-num">(${n})</span></div>`;
      }
      case 'figure': {
        const n = num.figures.get(b.id);
        const img = b.src ? `<img src="${esc(b.src)}" alt="${esc(b.caption)}"/>`
          : `<div class="fig-ph">[Figure ${n}]</div>`;
        return `<figure class="fig">${img}<figcaption><strong>Figure ${n}.</strong> ${esc(b.caption)}</figcaption></figure>`;
      }
      case 'table': {
        const n = num.tables.get(b.id);
        const rows = b.rows.map((r, ri) =>
          `<tr>${r.map((c) => ri === 0 ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
        const cap = b.caption ? ` ${esc(b.caption)}` : '';
        return `<div class="tbl"><div class="tbl-cap"><strong>Table ${n}.</strong>${cap}</div><table>${rows}</table></div>`;
      }
      default: return '';
    }
  }).join('\n');

  const refsHtml = refList.length > 0
    ? `<h2 class="sec">References</h2>` +
      refList.map((r, i) => `<p class="ref">${esc(formatEntry(r, i, tpl))}</p>`).join('\n')
    : '';

  const authorBlock = doc.authors.length > 0
    ? `<div class="authors">${doc.authors.map((a) =>
        `<span class="author">${esc(a.name)}${a.isCorresponding ? '<sup>*</sup>' : ''}${a.affiliation ? `<br><span class="affil">${esc(a.affiliation)}</span>` : ''}</span>`
      ).join('')}</div>${doc.authors.some((a) => a.isCorresponding) ? '<div class="corr">* Corresponding author</div>' : ''}`
    : '';

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>${esc(doc.title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<style>
  @page { size: ${fmt.paperSize}; margin: ${margin}; }
  body { font-family: ${fmt.bodyFont ? `'${fmt.bodyFont}', ` : ''}serif;
    font-size: ${fmt.bodyFontPt}pt; line-height: ${spacingMap[fmt.lineSpacing]};
    color: #000; margin: 0; }
  .wrap { ${fmt.columns === 2 ? 'column-count: 2; column-gap: 0.5cm;' : ''} }
  h1.title { font-size: ${fmt.bodyFontPt + 6}pt; text-align: center; margin: 0 0 8pt; column-span: all; }
  .authors { text-align: center; column-span: all; margin-bottom: 6pt; }
  .author { display: inline-block; margin: 0 12pt; font-size: ${fmt.bodyFontPt}pt; }
  .affil { font-size: ${fmt.bodyFontPt - 2}pt; color: #333; font-style: italic; }
  .corr { text-align: center; column-span: all; font-size: ${fmt.bodyFontPt - 2}pt; color: #333; margin-bottom: 12pt; }
  .meta { text-align: center; color: #333; margin-bottom: 16pt; column-span: all; font-size: ${fmt.bodyFontPt - 1}pt; }
  h2.sec { font-size: ${fmt.bodyFontPt + 1}pt; margin: 12pt 0 4pt; }
  p { margin: 0 0 6pt; text-align: justify; }
  p.ref { padding-left: 1.5em; text-indent: -1.5em; text-align: left; }
  .eq { display: flex; align-items: center; justify-content: center; gap: 12pt; margin: 8pt 0; }
  .eq-num { color: #333; }
  figure.fig { margin: 10pt 0; text-align: center; break-inside: avoid; }
  .fig-ph { border: 1px dashed #999; padding: 24pt; color: #777; }
  figure.fig img { max-width: 100%; }
  figcaption { font-size: ${fmt.bodyFontPt - 1}pt; margin-top: 4pt; }
  .tbl { margin: 10pt 0; break-inside: avoid; }
  .tbl-cap { font-size: ${fmt.bodyFontPt - 1}pt; margin-bottom: 4pt; }
  table { border-collapse: collapse; width: 100%; font-size: ${fmt.bodyFontPt - 1}pt; }
  th, td { border: 1px solid #000; padding: 3pt 6pt; text-align: left; }
  @media print { .no-print { display: none; } }
  .toolbar { position: fixed; top: 0; left: 0; right: 0; background: #185FA5; color: #fff;
    padding: 10px 16px; font-family: system-ui, sans-serif; display: flex; gap: 12px;
    align-items: center; justify-content: space-between; }
  .toolbar button { background: #fff; color: #185FA5; border: none; padding: 7px 14px;
    border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; }
  .doc { margin-top: 52px; }
  @media print { .doc { margin-top: 0; } }
</style></head>
<body>
<div class="toolbar no-print">
  <span>${esc(tpl.name)} — manuscript format. Use your browser's "Save as PDF".</span>
  <button onclick="window.print()">Save as PDF</button>
</div>
<div class="doc"><div class="wrap">
  <h1 class="title">${esc(doc.title)}</h1>
  ${authorBlock}
  <div class="meta">Prepared with TemplytX · ${esc(tpl.publisher)} ${esc(tpl.type)} template</div>
  ${body}
  ${refsHtml}
</div></div>
</body></html>`;
}

/** Opens the manuscript in a new tab where the user can Save-as-PDF. */
export function exportPdf(doc: TemplytXDocument, tpl: Template) {
  const html = buildManuscriptHtml(doc, tpl);
  const w = window.open('', '_blank');
  if (!w) { alert('Please allow pop-ups to export.'); return; }
  w.document.write(html);
  w.document.close();
}
