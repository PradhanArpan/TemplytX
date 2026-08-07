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
Blocks: `section` (has `level`: 1=chapter/section, 2=subsection, 3=subsubsection),
`paragraph` (rich HTML-ish string), `equation` (LaTeX), `figure`, `table`
(rows: string[][], align, topRule/headerRule/bottomRule, colWidths…).
`TemplytXDocument` also has `christThesis?: ChristThesisMeta` (persisted in a
`christ_thesis jsonb` column).

## Exporters (`src/features/export/`)
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
  (Foreword/Acknowledgement/Executive Summary/etc.) become UNNUMBERED chapters.
- `formatTable.ts` — SHARED table formatter used by ALL exporters: header row
  bold by default; 3+ cols auto-fit \textwidth via tabularx with wrapping; 6+
  cols → landscape; narrow tables compact; alignment preserved. Preambles must
  load tabularx/array/pdflscape/booktabs.

### Architectural rule (permanent)
Use the citation package/style of the RESPECTIVE document class/template. Do NOT
force-load a generic `cite` package on classes that manage citations themselves
(springer sn-jnl, elsevier elsarticle) — it caused `\@citex` runaways.

## Editor (`src/features/editor/`)
- `EditorScreen.tsx` — outline (collapsed by default, one chapter open at a
  time), focus mode (large docs >150 blocks auto-focus first chapter to reduce
  lag), "Hide panel" toggle to reclaim writing space.
- Dropdowns (Insert \ref menu, toolbar symbol menu, equation Greek menu) render
  as PORTALS to document.body — the toolbar bar has `overflow-x-auto` which
  clips descendants, so z-index alone can't escape it. Keep them as portals.
- `activeField.ts` — tracks the focused plain <input> (table cell) so the
  toolbar's Insert-symbol can insert into a cell at the cursor.
- Table cells are plain `<input>`; per-cell rich formatting is NOT implemented
  (deferred). Header bold is automatic; symbol characters in cells are allowed.

## Known / deferred
- Springer sn-jnl.cls isn't in MiKTeX → journal-zip upload feature planned.
- #5 exact layout relocation (Readiness by title, Labels into toolbar) deferred;
  a "Hide panel" button exists instead.
- Batch 4 on hold: image storage/cloud/cleanup; multi-user sharing + realtime
  collaboration (the biggest unbuilt item — sharing-with-sync-on-save is nearer
  term than true simultaneous editing).

## Style / working conventions the owner prefers
- Numbered, click-by-click steps; group commands together.
- Honest framing of limitations over optimism; verify by actually compiling and
  diffing rather than claiming success.
- Challenge a request when it contradicts a prior decision (e.g. the no-AI-
  writing rule, or the citation-package rule).
- Primary-source / verified data only; never fabricate figures.
