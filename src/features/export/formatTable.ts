/**
 * Shared LaTeX table formatting used by every exporter (generic/journal, CHRIST
 * thesis, KMEA) so tables behave consistently everywhere:
 *  - header row bold by default (overridable later once cells are rich),
 *  - 3+ column tables auto-fit \textwidth via tabularx with cell wrapping,
 *  - very wide tables (6+ cols) rotate to landscape on their own page,
 *  - narrow tables stay compact (plain tabular, not stretched),
 *  - user alignment (left/center/right) is preserved.
 *
 * A template can still override by not calling this (or by post-processing),
 * but this is the universal default.
 */

export interface TableLike {
  rows: string[][];
  caption?: string;
  align?: ('left' | 'center' | 'right')[];
  topRule?: boolean;
  headerRule?: boolean;
  bottomRule?: boolean;
  rowLines?: boolean;
  colLines?: boolean;
}

export interface TableOptions {
  label?: string;
  /** escape function from the calling exporter (keeps escaping consistent). */
  esc: (s: string) => string;
  /** Convert a cell's rich HTML (bold/italic/sup/sub) to LaTeX. Defaults to
   *  plain `esc()` if omitted (e.g. for callers with no rich cells). */
  cellToLatex?: (html: string) => string;
  /** Force full-width float (e.g. table* in two-column journal layouts). */
  wideFloat?: boolean;
  /** Bold the header row (default true). */
  boldHeader?: boolean;
  /** Requires the caller's preamble to load tabularx, pdflscape, booktabs. */
  landscapeForWide?: boolean;
}

export function formatTable(t: TableLike, opts: TableOptions): string {
  const { esc } = opts;
  const boldHeader = opts.boldHeader !== false;
  const landscapeForWide = opts.landscapeForWide !== false;
  const cols = t.rows[0]?.length ?? 1;
  const cap = esc(t.caption || '');
  const label = opts.label ? `\\label{${opts.label}}` : '';

  const alignCh = (i: number) => {
    const a = (t.align ?? [])[i];
    return a === 'center' ? 'c' : a === 'right' ? 'r' : 'l';
  };

  // Header bold by default; other cells render through cellToLatex if the
  // caller supplied one (rich bold/italic/sup/sub), else plain esc().
  const renderCell = opts.cellToLatex ?? esc;
  const bodyRows = t.rows.map((row, ri) => {
    const cells = row.map((c) => {
      const e = renderCell(c);
      return ri === 0 && boldHeader ? `\\textbf{${e}}` : e;
    });
    let line = '    ' + cells.join(' & ') + ' \\\\';
    if (ri === 0 && (t.headerRule ?? true)) line += '\n    \\midrule';
    else if (t.rowLines && ri < t.rows.length - 1) line += '\n    \\hline';
    return line;
  }).join('\n');

  const top = (t.topRule ?? true) ? '    \\toprule\n' : '';
  const bottom = (t.bottomRule ?? true) ? '\n    \\bottomrule' : '';

  const wrap = cols >= 3;
  const veryWide = cols >= 6;

  let inner: string;
  if (wrap) {
    // tabularx: X columns fill \textwidth and wrap long content.
    const colspec = Array.from({ length: cols }, (_, i) => {
      const a = alignCh(i);
      return a === 'c' ? '>{\\centering\\arraybackslash}X'
        : a === 'r' ? '>{\\raggedleft\\arraybackslash}X' : 'X';
    }).join('');
    inner = `\\begin{tabularx}{\\textwidth}{${colspec}}\n${top}${bodyRows}${bottom}\n\\end{tabularx}`;
  } else {
    const colspec = t.colLines
      ? '|' + Array.from({ length: cols }, (_, i) => alignCh(i)).join('|') + '|'
      : Array.from({ length: cols }, (_, i) => alignCh(i)).join('');
    inner = `\\begin{tabular}{${colspec}}\n${top}${bodyRows}${bottom}\n\\end{tabular}`;
  }

  if (veryWide && landscapeForWide) {
    return `\\begin{table}[htbp]\n\\centering\n\\begin{landscape}\n\\caption{${cap}}${label}\n${inner}\n\\end{landscape}\n\\end{table}`;
  }
  const env = opts.wideFloat ? 'table*' : 'table';
  return `\\begin{${env}}[htbp]\n  \\centering\n  \\caption{${cap}}${label}\n  ${inner}\n\\end{${env}}`;
}
