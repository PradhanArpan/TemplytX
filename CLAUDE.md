# TemplytX — Project Brief for Claude Code

TemplytX is a proprietary academic-submission compliance/formatting SaaS.
Mission: **"Just write."** Content is decoupled from format — the user writes
once and exports to any journal/thesis/report template.

**Permanent product decision: NO AI writing / authorship features.** TemplytX is
a pure compliance + formatting tool. AI assistance may *explain* a rule or help
improve the user's own sentence, but must NEVER ghostwrite content. Do not add
generative-writing features.

## Owner / environment
- Owner: Arpan Pradhan (dr.arpanpradhan@gmail.com), CHRIST University SoET.
- OS: Windows 11. Node installed. MiKTeX installed (has pdflatex AND xelatex;
  Times New Roman available as a system font).
- Local app repo: `C:\Users\HP\templytx`  (this folder)
- Local LaTeX compile server: `C:\Users\HP\templytx-latex-server`
- `C:\Users\HP\templytx-poc` is an old proof-of-concept; ignore unless asked.

## Stack
- React 19 + Vite + TypeScript, Tailwind v4, Framer Motion, lucide-react,
  KaTeX, docx, @supabase/supabase-js.
- GitHub: `PradhanArpan/TemplytX` → auto-deploys to Vercel `templytx.vercel.app`.
- Supabase project `pgfvnvdojfkbqmtvlwsl` (Tokyo). Auth = email login; RLS on;
  documents + reference pool per account.

## Standard workflow (IMPORTANT)
- Make changes, then: `npm install` (if deps changed), `git add .`,
  `git commit -m "..."`, `git push origin main`. Vercel deploys `main`.
- Always confirm the working branch is `main` (`git branch`). A stray branch
  `uiux-responsive-accessibility` exists; do NOT commit there.
- After push, verify with `git log --oneline -1` that the new commit is at HEAD
  and that push showed real transfer (not "Everything up-to-date").
- LF→CRLF warnings and "3 high severity vulnerabilities" are HARMLESS.
  NEVER run `npm audit fix --force`.
- Run `npm run build` before committing to catch TS errors.

## The local LaTeX server (`../templytx-latex-server`)
- `server.js` (Node, port 4711). Start by double-clicking `start-latex.bat`, or
  `node server.js` from that folder. Status page: http://localhost:4711.
- Current version marker: **2026-08-03 (XeLaTeX auto-detect + KMEA)**.
- The app's "LaTeX PDF (local)" export POSTs LaTeX to `localhost:4711/compile`;
  the server compiles with the user's MiKTeX and returns a PDF. This is a LOCAL
  COMPILE HELPER — it does NOT host the website (Vercel does).
- Engine auto-detect: if the LaTeX uses `fontspec` / `\setmainfont` /
  `kmeareport`, it compiles with **xelatex**; otherwise **pdflatex**. Runs twice
  (refs/ToC). No `-halt-on-error` (recovers from non-fatal template warnings).
- Bundled templates live in `classes/`. `stageBundledTemplate` copies the whole
  folder of a matched `\documentclass{X}` (X.cls) OR `\usepackage{Y}` (Y.sty)
  into the compile dir. It SKIPS any "Missing Packages" folder (stale 25-yr-old
  package copies that conflicted with modern MiKTeX and broke compiles).
  - `classes/christ-thesis/` = CHRIST thesis template (Thesis.cls + Primitives +
    Pictures + logos; NO "Missing Packages"; tfrupee shim).
  - `classes/kmea/` = kmeareport.sty + front/ + back/ + logos/.

