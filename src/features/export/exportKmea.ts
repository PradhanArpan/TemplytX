/**
 * KMEA Report exporter. Generates a main .tex that uses the bundled
 * kmeareport.sty (Times New Roman via fontspec — compiled with XeLaTeX),
 * sets the report metadata, includes the bundled branded front/back matter,
 * and emits the document's blocks as chapters/sections.
 *
 * The bundled KMEA template (kmeareport.sty, front/, back/, logos/) must be in
 * the server's classes/ folder so \usepackage{kmeareport} and \input{front/...}
 * resolve. The server auto-detects fontspec and compiles with XeLaTeX.
 */
import type { TemplytXDocument } from '../../types/document';
import { orderedReferences } from '../references/format';
import { listReferencesSync } from '../../services/references';

const CITE_RE = /\[\[cite:([a-z0-9-]+)\]\]/gi;
const REF_RE = /\[\[ref:([a-z0-9:-]+)\]\]/gi;

function texEscape(s: string): string {
  return (s || '')
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function richToLatex(html: string, keyMap: Map<string, string>,
  refLabels: Map<string, string>, refKind: Map<string, string>): string {
  let s = html;
  const stash: string[] = [];
  const keep = (t: string) => { stash.push(t); return `\u0000${stash.length - 1}\u0000`; };
  s = s.replace(REF_RE, (_m, id, offset: number) => {
    const label = refLabels.get(id) ?? id;
    const kind = refKind.get(id) ?? 'figure';
    const before = html.slice(0, offset).replace(/<[^>]*>/g, '').replace(/\s+$/, '');
    const atStart = before === '' || /[.!?]$/.test(before);
    const word = kind === 'figure' ? (atStart ? 'Figure' : 'Fig.')
      : kind === 'equation' ? (atStart ? 'Equation' : 'Eq.') : 'Table';
    if (kind === 'equation') return keep(`${word}~(\\ref{${label}})`);
    return keep(`${word}~\\ref{${label}}`);
  });
  s = s.replace(/(?:\[\[cite:[a-z0-9-]+\]\]\s*)+/gi, (run) => {
    const ids = [...run.matchAll(CITE_RE)].map((m) => keyMap.get(m[1]) ?? m[1].replace(/[^a-zA-Z0-9]/g, ''));
    return keep(`\\cite{${ids.join(',')}}`);
  });
  s = s
    .replace(/<(b|strong)>/gi, () => keep('\\textbf{')).replace(/<\/(b|strong)>/gi, () => keep('}'))
    .replace(/<(i|em)>/gi, () => keep('\\textit{')).replace(/<\/(i|em)>/gi, () => keep('}'))
    .replace(/<sup>/gi, () => keep('\\textsuperscript{')).replace(/<\/sup>/gi, () => keep('}'))
    .replace(/<sub>/gi, () => keep('\\textsubscript{')).replace(/<\/sub>/gi, () => keep('}'))
    .replace(/<[^>]+>/g, '');
  s = s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
  s = s.replace(/([&%$#_{}])/g, '\\$1').replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}');
  // XeLaTeX + fontspec handles Unicode natively, so we DON'T convert Greek/₹ etc.
  s = s.replace(/\u0000(\d+)\u0000/g, (_m, i) => stash[Number(i)]);
  return s;
}

export function buildKmea(doc: TemplytXDocument): string {
  const syncPool = listReferencesSync();
  const byId = new Map<string, typeof syncPool[number]>();
  [...syncPool, ...(doc.references ?? [])].forEach((r) => byId.set(r.id, r));
  const pool = [...byId.values()];
  const refList = orderedReferences(doc.blocks, pool, null);
  const keyMap = new Map<string, string>();
  refList.forEach((r, i) => keyMap.set(r.id, (r.citeKey || `ref${i + 1}`).replace(/[^a-zA-Z0-9]/g, '') || `ref${i + 1}`));

  const refLabels = new Map<string, string>();
  const refKind = new Map<string, string>();
  doc.blocks.forEach((b) => {
    if (b.type === 'figure') { refLabels.set(b.id, `fig:${b.id.slice(0, 8)}`); refKind.set(b.id, 'figure'); }
    else if (b.type === 'table') { refLabels.set(b.id, `tab:${b.id.slice(0, 8)}`); refKind.set(b.id, 'table'); }
    else if (b.type === 'equation') { refLabels.set(b.id, `eq:${b.id.slice(0, 8)}`); refKind.set(b.id, 'equation'); }
  });

  // Titles that are front-matter, not numbered chapters.
  const FRONT = /^(foreword|acknowledge?ments?|executive summary|summary|preface|abstract)$/i;
  const parts: string[] = [];
  let openedChapter = false;
  for (const b of doc.blocks) {
    if (b.type === 'section') {
      const lvl = (b as { level?: number }).level ?? 1;
      const rawTitle = (b as { title: string }).title;
      const title = texEscape(rawTitle);
      if (lvl <= 1 && FRONT.test(rawTitle.trim())) {
        // Unnumbered chapter, still listed in the ToC.
        parts.push(`\\chapter*{${title}}\\addcontentsline{toc}{chapter}{${title}}`);
        openedChapter = true;
      } else if (lvl <= 1) { parts.push(`\\chapter{${title}}`); openedChapter = true; }
      else if (lvl === 2) { if (!openedChapter) { parts.push('\\chapter{Introduction}'); openedChapter = true; } parts.push(`\\section{${title}}`); }
      else { if (!openedChapter) { parts.push('\\chapter{Introduction}'); openedChapter = true; } parts.push(`\\subsection{${title}}`); }
    } else if (b.type === 'paragraph') {
      if (!openedChapter) { parts.push('\\chapter{Introduction}'); openedChapter = true; }
      parts.push(richToLatex(b.content, keyMap, refLabels, refKind) + '\n');
    } else if (b.type === 'equation') {
      parts.push(`\\begin{equation}\\label{${refLabels.get(b.id)}}\n${b.latex || ''}\n\\end{equation}`);
    } else if (b.type === 'figure') {
      const cap = texEscape(b.caption || '');
      const localImg = (src: string, w: string) =>
        src && !/^https?:\/\//i.test(src) ? `\\includegraphics[width=${w}]{${src}}` : `\\fbox{\\parbox[c][2cm][c]{${w}}{\\centering [figure]}}`;
      const width = b.width && b.width < 100 ? (b.width / 100).toFixed(2) : '0.8';
      parts.push(`\\begin{figure}[htbp]\n\\centering\n${localImg(b.src, `${width}\\linewidth`)}\n\\caption{${cap}}\\label{${refLabels.get(b.id)}}\n\\end{figure}`);
    } else if (b.type === 'table') {
      const cap = texEscape(b.caption || '');
      const cols = b.rows[0]?.length ?? 1;
      const alignCh = (i: number) => {
        const a = (b.align ?? [])[i];
        return a === 'center' ? 'c' : a === 'right' ? 'r' : 'l';
      };
      // Bold the header row (first row); wrap other cells.
      const bodyRows = b.rows.map((r, ri) => {
        const cells = r.map((c) => ri === 0 ? `\\textbf{${texEscape(c)}}` : texEscape(c));
        let line = '    ' + cells.join(' & ') + ' \\\\';
        if (ri === 0) line += '\n    \\midrule';
        return line;
      }).join('\n');

      // Column spec: for wider tables use tabularx (auto-fits \textwidth,
      // wraps long cells). Narrow tables use plain l/c/r so they don't stretch.
      let colspec: string, wrap = false;
      if (cols >= 3) {
        wrap = true;
        colspec = Array.from({ length: cols }, (_, i) => {
          const a = alignCh(i);
          return a === 'c' ? '>{\\centering\\arraybackslash}X'
            : a === 'r' ? '>{\\raggedleft\\arraybackslash}X' : 'X';
        }).join('');
      } else {
        colspec = Array.from({ length: cols }, (_, i) => alignCh(i)).join('');
      }

      const veryWide = cols >= 6;
      const openTable = veryWide ? '\\begin{table}[htbp]\n\\centering\n\\begin{landscape}' : '\\begin{table}[htbp]\n\\centering';
      const closeTable = veryWide ? '\\end{landscape}\n\\end{table}' : '\\end{table}';
      const tbl = wrap
        ? `\\begin{tabularx}{\\textwidth}{${colspec}}\n    \\toprule\n${bodyRows}\n    \\bottomrule\n\\end{tabularx}`
        : `\\begin{tabular}{${colspec}}\n    \\toprule\n${bodyRows}\n    \\bottomrule\n\\end{tabular}`;
      parts.push(`${openTable}\n\\caption{${cap}}\\label{${refLabels.get(b.id)}}\n${tbl}\n${closeTable}`);
    }
  }
  const body = parts.join('\n\n') || '\\chapter{Introduction}\n';

  const bib = refList.length ? `
\\begin{thebibliography}{99}
${refList.map((r) => `\\bibitem{${keyMap.get(r.id)}} ${texEscape((r.authors || []).join(', '))}${r.year ? ` (${r.year})` : ''}. ${texEscape(r.title || '')}.`).join('\n')}
\\end{thebibliography}` : '';

  const title = texEscape(doc.title || 'KMEA Report');

  return `\\documentclass[12pt,a4paper,oneside]{report}
\\usepackage{kmeareport}
\\usepackage{nicefrac}
\\usepackage{booktabs}
\\usepackage{pdflscape}
\\usepackage[table]{xcolor}
\\definecolor{headerblue}{RGB}{173, 216, 230}
\\let\\oldtoprule\\toprule
\\renewcommand{\\toprule}{\\oldtoprule\\rowcolor{headerblue}}
\\reporttitle{${title}}
\\reportagency{Karnataka Monitoring \\& Evaluation Authority}
\\reportPI{Dr Shibu K Mani}
\\reportinstitution{CHRIST (Deemed to be University)}
\\reportdate{\\today}
\\begin{document}
\\input{front/cover}
\\input{front/inside-title}\\newpage
\\input{front/copyright}
\\input{front/title-block}
\\setcounter{tocdepth}{1}
\\tableofcontents
\\clearpage
${body}
${bib}
\\end{document}`;
}
