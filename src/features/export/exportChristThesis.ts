/**
 * CHRIST SoET Thesis exporter.
 * Generates a self-contained main .tex that:
 *  - uses the bundled Thesis.cls (placed in the server's classes/ folder)
 *  - defines all ProjectVariables from the document's christThesis metadata
 *  - includes CHRIST's front-matter primitives (title page, certificates,
 *    declaration, abstract) from the bundled template
 *  - emits the user's sections as \chapter / \section content
 *  - emits figures, tables, equations, citations, and a bibliography
 *
 * The bundled CHRIST template folder must be in the server's classes/ dir so
 * \documentclass{Thesis} and \input{Primitives/...} resolve. TemplytX sends
 * only this generated main file; everything else comes from the bundle.
 */
import type { TemplytXDocument, ChristThesisMeta } from '../../types/document';

import { orderedReferences } from '../references/format';
import { listReferencesSync } from '../../services/references';

// Reuse the shared LaTeX helpers by importing from exportLatex via a light copy.
// (Kept local to avoid coupling; these mirror the tested conversions.)
const CITE_RE = /\[\[cite:([a-z0-9-]+)\]\]/gi;
const REF_RE = /\[\[ref:([a-z0-9:-]+)\]\]/gi;

const UNICODE_MAP: Record<string, string> = {
  'α':'\\alpha','β':'\\beta','γ':'\\gamma','δ':'\\delta','ε':'\\epsilon','θ':'\\theta',
  'λ':'\\lambda','μ':'\\mu','π':'\\pi','ρ':'\\rho','σ':'\\sigma','τ':'\\tau','φ':'\\phi',
  'ω':'\\omega','Δ':'\\Delta','Σ':'\\Sigma','Ω':'\\Omega','∇':'\\nabla','∂':'\\partial',
  '±':'\\pm','×':'\\times','÷':'\\div','≤':'\\leq','≥':'\\geq','≠':'\\neq','≈':'\\approx',
  '∞':'\\infty','∑':'\\sum','∫':'\\int','√':'\\surd','∝':'\\propto','∈':'\\in',
  '→':'\\rightarrow','°':'\\textdegree{}','·':'\\cdot','–':'--','—':'---',
  '“':'``','”':"''",'‘':'`','’':"'",
};
function unicodeToLatex(s: string): string {
  return s.replace(/[^\x00-\x7F]/g, (ch) => {
    const tex = UNICODE_MAP[ch];
    if (!tex) return ch;
    const isMath = /\\(alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|rho|sigma|tau|phi|omega|Delta|Sigma|Omega|nabla|partial|pm|times|div|leq|geq|neq|approx|infty|sum|int|surd|propto|in|rightarrow|cdot)/.test(tex);
    return isMath ? `$${tex}$` : tex;
  });
}
function texEscape(s: string): string {
  return unicodeToLatex((s || '')
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}'));
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
    let word = kind === 'figure' ? (atStart ? 'Figure' : 'Fig.')
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
  s = unicodeToLatex(s);
  s = s.replace(/\u0000(\d+)\u0000/g, (_m, i) => stash[Number(i)]);
  return s;
}

