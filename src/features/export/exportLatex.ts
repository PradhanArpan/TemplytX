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
  return unicodeToLatex(s
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}'));
}

/** Map common Unicode characters (Greek, math symbols) to LaTeX so pdflatex
 *  accepts them without relying on Unicode font setup. */
const UNICODE_MAP: Record<string, string> = {
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'ε': '\\epsilon',
  'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta', 'ι': '\\iota', 'κ': '\\kappa',
  'λ': '\\lambda', 'μ': '\\mu', 'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi',
  'ρ': '\\rho', 'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\phi',
  'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
  'Γ': '\\Gamma', 'Δ': '\\Delta', 'Θ': '\\Theta', 'Λ': '\\Lambda', 'Ξ': '\\Xi',
  'Π': '\\Pi', 'Σ': '\\Sigma', 'Φ': '\\Phi', 'Ψ': '\\Psi', 'Ω': '\\Omega',
  '±': '\\pm', '×': '\\times', '÷': '\\div', '≤': '\\leq', '≥': '\\geq',
  '≠': '\\neq', '≈': '\\approx', '∞': '\\infty', '∑': '\\sum', '∫': '\\int',
  '√': '\\surd', '∂': '\\partial', '∇': '\\nabla', '∝': '\\propto', '∈': '\\in',
  '→': '\\rightarrow', '←': '\\leftarrow', '↔': '\\leftrightarrow',
  '°': '\\textdegree{}', '·': '\\cdot', '′': "'", '″': "''",
  '–': '--', '—': '---', '“': '``', '”': "''", '‘': '`', '’': "'",
  '₹': '\\rupee{}', '€': '\\texteuro{}', '£': '\\pounds{}', '¥': '\\textyen{}',
  '•': '\\textbullet{}', '…': '\\ldots{}', '™': '\\texttrademark{}', '©': '\\textcopyright{}',
  '®': '\\textregistered{}', '½': '\\textonehalf{}', '¼': '\\textonequarter{}', '¾': '\\textthreequarters{}',
};

