/**
 * LaTeX exporter (basic mapping — round-trip proof).
 * Converts the block model to a compilable .tex document. This first version
 * uses the `article` class so it compiles anywhere; IEEE/Springer class
 * fidelity is layered on next. Citations become \cite, cross-refs \ref,
 * equations/figures/tables use native LaTeX environments with \label.
 */
import type { TemplytXDocument } from '../../types/document';
import type { Template } from '../../types/compliance';
import { orderedReferences } from '../references/format';
import { listReferencesSync } from '../../services/references';

const CITE_RE = /\[\[cite:([a-z0-9-]+)\]\]/gi;
const REF_RE = /\[\[ref:([a-z0-9:-]+)\]\]/gi;

/** Escape LaTeX special characters in plain author text. */
function texEscape(s: string): string {
  return s
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/** Convert a reference id to a stable LaTeX cite key. */
function citeKeyFor(id: string, keyMap: Map<string, string>): string {
  return keyMap.get(id) ?? id.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Convert rich paragraph HTML (with cite/ref tokens) to LaTeX.
 * Handles b/strong -> \textbf, i/em -> \textit, sup -> \textsuperscript,
 * sub -> \textsubscript, and the citation/cross-ref tokens.
 */
function richToLatex(html: string, keyMap: Map<string, string>,
  refLabels: Map<string, string>): string {
  let s = html;
  // Cross-ref tokens -> \ref{...}
  s = s.replace(REF_RE, (_m, id) => `\\ref{${refLabels.get(id) ?? id}}`);
  // Citation tokens: group adjacent ones into a single \cite{a,b}
  s = s.replace(/(?:\[\[cite:[a-z0-9-]+\]\]\s*)+/gi, (run) => {
    const ids = [...run.matchAll(CITE_RE)].map((m) => citeKeyFor(m[1], keyMap));
    return `\\cite{${ids.join(',')}}`;
  });
  // Inline formatting tags -> LaTeX
  s = s
    .replace(/<(b|strong)>/gi, '\\textbf{').replace(/<\/(b|strong)>/gi, '}')
    .replace(/<(i|em)>/gi, '\\textit{').replace(/<\/(i|em)>/gi, '}')
    .replace(/<sup>/gi, '\\textsuperscript{').replace(/<\/sup>/gi, '}')
    .replace(/<sub>/gi, '\\textsubscript{').replace(/<\/sub>/gi, '}')
    .replace(/<br\s*\/?>/gi, '\\\\')
    .replace(/<[^>]+>/g, ''); // strip any other tags
  // Escape bare LaTeX specials that are NOT part of our inserted commands.
  // (We inserted \textbf{...}, \cite{...}, \ref{...}; protect & % # $ _ in text.)
  s = s.replace(/([&%#$])/g, '\\$1');
  // Decode a few common HTML entities.
  s = s.replace(/&amp;/g, '\\&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
       .replace(/&nbsp;/g, '~');
  return s;
}

export function buildLatex(doc: TemplytXDocument, tpl: Template): string {
  const pool = listReferencesSync();
  const refList = orderedReferences(doc.blocks, pool, tpl);

  // Build stable cite keys per reference.
  const keyMap = new Map<string, string>();
  refList.forEach((r, i) => keyMap.set(r.id, r.citeKey || `ref${i + 1}`));

  // Cross-ref labels: figures/tables/equations get \label{fig:id} etc.
  const refLabels = new Map<string, string>();
  let figN = 0, tabN = 0, eqN = 0;
  doc.blocks.forEach((b) => {
    if (b.type === 'figure') { figN++; refLabels.set(b.id, `fig:${b.id.slice(0, 8)}`);
      (b.subfigures ?? []).forEach((s) => refLabels.set(`${b.id}:${s.id}`, `fig:${b.id.slice(0, 8)}:${s.id.slice(0, 6)}`)); }
    else if (b.type === 'table') { tabN++; refLabels.set(b.id, `tab:${b.id.slice(0, 8)}`); }
    else if (b.type === 'equation') { eqN++; refLabels.set(b.id, `eq:${b.id.slice(0, 8)}`); }
  });

  const body = doc.blocks.map((b) => {
    switch (b.type) {
      case 'section':
        return `\\section{${texEscape(b.title)}}`;
      case 'paragraph':
        return richToLatex(b.content, keyMap, refLabels) + '\n';
      case 'equation': {
        const lbl = refLabels.get(b.id);
        return `\\begin{equation}\\label{${lbl}}\n${b.latex || ''}\n\\end{equation}`;
      }
      case 'figure': {
        const lbl = refLabels.get(b.id);
        const cap = texEscape(b.caption || '');
        if (b.subfigures && b.subfigures.length > 0) {
          const per = b.perRow ?? 2;
          const w = (0.95 / per).toFixed(2);
          const subs = b.subfigures.map((s) => {
            const slbl = refLabels.get(`${b.id}:${s.id}`);
            const img = s.src
              ? `\\includegraphics[width=\\linewidth]{${s.src}}`
              : `\\fbox{\\rule{0pt}{2cm}\\rule{2cm}{0pt}}`;
            return `  \\begin{subfigure}{${w}\\textwidth}\n    ${img}\n    \\caption{${texEscape(s.caption || '')}}\\label{${slbl}}\n  \\end{subfigure}`;
          }).join('\n  \\hfill\n');
          return `\\begin{figure}[htbp]\n  \\centering\n${subs}\n  \\caption{${cap}}\\label{${lbl}}\n\\end{figure}`;
        }
        const width = b.width && b.width < 100 ? (b.width / 100).toFixed(2) : '0.8';
        const img = b.src
          ? `\\includegraphics[width=${width}\\linewidth]{${b.src}}`
          : `\\fbox{\\rule{0pt}{3cm}\\rule{4cm}{0pt}}`;
        return `\\begin{figure}[htbp]\n  \\centering\n  ${img}\n  \\caption{${cap}}\\label{${lbl}}\n\\end{figure}`;
      }
      case 'table': {
        const lbl = refLabels.get(b.id);
        const cap = texEscape(b.caption || '');
        const cols = b.rows[0]?.length ?? 1;
        const align = (b.align ?? Array(cols).fill('left')).map((a) =>
          a === 'center' ? 'c' : a === 'right' ? 'r' : 'l');
        const colspec = b.colLines ? '|' + align.join('|') + '|' : align.join('');
        const rowsTex = b.rows.map((row, ri) => {
          const cells = row.map((c) => texEscape(c)).join(' & ');
          let line = `    ${cells} \\\\`;
          if (ri === 0 && b.headerRule) line += '\n    \\midrule';
          else if (b.rowLines && ri < b.rows.length - 1) line += '\n    \\hline';
          return line;
        }).join('\n');
        const top = b.topRule ? '    \\toprule\n' : '';
        const bottom = b.bottomRule ? '\n    \\bottomrule' : '';
        return `\\begin{table}[htbp]\n  \\centering\n  \\caption{${cap}}\\label{${lbl}}\n  \\begin{tabular}{${colspec}}\n${top}${rowsTex}${bottom}\n  \\end{tabular}\n\\end{table}`;
      }
      default: return '';
    }
  }).join('\n\n');

  // Authors
  const authorTex = doc.authors.length
    ? doc.authors.map((a) => texEscape(a.name)).join(' \\and ')
    : 'Anonymous';

  // Bibliography (manual thebibliography so no external .bib needed).
  const bib = refList.length ? `
\\begin{thebibliography}{99}
${refList.map((r) => {
    const key = keyMap.get(r.id);
    const authors = (r.authors || []).map((a) => texEscape(a)).join(', ');
    const year = r.year ? ` (${r.year})` : '';
    const title = texEscape(r.title || '');
    const container = r.container ? `. \\textit{${texEscape(r.container)}}` : '';
    return `\\bibitem{${key}} ${authors}${year}. ${title}${container}.`;
  }).join('\n')}
\\end{thebibliography}` : '';

  const usesSubfig = doc.blocks.some((b) => b.type === 'figure' && (b.subfigures?.length ?? 0) > 0);
  const usesGraphics = doc.blocks.some((b) => b.type === 'figure');
  const usesBooktabs = doc.blocks.some((b) => b.type === 'table' && (b.topRule || b.bottomRule || b.headerRule));

  return `\\documentclass[11pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath,amssymb}
${usesGraphics ? '\\usepackage{graphicx}' : ''}
${usesSubfig ? '\\usepackage{subcaption}' : ''}
${usesBooktabs ? '\\usepackage{booktabs}' : ''}
\\usepackage[numbers]{natbib}
\\title{${texEscape(doc.title || 'Untitled')}}
\\author{${authorTex}}
\\date{\\today}
\\begin{document}
\\maketitle
${body}
${bib}
\\end{document}`;
}