/** Generate the ProjectVariables.tex content from the metadata. */
function projectVariables(m: ChristThesisMeta): string {
  const authors = [...m.authors];
  while (authors.length < 5) authors.push({ name: '', regNo: '', department: '' });
  const nums = ['One', 'Two', 'Three', 'Four', 'Five'];
  const authorCmds = authors.slice(0, 5).map((a, i) => `
\\newcommand{\\AuthorName${nums[i]}}{${texEscape(a.name)}}
\\newcommand{\\RegisterNo${nums[i]}}{${texEscape(a.regNo)}}
\\newcommand{\\AuthorDepartment${nums[i]}}{${texEscape(a.department)}}`).join('\n');
  return `
\\newcommand{\\UniversityName}{CHRIST (Deemed to be University)}
\\newcommand{\\ProjectTitle}{${texEscape(m.projectTitle)}}
\\newcommand{\\ProjectTitleTwo}{${texEscape(m.projectTitleTwo)}}
\\newcommand{\\DissertationType}{${texEscape(m.dissertationType || 'A Project Report on')}}
\\newcommand{\\ProgramNameUpper}{${texEscape(m.programNameUpper)}}
\\newcommand{\\ProgramName}{${texEscape(m.programName)}}
\\newcommand{\\ProgramNameShort}{${texEscape(m.programNameShort)}}
\\newcommand{\\SpecializationName}{${texEscape(m.specialization)}}
${authorCmds}
\\newcommand{\\GuideName}{${texEscape(m.guideName)}}
\\newcommand{\\GuideDesignation}{${texEscape(m.guideDesignation)}}
\\newcommand{\\GuideDepartment}{${texEscape(m.guideDepartment)}}
\\newcommand{\\CoGuideName}{${texEscape(m.coGuideName)}}
\\newcommand{\\CoGuideDesignation}{${texEscape(m.coGuideDesignation)}}
\\newcommand{\\CoGuideDepartment}{${texEscape(m.coGuideDepartment)}}
\\newcommand{\\NameofAuthortobeCertified}{${texEscape(m.authors[0]?.name || '')}}
\\newcommand{\\DepartmentNameAddress}{\\textbf{\\large{${texEscape(m.departmentName)}\\\\ \\CollegeName, \\\\ \\UniversityName,\\\\ Kumbalagudu,\\,Bengaluru\\,-\\,560~074}}}
\\newcommand{\\ProjectDate}{${texEscape(m.projectDate)}}
\\newcommand{\\AcademicYear}{${texEscape(m.academicYear)}}
\\newcommand{\\DepartmentName}{${texEscape(m.departmentName)}}
\\newcommand{\\CollegeName}{${texEscape(m.collegeName || 'School of Engineering and Technology')}}
\\newcommand{\\HODorCoordinator}{${texEscape(m.hodName)}}
\\newcommand{\\HODorCoordinatorDesignation}{${texEscape(m.hodDesignation || 'Head of the Department')}}
\\newcommand{\\VCName}{Dr Rev Fr Joseph C. C.}
\\newcommand{\\ProVCName}{Dr Rev Fr Viju P. D.}
\\newcommand{\\DirectorName}{Dr Fr Jiby Jose E.}
\\newcommand{\\AssistantDirectorName}{Fr Shijin P. J.}
\\newcommand{\\DeanName}{Dr Raghunandan Kumar R.}
\\newcommand{\\DeanDesignation}{Dean}
\\newcommand{\\AssociateDeanName}{Dr Mary Anitha E. A.}
\\newcommand{\\AssociateDeanDesignation}{Associate Dean}
\\newcommand{\\WeorI}{${texEscape(m.weOrI || 'I')}}
\\newcommand{\\AcknowledgementForGuide}{\\WeorI~am grateful to my guide, \\textbf{\\GuideName}, for guidance and support throughout the project.}
\\newcommand{\\AcknowledgementForCoGuide}{}
\\newcommand{\\AcknowledgementForOthers}{}
\\newcommand{\\DateofDeclaration}{${texEscape(m.dateOfDeclaration)}}
\\newcommand{\\DepartmentVision}{}
\\newcommand{\\DepartmentMission}{}
\\newcommand{\\DepartmentPEOs}{}
\\newcommand{\\DepartmentPSOs}{}
\\newcommand{\\ReferenceMode}{normal}
`;
}