## Document model (`src/types/document.ts`)
Blocks: `section` (has `level`: 1=chapter, 2=section, 3=subsection,
4=sub-subsection — thesis/KMEA exporters map level 4 to `\subsubsection`;
`exportLatex.ts` collapses 3 & 4 both into `\subsubsection` since journal
articles don't need 4 heading tiers), `paragraph` (rich HTML-ish string),
`equation` (LaTeX), `figure`, `table` (rows: string[][] — each cell is rich
HTML like a paragraph, not plain text; align, topRule/headerRule/bottomRule,
colWidths…). `section`/`figure`/`table`/`equation` all also have an optional
`unnumbered?: boolean` (starred/uncounted — `\chapter*`, `\caption*`,
`equation*`; excluded from cross-referencing). `TemplytXDocument` also has
`christThesis?: ChristThesisMeta` (persisted in a `christ_thesis jsonb`
column).

## Exporters (`src/features/export/`)
Five export paths, all driven by the same `TemplytXDocument`: `exportLatex.ts`
(.tex), `exportChristThesis.ts` (.tex), `exportKmea.ts` (.tex), `exportDocx.ts`
(.docx), and `exportHtml.ts` (browser print-to-PDF, via `window.print()` —
easy to forget since it's not one of the three LaTeX exporters).
- `exportLatex.ts` — generic/journal (ieee/springer/elsevier/article). Has
  `UNICODE_MAP` + `unicodeToLatex` (β→$\beta$, ₹→\rupee{}, etc.) so pdflatex
  doesn't choke on Unicode. Submission vs camera-ready modes.
- `exportChristThesis.ts` — full CHRIST thesis; mirrors the official
  ProjectReport.tex preamble + front/back matter (University Vision/Mission/Core
  Values, Dept Vision/Mission, Certificate, Bonafide, Industry Certificate,
  Acknowledgements, Declaration, Abstract, Glossary; back: Publications,
  Appendices). Fields come from the thesis form; generic title/author hidden for
  this target. Glossary + Publications are generated from form fields.
- `exportKmea.ts` — KMEA report; uses bundled `kmeareport.sty` (Times New Roman
  via fontspec → XeLaTeX). Native Unicode, so NO conversion. Front-matter titles
  (Foreword/Acknowledgement/Executive Summary/etc.) become UNNUMBERED chapters
  (name-matched via a `FRONT` regex — kept for backward compat alongside the
  explicit `unnumbered` field below).
- `formatTable.ts` — SHARED table formatter used by ALL exporters: header row
  bold by default; 3+ cols auto-fit \textwidth via tabularx with wrapping; 6+
  cols → landscape; narrow tables compact; alignment preserved. Preambles must
  load tabularx/array/pdflscape/booktabs. Takes an optional `cellToLatex` hook
  so each exporter converts rich cell HTML (bold/italic/sup/sub) through its
  own local `richToLatex` — kept local per exporter ON PURPOSE (KMEA's version
  skips Unicode→LaTeX conversion since XeLaTeX renders Unicode natively); do
  NOT extract a shared richToLatex module. Also takes `unnumbered?: boolean`
  (from the table block) to emit `\caption*` instead of `\caption`+`\label`.
- `exportDocx.ts` — Word export. `htmlToRuns(html, size, baseFmt?)` walks rich
  HTML (paragraphs AND table cells) into bold/italic/superscript/subscript
  TextRuns; `baseFmt` seeds a forced format (e.g. table header row bold) that
  composes with any nested tags rather than overriding them.
- `exportHtml.ts` — table cells here are still plain-text escaped (`esc(c)`),
  NOT rich HTML like the other four exporters. Known gap, not yet fixed.

### Figure/Table/Equation numbering (`numbering.ts`, `numberingPref.ts`)
- `computeNumbering(blocks, numberSections, style)` is the single source of
  truth, reused by the editor's own cross-ref markers (`references/format.ts`'s
  `crossRefData`/`crossRefMap`) AND `exportDocx.ts`/`exportHtml.ts`. Blocks with
  `unnumbered: true` get no map entry at all — that's what excludes them from
  the `\ref` picker (`RefMenu.tsx`) automatically, no separate filtering needed.
- `style: 'continuous' | 'byChapter'` — byChapter resets figure/table/equation
  counters at each (non-unnumbered) level-1 section, producing `"2.1"`-style
  strings. Toggle lives in the editor toolbar's `NumberingMenu.tsx`, shown only
  when the doc has a chapter; persisted session-only via `numberingPref.ts`
  (localStorage keyed per document id — NOT a Supabase column; a real DB column
  is the planned upgrade path, see that file's comment).
- IMPORTANT gotcha for the two `\chapter`-based exporters (`exportChristThesis.ts`
  uses `book`, `exportKmea.ts` uses `report`): those LaTeX kernel classes
  ALREADY reset Figure/Table counters per chapter by default — only Equation
  numbering is continuous by default. So `'continuous'` emits nothing extra
  (preserves that existing mixed behavior exactly); `'byChapter'` adds exactly
  one line, `\numberwithin{equation}{chapter}`, to bring equations in line.
  `exportLatex.ts` (`article` class, no `\chapter`) treats the style as a
  documented no-op.

### Architectural rule (permanent)
Use the citation package/style of the RESPECTIVE document class/template. Do NOT
force-load a generic `cite` package on classes that manage citations themselves
(springer sn-jnl, elsevier elsarticle) — it caused `\@citex` runaways.

## Editor (`src/features/editor/`)
- `EditorScreen.tsx` — 2-column layout (outline+references left, writing
  center; the right sidebar was removed, writing column now fills that space).
  Outline collapsed by default, one chapter open at a time. Focus mode (large
  docs >150 blocks auto-focus first chapter to reduce lag).
- Undo/redo: in-memory history of the `blocks` array (Ctrl+Z / Ctrl+Y, or the
  toolbar buttons). Rapid typing coalesces into one undo step; structural
  edits (insert/delete/move/drag) always start a new one. History resets on
  page load (not persisted).
- Title bar has `ReadinessMenu.tsx` — a compact score badge that opens a
  popover with the gauge, re-check button, and issue list (replaced the old
  always-visible right-sidebar panel).
- Formatting toolbar row (left to right): Undo/Redo, `LabelsMenu.tsx`
  (dropdown wrapping `LabelsPanel`, replaced its own sidebar section),
  `EditorToolbar.tsx` (Bold/Italic/Sup/Sub/Symbol), `InsertMenu.tsx`
  (Chapter/Section/Subsection/Sub-subsection/Text/Equation/Figure/Table —
  inserts right after whichever block was last focused; replaced the old
  in-document hover "+insert" bar and bottom "Add content" bar entirely; has
  one "*" unnumbered toggle at the top of the dropdown that applies to
  whatever's picked next — NOT duplicated per item), `TableFormatMenu.tsx`
  (row/col insert-delete, align, width, rule toggles, plus an "Unnumbered"
  style toggle — enabled only while a table cell is focused; `tableOps.ts`
  holds the pure mutation helpers it and nothing else needs),
  `NumberingMenu.tsx` (Continuous/By-chapter, only shown when the doc has a
  chapter — see numbering section below), `RefMenu.tsx` ("\ref", renamed from
  "Insert \ref").
- Section/Equation/Figure blocks each have their own small "*" toggle inline
  (next to the level badge / label input / control row respectively) to flip
  `unnumbered` after insertion — same underlying field `InsertMenu` sets.
- All dropdowns/popovers render as PORTALS to document.body (the toolbar has
  `overflow-x-auto`, which clips descendants — z-index alone can't escape it)
  and close on outside click via `useClickOutside.ts`.
- `activeField.ts` has two independent trackers — don't conflate them:
  `ActiveField`/`setActiveField`/`insertIntoActiveField` (plain `<input>`s
  like figure width/perRow: splices text into `.value` since those can't use
  execCommand) and `setActiveTableCell`/`getActiveTableCell` (which table cell
  — a contenteditable div — currently has focus, for `TableFormatMenu`; a div
  has no `.value` so it can't use the first API).
- Table cells are contenteditable (`RichCell` in `BlockView.tsx`, same pattern
  as `RichParagraph.tsx` — including its external-resync effect, needed so
  undo/redo and reloads display correctly, not just persist correctly). Bold/
  Italic/Sup/Sub and Greek-symbol insertion all work in cells. No citation/
  cross-ref chips in cells (scoped out on purpose — paragraphs only).
- Sections have 4 heading levels via in-block ◄►arrows (Chapter/Section/
  Subsection/Sub-subsection); `InsertMenu` also inserts a heading at a chosen
  level directly.
- `FrontMatter.tsx` takes a `showAuthors` prop — the author list + "+ Add
  author" + corresponding-author note are hidden for non-journal template
  types (thesis/report/proposal/lab-report/cv/project; CHRIST thesis doesn't
  use `FrontMatter` at all, it has its own `ChristThesisForm`). Title input
  always shows. `EditorScreen.tsx` passes `showAuthors={!tpl || tpl.type ===
  'journal'}` — template-less "Article (neutral)" docs keep authors visible.

## Known / deferred
- Springer sn-jnl.cls isn't in MiKTeX → journal-zip upload feature planned.
- Batch 4 on hold: image storage/cloud/cleanup; multi-user sharing + realtime
  collaboration (the biggest unbuilt item — sharing-with-sync-on-save is nearer
  term than true simultaneous editing).
- `exportHtml.ts` table cells are plain-text only (not rich HTML like the
  other four export paths) — found but not fixed while adding rich table
  cells elsewhere.
- Chapter-based numbering choice is session-only (localStorage per doc id,
  `numberingPref.ts`) — a real Supabase column is the planned upgrade when
  wanted; would mirror how `christThesis` is stored (see `documents.ts`).

## Style / working conventions the owner prefers
- Numbered, click-by-click steps; group commands together.
- Honest framing of limitations over optimism; verify by actually compiling and
  diffing rather than claiming success.
- Challenge a request when it contradicts a prior decision (e.g. the no-AI-
  writing rule, or the citation-package rule).
- Primary-source / verified data only; never fabricate figures.