/** Replace Unicode symbols with LaTeX (Greek/math wrapped in math mode). */
function unicodeToLatex(s: string): string {
  return s.replace(/[^\x00-\x7F]/g, (ch) => {
    const tex = UNICODE_MAP[ch];
    if (!tex) return ch;
    const isMath = /\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega|pm|times|div|leq|geq|neq|approx|infty|sum|int|surd|partial|nabla|propto|in|rightarrow|leftarrow|leftrightarrow|cdot)/.test(tex);
    return isMath ? `$${tex}$` : tex;
  });
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
  refLabels: Map<string, string>, refKind: Map<string, 'figure' | 'table' | 'equation'>): string {
  let s = html;
  // 1) Protect our tokens by converting them to placeholders first.
  const stash: string[] = [];
  const keep = (tex: string) => { stash.push(tex); return `\u0000${stash.length - 1}\u0000`; };
  // Cross-refs: emit the word + \ref. Sentence-position aware: at the start of
  // a sentence spell out "Figure"/"Equation"; mid-sentence abbreviate.
  s = s.replace(REF_RE, (_m, id, offset: number) => {
    const label = refLabels.get(id) ?? id;
    const kind = refKind.get(id) ?? 'figure';
    const before = html.slice(0, offset).replace(/<[^>]*>/g, '').replace(/\s+$/, '');
    const atStart = before === '' || /[.!?]$/.test(before);
    let word: string;
    if (kind === 'figure') word = atStart ? 'Figure' : 'Fig.';
    else if (kind === 'equation') word = atStart ? 'Equation' : 'Eq.';
    else word = 'Table';
    if (kind === 'equation') return keep(`${word}~(\\ref{${label}})`);
    return keep(`${word}~\\ref{${label}}`);
  });
  s = s.replace(/(?:\[\[cite:[a-z0-9-]+\]\]\s*)+/gi, (run) => {
    const ids = [...run.matchAll(CITE_RE)].map((m) => citeKeyFor(m[1], keyMap));
    return keep(`\\cite{${ids.join(',')}}`);
  });
  // 2) Convert inline formatting tags to placeholders for their commands.
  s = s
    .replace(/<(b|strong)>/gi, () => keep('\\textbf{')).replace(/<\/(b|strong)>/gi, () => keep('}'))
    .replace(/<(i|em)>/gi, () => keep('\\textit{')).replace(/<\/(i|em)>/gi, () => keep('}'))
    .replace(/<sup>/gi, () => keep('\\textsuperscript{')).replace(/<\/sup>/gi, () => keep('}'))
    .replace(/<sub>/gi, () => keep('\\textsubscript{')).replace(/<\/sub>/gi, () => keep('}'))
    .replace(/<br\s*\/?>/gi, () => keep('\\\\'))
    .replace(/<[^>]+>/g, ''); // strip any other tags
  // 3) Decode common HTML entities to plain chars (so they get escaped next).
  s = s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
  // 4) Now escape LaTeX specials in the remaining TEXT only.
  s = s.replace(/([&%$#_{}])/g, '\\$1').replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}');
  // 4b) Convert Unicode Greek/symbols to LaTeX so pdflatex accepts them.
  s = unicodeToLatex(s);
  // 5) Restore the protected LaTeX commands.
  s = s.replace(/\u0000(\d+)\u0000/g, (_m, i) => stash[Number(i)]);
  return s;
}

export type LatexMode = 'submission' | 'cameraready';

export function buildLatex(doc: TemplytXDocument, tpl: Template, mode: LatexMode = 'submission', customClass = ''): string {
  // Combine the document's stored references with the in-memory pool so
  // citations always resolve (the sync cache may be cold at export time).
  const syncPool = listReferencesSync();
  const byId = new Map<string, typeof syncPool[number]>();
  [...syncPool, ...(doc.references ?? [])].forEach((r) => byId.set(r.id, r));
  const pool = [...byId.values()];
  const refList = orderedReferences(doc.blocks, pool, tpl);

  // Build stable cite keys per reference.
  const keyMap = new Map<string, string>();
  // LaTeX cite keys must avoid special chars; sanitize to letters/digits.
  refList.forEach((r, i) => {
    const raw = r.citeKey || `ref${i + 1}`;
    const safe = raw.replace(/[^a-zA-Z0-9]/g, '') || `ref${i + 1}`;
    keyMap.set(r.id, safe);
  });

  // Cross-ref labels + kinds: figures/tables/equations get \label{fig:id} etc.
  const refLabels = new Map<string, string>();
  const refKind = new Map<string, 'figure' | 'table' | 'equation'>();
  doc.blocks.forEach((b) => {
    if (b.type === 'figure') { refLabels.set(b.id, `fig:${b.id.slice(0, 8)}`); refKind.set(b.id, 'figure');
      (b.subfigures ?? []).forEach((s) => { refLabels.set(`${b.id}:${s.id}`, `fig:${b.id.slice(0, 8)}:${s.id.slice(0, 6)}`); refKind.set(`${b.id}:${s.id}`, 'figure'); }); }
    else if (b.type === 'table') { refLabels.set(b.id, `tab:${b.id.slice(0, 8)}`); refKind.set(b.id, 'table'); }
    else if (b.type === 'equation') { refLabels.set(b.id, `eq:${b.id.slice(0, 8)}`); refKind.set(b.id, 'equation'); }
  });

  const family: 'ieee' | 'springer' | 'elsevier' | 'article' =
    (tpl.citationStyle === 'ieee' || /ieee/i.test(tpl.name)) ? 'ieee'
    : (tpl.citationStyle === 'springer' || /springer/i.test(tpl.name)) ? 'springer'
    : (tpl.citationStyle === 'elsevier' || /elsevier/i.test(tpl.name)) ? 'elsevier'
    : 'article';
  const isJournal = family !== 'article';

  // For journal classes, the abstract is an environment placed after
  // \maketitle, not a numbered section. Lift the Abstract section + its
  // following paragraph(s) into \begin{abstract}.
  let abstractTex = '';
  const abstractBlockIds = new Set<string>();
  if (isJournal) {
    const idx = doc.blocks.findIndex((b) => b.type === 'section' && /^abstract$/i.test((b as { title: string }).title.trim()));
    if (idx !== -1) {
      abstractBlockIds.add(doc.blocks[idx].id);
      const parts: string[] = [];
      for (let i = idx + 1; i < doc.blocks.length; i++) {
        const nb = doc.blocks[i];
        if (nb.type === 'section') break;
        abstractBlockIds.add(nb.id);
        if (nb.type === 'paragraph') parts.push(richToLatex(nb.content, keyMap, refLabels, refKind));
      }
      abstractTex = parts.join(' ');
    }
  }

  // Whether the output is two-column (so wide floats need starred envs).
  const twoCol = (family === 'ieee' && mode === 'cameraready')
    || (family === 'elsevier' && mode === 'cameraready');

  const body = doc.blocks.map((b) => {
    if (abstractBlockIds.has(b.id)) return ''; // handled in the abstract env
    switch (b.type) {
      case 'section': {
        // Abstract is special: unnumbered, conventionally set apart.
        if (/^abstract$/i.test(b.title.trim())) return `\\section*{${texEscape(b.title)}}`;
        const lvl = (b as { level?: number }).level ?? 1;
        const cmd = lvl <= 1 ? 'section' : lvl === 2 ? 'subsection' : 'subsubsection';
        return `\\${cmd}{${texEscape(b.title)}}`;
      }
      case 'paragraph':
        return richToLatex(b.content, keyMap, refLabels, refKind) + '\n';
      case 'equation': {
        const lbl = refLabels.get(b.id);
        return `\\begin{equation}\\label{${lbl}}\n${b.latex || ''}\n\\end{equation}`;
      }
      case 'figure': {
        const lbl = refLabels.get(b.id);
        const cap = texEscape(b.caption || '');
        // Local pdflatex can't fetch remote (http) images. If the src is a
        // remote URL, use a placeholder box so the document still compiles.
        // (The server-side image fetch will replace these once enabled.)
        const localImg = (src: string, w: string) =>
          src && !/^https?:\/\//i.test(src)
            ? `\\includegraphics[width=${w}]{${src}}`
            : `\\fbox{\\parbox[c][2cm][c]{${w}}{\\centering [figure]}}`;
        if (b.subfigures && b.subfigures.length > 0) {
          const per = b.perRow ?? 2;
          const wv = (0.95 / per).toFixed(2);
          const subs = b.subfigures.map((s) => {
            const slbl = refLabels.get(`${b.id}:${s.id}`);
            return `  \\begin{subfigure}{${wv}\\textwidth}\n    \\centering\n    ${localImg(s.src, '\\linewidth')}\n    \\caption{${texEscape(s.caption || '')}}\\label{${slbl}}\n  \\end{subfigure}`;
          }).join('\n  \\hfill\n');
          // Multi-image figures span both columns in two-column layouts.
          const env = twoCol ? 'figure*' : 'figure';
          return `\\begin{${env}}[htbp]\n  \\centering\n${subs}\n  \\caption{${cap}}\\label{${lbl}}\n\\end{${env}}`;
        }
        const width = b.width && b.width < 100 ? (b.width / 100).toFixed(2) : '0.8';
        return `\\begin{figure}[htbp]\n  \\centering\n  ${localImg(b.src, `${width}\\linewidth`)}\n  \\caption{${cap}}\\label{${lbl}}\n\\end{figure}`;
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
        // Tables with several columns span both columns in two-column layouts.
        const env = (twoCol && cols >= 3) ? 'table*' : 'table';
        return `\\begin{${env}}[htbp]\n  \\centering\n  \\caption{${cap}}\\label{${lbl}}\n  \\begin{tabular}{${colspec}}\n${top}${rowsTex}${bottom}\n  \\end{tabular}\n\\end{${env}}`;
      }
      default: return '';
    }
  }).filter(Boolean).join('\n\n');

  // Authors (article-class default; IEEE uses its own block below).
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
  // Springer/Elsevier classes bundle their own citation handling; loading the
  // `cite` package on top breaks \cite (the \@citex error). Only IEEE/article
  // need it.
  const wantsCitePkg = family === 'ieee' || family === 'article';
  const pkgs = [
    '\\usepackage[T1]{fontenc}',
    '\\usepackage{textcomp}',
    '\\IfFileExists{tfrupee.sty}{\\usepackage{tfrupee}}{\\providecommand{\\rupee}{Rs.}}',
    '\\usepackage{amsmath,amssymb}',
    usesGraphics ? '\\usepackage{graphicx}' : '',
    usesSubfig ? '\\usepackage{subcaption}' : '',
    usesBooktabs ? '\\usepackage{booktabs}' : '',
    wantsCitePkg ? '\\usepackage{cite}' : '',
  ].filter(Boolean).join('\n');

  const title = texEscape(doc.title || 'Untitled');
  const abstractEnv = abstractTex ? `\\begin{abstract}\n${abstractTex}\n\\end{abstract}\n` : '';

  // Custom uploaded journal class: use it directly with a GENERIC mapping.
  // We do NOT force the 'cite' package (the class provides its own citation
  // handling per Arpan's rule). thebibliography works across classes.
  if (customClass.trim()) {
    const cls = customClass.trim().replace(/[^a-zA-Z0-9._-]/g, '');
    const genericPkgs = [
      '\\usepackage[utf8]{inputenc}',
      '\\usepackage[T1]{fontenc}',
      '\\usepackage{amsmath,amssymb}',
      usesGraphics ? '\\usepackage{graphicx}' : '',
      usesSubfig ? '\\usepackage{subcaption}' : '',
      usesBooktabs ? '\\usepackage{booktabs}' : '',
    ].filter(Boolean).join('\n');
    return `\\documentclass{${cls}}
${genericPkgs}
\\title{${title}}
\\author{${authorTex}}
\\begin{document}
\\maketitle
${abstractEnv}${body}
${bib}
\\end{document}`;
  }

  if (family === 'ieee') {
    // Camera-ready: two-column conference. Submission: single-column draft.
    const classOpts = mode === 'submission' ? 'journal,draftcls,onecolumn' : 'conference';
    const authorBlock = doc.authors.length
      ? doc.authors.map((a) =>
          `\\IEEEauthorblockN{${texEscape(a.name)}}${a.affiliation ? `\n\\IEEEauthorblockA{${texEscape(a.affiliation)}}` : ''}`
        ).join('\n\\and\n')
      : '\\IEEEauthorblockN{Anonymous}';
    return `\\documentclass[${classOpts}]{IEEEtran}
\\usepackage[utf8]{inputenc}
${pkgs}
\\title{${title}}
\\author{${authorBlock}}
\\begin{document}
\\maketitle
${abstractEnv}${body}
${bib}
\\end{document}`;
  }

  if (family === 'springer') {
    // Springer Nature sn-jnl. referee option = double-spaced submission.
    const classOpts = mode === 'submission' ? 'sn-basic,referee' : 'sn-basic';
    const authors = doc.authors.length ? doc.authors : [{ name: 'Anonymous', affiliation: '', id: '', isCorresponding: false }];
    const affils = [...new Set(authors.map((a) => a.affiliation).filter(Boolean))];
    const authorCmds = authors.map((a) => {
      const idx = a.affiliation ? affils.indexOf(a.affiliation) + 1 : 1;
      const star = a.isCorresponding ? '*' : '';
      return `\\author${star}[${idx}]{\\fnm{}\\sur{${texEscape(a.name)}}}`;
    }).join('\n');
    const affilCmds = affils.length
      ? affils.map((af, i) => `\\affil[${i + 1}]{${texEscape(af)}}`).join('\n')
      : '\\affil{}';
    return `\\documentclass[${classOpts}]{sn-jnl}
\\usepackage[utf8]{inputenc}
${pkgs}
\\begin{document}
\\title{${title}}
${authorCmds}
${affilCmds}
${abstractTex ? `\\abstract{${abstractTex}}` : ''}
\\maketitle
${body}
${bib}
\\end{document}`;
  }

  if (family === 'elsevier') {
    // Elsevier elsarticle. preprint = review submission; 3p/final = typeset.
    const classOpts = mode === 'submission' ? 'preprint,12pt' : 'final,3p,times,twocolumn';
    const authorCmds = (doc.authors.length ? doc.authors : [{ name: 'Anonymous', affiliation: '', id: '', isCorresponding: false }])
      .map((a) => `\\author{${texEscape(a.name)}}${a.affiliation ? `\n\\address{${texEscape(a.affiliation)}}` : ''}`)
      .join('\n');
    return `\\documentclass[${classOpts}]{elsarticle}
\\usepackage[utf8]{inputenc}
${pkgs}
\\begin{document}
\\begin{frontmatter}
\\title{${title}}
${authorCmds}
${abstractTex ? `\\begin{abstract}\n${abstractTex}\n\\end{abstract}` : ''}
\\end{frontmatter}
${body}
${bib}
\\end{document}`;
  }

  // Default: article class.
  return `\\documentclass[11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=1in]{geometry}
${pkgs}
\\title{${title}}
\\author{${authorTex}}
\\date{\\today}
\\begin{document}
\\maketitle
${body}
${bib}
\\end{document}`;
}