export function buildChristThesis(doc: TemplytXDocument): string {
  const m = doc.christThesis;
  if (!m) throw new Error('No CHRIST thesis metadata set.');

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
    if (b.type === 'figure') { refLabels.set(b.id, `fig:${b.id.slice(0, 8)}`); refKind.set(b.id, 'figure');
      (b.subfigures ?? []).forEach((s) => { refLabels.set(`${b.id}:${s.id}`, `fig:${b.id.slice(0,8)}:${s.id.slice(0,6)}`); refKind.set(`${b.id}:${s.id}`, 'figure'); }); }
    else if (b.type === 'table') { refLabels.set(b.id, `tab:${b.id.slice(0, 8)}`); refKind.set(b.id, 'table'); }
    else if (b.type === 'equation') { refLabels.set(b.id, `eq:${b.id.slice(0, 8)}`); refKind.set(b.id, 'equation'); }
  });

  // Body: top-level sections become \chapter; content flows under them.
  // The first section starts the first chapter; paragraphs before any section
  // are dropped into an opening chapter "Introduction".
  const parts: string[] = [];
  let openedChapter = false;
  for (const b of doc.blocks) {
    if (b.type === 'section') {
      parts.push(`\\chapter{${texEscape((b as { title: string }).title).toUpperCase()}}`);
      openedChapter = true;
    } else if (b.type === 'paragraph') {
      if (!openedChapter) { parts.push('\\chapter{INTRODUCTION}'); openedChapter = true; }
      parts.push(richToLatex(b.content, keyMap, refLabels, refKind) + '\n');
    } else if (b.type === 'equation') {
      const lbl = refLabels.get(b.id);
      parts.push(`\\begin{equation}\\label{${lbl}}\n${b.latex || ''}\n\\end{equation}`);
    } else if (b.type === 'figure') {
      const lbl = refLabels.get(b.id);
      const cap = texEscape(b.caption || '');
      const localImg = (src: string, w: string) =>
        src && !/^https?:\/\//i.test(src)
          ? `\\includegraphics[width=${w}]{${src}}`
          : `\\fbox{\\parbox[c][2cm][c]{${w}}{\\centering [figure]}}`;
      const width = b.width && b.width < 100 ? (b.width / 100).toFixed(2) : '0.8';
      parts.push(`\\begin{figure}[htbp]\n\\centering\n${localImg(b.src, `${width}\\linewidth`)}\n\\caption{${cap}}\\label{${lbl}}\n\\end{figure}`);
    } else if (b.type === 'table') {
      const lbl = refLabels.get(b.id);
      const cap = texEscape(b.caption || '');
      const cols = b.rows[0]?.length ?? 1;
      const align = (b.align ?? Array(cols).fill('left')).map((a) => a === 'center' ? 'c' : a === 'right' ? 'r' : 'l').join('');
      const rows = b.rows.map((r, ri) => {
        let line = '    ' + r.map((c) => texEscape(c)).join(' & ') + ' \\\\';
        if (ri === 0 && b.headerRule) line += '\n    \\midrule';
        return line;
      }).join('\n');
      const top = b.topRule ? '    \\toprule\n' : '';
      const bottom = b.bottomRule ? '\n    \\bottomrule' : '';
      parts.push(`\\begin{table}[htbp]\n\\centering\n\\caption{${cap}}\\label{${lbl}}\n\\begin{tabular}{${align}}\n${top}${rows}${bottom}\n\\end{tabular}\n\\end{table}`);
    }
  }
  const body = parts.join('\n\n');

  const bib = refList.length ? `
\\begin{thebibliography}{99}
${refList.map((r) => {
    const key = keyMap.get(r.id);
    const authors = (r.authors || []).join(', ');
    const year = r.year ? ` (${r.year})` : '';
    return `\\bibitem{${key}} ${texEscape(authors)}${year}. ${texEscape(r.title || '')}${r.container ? `. \\textit{${texEscape(r.container)}}` : ''}.`;
  }).join('\n')}
\\end{thebibliography}` : '';

  // Self-contained main file. Reuses CHRIST's class + primitives from the
  // bundled template (must be in the server's classes/ folder).
  return `\\documentclass[12pt, oneside]{Thesis}
\\graphicspath{{Pictures/}}
\\usepackage[square, numbers, comma, sort&compress]{natbib}
\\hypersetup{urlcolor=blue, colorlinks=true}
\\title{\\ttitle}
\\usepackage{mathptmx, hyperref, listings, color, textcomp, setspace, ragged2e, enumitem, booktabs, graphicx, amsmath, amssymb, subcaption}
\\hypersetup{colorlinks=true, linkcolor=black}
\\begin{document}
%--- Project variables (generated by TemplytX) ---
${projectVariables(m)}
\\frontmatter
\\setstretch{1.5}
\\fancyhead{}\\rhead{\\thepage}\\lhead{}
\\pagestyle{fancy}
\\newcommand{\\HRule}{\\rule{\\linewidth}{0.5mm}}
\\input{Primitives/Titlepage}
\\input{Primitives/Certificate}
\\input{Primitives/BonafideCertificate}
\\input{Primitives/Acknowledgments}
\\input{Primitives/Declaration}
\\input{Primitives/Abstract}
\\tableofcontents
\\listoffigures
\\listoftables
\\mainmatter
\\pagestyle{fancy}
${body}
${bib}
\\end{document}`;
}
