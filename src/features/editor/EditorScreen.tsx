import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, GripVertical, PanelLeft, Redo2, Undo2, X } from 'lucide-react';
import { getDocument, updateDocument, listTemplates } from '../../services/documents';
import { listReferences } from '../../services/references';
import { runCompliance } from '../compliance/engine';
import { orderedReferences, markerMap, formatEntry, crossRefMap } from '../references/format';
import { ReferencePanel } from '../references/ReferencePanel';
import { addReferenceToDocument } from '../../services/references';
import type { TemplytXDocument, DocumentBlock, Reference } from '../../types/document';
import type { Template, ComplianceReport } from '../../types/compliance';
import { Button, Badge } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Card';
import { BlockView } from './blocks/BlockView';
import { EditorToolbar } from './EditorToolbar';
import { RefMenu } from './RefMenu';
import { InsertMenu } from './InsertMenu';
import { LabelsMenu } from './LabelsMenu';
import { ReadinessMenu } from './ReadinessMenu';
import { TableFormatMenu } from './TableFormatMenu';
import { getActiveTableCell } from './activeField';
import { FrontMatter } from './FrontMatter';
import { ChristThesisForm, emptyChristMeta } from '../export/ChristThesisForm';
import type { ChristThesisMeta } from '../../types/document';
import type { Author } from '../../types/document';

const paneLabel =
  'text-[12px] tracking-[0.06em] uppercase text-[var(--color-faint)] font-semibold mb-3';

/** Convert chip spans in a DOM element back to tokens. */
function tokensFromEl(node: HTMLElement): string {
  const clone = node.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('span.tx-cite').forEach((el) => {
    el.replaceWith(document.createTextNode(`[[cite:${el.getAttribute('data-cite')}]]`));
  });
  clone.querySelectorAll('span.tx-xref').forEach((el) => {
    el.replaceWith(document.createTextNode(`[[ref:${el.getAttribute('data-ref')}]]`));
  });
  return clone.innerHTML;
}

function newBlock(type: DocumentBlock['type'], title = '', level = 1): DocumentBlock {
  const id = `b-${crypto.randomUUID()}`;
  switch (type) {
    case 'section': return { id, type, level, title };
    case 'paragraph': return { id, type, content: '' };
    case 'equation': return { id, type, latex: '' };
    case 'figure': return { id, type, src: '', caption: '' };
    case 'table': return { id, type, rows: [['Header', 'Header'], ['', '']] };
    default: return { id, type: 'paragraph', content: '' };
  }
}

export function EditorScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<TemplytXDocument | null>(null);
  const [tpl, setTpl] = useState<Template | null>(null);
  const [blocks, setBlocks] = useState<DocumentBlock[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [docTitle, setDocTitle] = useState('');
  const [pool, setPool] = useState<Reference[]>([]);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [stale, setStale] = useState(false);
  const [saved, setSaved] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [panel, setPanel] = useState<'left' | null>(null);
  const [compactPanels, setCompactPanels] = useState(() => window.matchMedia('(max-width: 1199px)').matches);
  const [refKey, setRefKey] = useState(0); // bump to refresh the left ref panel
  const [christMeta, setChristMeta] = useState<ChristThesisMeta | null>(null);
  const [showChristForm, setShowChristForm] = useState(false);
  const [focusChapterId, setFocusChapterId] = useState<string | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  // The block to insert after when using the toolbar's Insert menu — whichever
  // block was last focused/clicked, so insertion lands where you're working.
  const [lastActiveBlockId, setLastActiveBlockId] = useState<string | null>(null);
  const [activeTableCell, setActiveTableCell] = useState<{ blockId: string; row: number; col: number } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Undo/redo history for the blocks array. Rapid successive edits (typing)
  // within COALESCE_MS of each other collapse into one undo step, matching
  // how word processors group keystrokes rather than undoing one char at a
  // time; structural edits (insert/delete/move/drag) always start a new step.
  const historyRef = useRef<{ past: DocumentBlock[][]; future: DocumentBlock[][] }>({ past: [], future: [] });
  const lastEditRef = useRef(0);
  const [historyCounts, setHistoryCounts] = useState({ past: 0, future: 0 });
  const panelTrigger = useRef<HTMLButtonElement | null>(null);
  const leftPanel = useRef<HTMLElement | null>(null);
  // Tracks the last caret position inside a rich paragraph: the block id and
  // a cloned Range, so we can insert exactly there even after focus moves to
  // the reference panel (clicking the panel would otherwise lose the caret).
  const cursor = useRef<{ blockId: string; range: Range } | null>(null);

  // Continuously remember the caret whenever it's inside a rich paragraph.
  useEffect(() => {
    function onSelChange() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const node = sel.anchorNode;
      const host = (node instanceof Element ? node : node?.parentElement)
        ?.closest('[data-rich-block]') as HTMLElement | null;
      if (host) {
        cursor.current = {
          blockId: host.getAttribute('data-rich-block')!,
          range: sel.getRangeAt(0).cloneRange(),
        };
      }
    }
    document.addEventListener('selectionchange', onSelChange);
    return () => document.removeEventListener('selectionchange', onSelChange);
  }, []);

  // Reactively surface which table cell (if any) currently has focus, so the
  // toolbar's Table menu — a sibling, not a descendant, of the table — knows
  // what to act on. activeField itself is a plain module singleton; 'focusin'
  // fires on every focus change app-wide, including focus leaving a table
  // cell for something else, so a single listener keeps this in sync.
  useEffect(() => {
    function sync() { setActiveTableCell(getActiveTableCell()); }
    document.addEventListener('focusin', sync);
    return () => document.removeEventListener('focusin', sync);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1199px)');
    const sync = () => {
      setCompactPanels(media.matches);
      if (!media.matches) setPanel(null);
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!panel || !compactPanels) return;
    const container = leftPanel.current;
    if (!container) return;

    const focusable = () => [...container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )];
    focusable()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPanel(null);
        requestAnimationFrame(() => panelTrigger.current?.focus());
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [compactPanels, panel]);

  useEffect(() => {
    if (!id) return;
    getDocument(id).then((d) => {
      setDoc(d);
      const loaded = d?.blocks ?? [];
      setBlocks(loaded);
      setAuthors(d?.authors ?? []);
      setDocTitle(d?.title ?? '');
      setChristMeta(d?.christThesis ?? null);
      // Performance: very large documents (e.g. a 350-page import) are slow to
      // render all at once. Auto-focus the first chapter so only that chapter's
      // blocks render initially; the user can pick another or "Show whole
      // document" at any time. Threshold keeps normal-size docs unaffected.
      if (loaded.length > 150) {
        const firstChapter = loaded.find((b) => b.type === 'section' && ((b as { level?: number }).level ?? 1) <= 1);
        if (firstChapter) setFocusChapterId(firstChapter.id);
      }
      if (d?.targetTemplateId) listTemplates().then((ts) =>
        setTpl(ts.find((t) => t.id === d.targetTemplateId) ?? null));
    });
    listReferences().then(setPool);
  }, [id]);

  const saveChristMeta = useCallback((m: ChristThesisMeta) => {
    setChristMeta(m);
    setSaved(false);
    // Keep the document's title in sync with the thesis title (single source
    // of truth), so the document list and internal title stay meaningful.
    const patch: Partial<TemplytXDocument> = { christThesis: m };
    const projTitle = (m.projectTitleTwo || m.projectTitle || '').trim();
    if (projTitle && projTitle !== docTitle) { patch.title = projTitle; setDocTitle(projTitle); }
    if (id) updateDocument(id, patch).then(() => setSaved(true));
  }, [id, docTitle]);

  const COALESCE_MS = 600;

  const persistBlocks = useCallback((next: DocumentBlock[]) => {
    setBlocks(next);
    setStale(true);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (id) await updateDocument(id, { blocks: next });
      setSaved(true);
    }, 800);
  }, [id]);

  /** Apply a new blocks array. Pass `coalesce: false` for structural changes
   *  (insert/delete/move/drag) so they always create a discrete undo step. */
  const applyBlocks = useCallback((next: DocumentBlock[], opts?: { coalesce?: boolean }) => {
    const now = Date.now();
    const coalesce = (opts?.coalesce ?? true) && now - lastEditRef.current < COALESCE_MS;
    if (!coalesce) historyRef.current.past.push(blocks);
    historyRef.current.future = [];
    lastEditRef.current = now;
    setHistoryCounts({ past: historyRef.current.past.length, future: 0 });
    persistBlocks(next);
  }, [blocks, persistBlocks]);

  function undo() {
    const h = historyRef.current;
    if (h.past.length === 0) return;
    const previous = h.past.pop()!;
    h.future.push(blocks);
    lastEditRef.current = 0;
    setHistoryCounts({ past: h.past.length, future: h.future.length });
    persistBlocks(previous);
  }
  function redo() {
    const h = historyRef.current;
    if (h.future.length === 0) return;
    const next = h.future.pop()!;
    h.past.push(blocks);
    lastEditRef.current = 0;
    setHistoryCounts({ past: h.past.length, future: h.future.length });
    persistBlocks(next);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
      else if (key === 'y' || (key === 'z' && event.shiftKey)) { event.preventDefault(); redo(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  function patchBlock(blockId: string, patch: Partial<DocumentBlock>) {
    // Key-based citing: if the user typed \cite{key}, resolve it against the
    // reference pool and convert to a [[cite:id]] token.
    if (typeof (patch as { content?: string }).content === 'string') {
      let content = (patch as { content: string }).content;
      if (content.includes('\\cite{')) {
        // Support \cite{keyA,keyB,keyC} -> consecutive citation tokens.
        content = content.replace(/\\cite\{([^}]+)\}/g, (whole, keys) => {
          const tokens = String(keys).split(',').map((k) => {
            const ref = pool.find((r) => r.citeKey === k.trim());
            return ref ? `[[cite:${ref.id}]]` : null;
          });
          // Only convert if every key resolved; else leave text untouched.
          return tokens.every(Boolean) ? tokens.join('') : whole;
        });
        (patch as { content: string }).content = content;
      }
    }
    applyBlocks(blocks.map((b) => (b.id === blockId ? { ...b, ...patch } as DocumentBlock : b)));
  }
  function deleteBlock(blockId: string) { applyBlocks(blocks.filter((b) => b.id !== blockId), { coalesce: false }); }

  function saveTitle(t: string) {
    setDocTitle(t); setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (id) await updateDocument(id, { title: t }); setSaved(true);
    }, 800);
  }
  function saveAuthors(a: Author[]) {
    setAuthors(a); setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (id) await updateDocument(id, { authors: a }); setSaved(true);
    }, 800);
  }

  /** Insert a new block at a given index (default: end). */
  function insertBlock(type: DocumentBlock['type'], at?: number, level?: number) {
    const b = newBlock(type, '', level);
    const next = [...blocks];
    next.splice(at ?? next.length, 0, b);
    applyBlocks(next, { coalesce: false });
  }

  /** Insert right after whichever block was last focused/clicked (the
   *  toolbar's Insert menu doesn't know a document position on its own),
   *  falling back to the end of the document. */
  function insertBlockAt(type: DocumentBlock['type'], level?: number) {
    const idx = lastActiveBlockId ? blocks.findIndex((b) => b.id === lastActiveBlockId) : -1;
    insertBlock(type, idx === -1 ? blocks.length : idx + 1, level);
  }

  /** Drag reorder: move dragged block to before the drop target. */
  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const from = blocks.findIndex((b) => b.id === dragId);
    const to = blocks.findIndex((b) => b.id === targetId);
    if (from === -1 || to === -1) { setDragId(null); return; }
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    applyBlocks(next, { coalesce: false });
    setDragId(null);
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    const from = blocks.findIndex((block) => block.id === blockId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    applyBlocks(next, { coalesce: false });
  }

  /** Cite a reference: insert [[cite:id]] at the cursor in the focused paragraph. */
  function cite(ref: Reference) {
    const c = cursor.current;
    if (!c) return; // no paragraph caret remembered
    const target = blocks.find((b) => b.id === c.blockId);
    if (!target || target.type !== 'paragraph') return;

    const el = document.querySelector(`#block-${c.blockId} [contenteditable]`) as HTMLElement | null;
    if (!el) return;

    const poolWith = pool.some((r) => r.id === ref.id) ? pool : [...pool, ref];
    const chip = document.createElement('span');
    chip.className = 'tx-cite';
    chip.setAttribute('contenteditable', 'false');
    chip.setAttribute('data-cite', ref.id);

    // Restore the caret to exactly where it was before the panel was clicked.
    const range = c.range;
    if (el.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(chip);
      range.setStartAfter(chip); range.collapse(true);
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(range); }
      cursor.current = { blockId: c.blockId, range: range.cloneRange() };
      const tokenized = tokensFromEl(el);
      const simBlocks = blocks.map((b) => b.id === c.blockId
        ? { ...b, content: tokenized } as DocumentBlock : b);
      const newMarkers = markerMap(simBlocks, poolWith, tpl);
      chip.textContent = newMarkers.get(ref.id) ?? '[?]';
      patchBlock(c.blockId, { content: tokenized } as Partial<DocumentBlock>);
    } else {
      // Fallback: append if the saved range is somehow stale.
      patchBlock(c.blockId, { content: `${target.content} [[cite:${ref.id}]]` } as Partial<DocumentBlock>);
    }
    setPool((p) => (p.some((r) => r.id === ref.id) ? p : [...p, ref]));
    // Ensure the cited reference is part of this document's working set.
    if (id) { addReferenceToDocument(id, ref.id).then(() => setRefKey((k) => k + 1)); }
  }

  function insertXref(targetId: string) {
    const c = cursor.current;
    if (!c) return;
    const el = document.querySelector(`#block-${c.blockId} [contenteditable]`) as HTMLElement | null;
    if (!el) return;
    const chip = document.createElement('span');
    chip.className = 'tx-xref';
    chip.setAttribute('contenteditable', 'false');
    chip.setAttribute('data-ref', targetId);
    chip.textContent = crossRefs.get(targetId) ?? 'Ref. ?';

    const range = c.range;
    if (el.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(chip);
      range.setStartAfter(chip); range.collapse(true);
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(range); }
      cursor.current = { blockId: c.blockId, range: range.cloneRange() };
      patchBlock(c.blockId, { content: tokensFromEl(el) } as Partial<DocumentBlock>);
    }
  }

  async function checkCompliance() {
    if (!doc || !tpl) return;
    const required = tpl.sections.filter((s) => s.required).map((s) => s.title);
    const ruleConfigs = tpl.rules.map((rc) =>
      rc.ruleId === 'required-sections'
        ? { ...rc, params: { ...(rc.params ?? {}), required } } : rc);
    const r = runCompliance({ documentId: doc.id, blocks, references: doc.references, ruleConfigs });
    setReport(r);
    setStale(false);
    const status = r.score === 100 ? 'ready' : 'checked';
    await updateDocument(doc.id, { readinessScore: r.score, status });
    setDoc({ ...doc, readinessScore: r.score, status });
  }

  function goToBlock(blockId?: string) {
    if (!blockId) return;
    document.getElementById(`block-${blockId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    closePanel();
  }

  function closePanel() {
    setPanel(null);
    requestAnimationFrame(() => panelTrigger.current?.focus());
  }

  if (!doc) {
    return (
      <div className="grid grid-cols-1 min-[1200px]:grid-cols-[232px_1fr] h-[calc(100dvh-56px)]">
        <div className="hidden min-[1200px]:block border-r border-[var(--color-border)] p-5"><Skeleton className="h-5 w-24 mb-4" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-3/4" /></div>
        <div className="p-6 sm:p-10"><Skeleton className="h-7 w-2/3 mb-6" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-5/6" /></div>
      </div>
    );
  }

  const sections = blocks.filter((b) => b.type === 'section');

  // Group blocks into chapters (a level-1 section and everything under it until
  // the next level-1 section). Used for the collapsible outline and focus mode.
  type Chapter = { id: string; title: string; blockIds: string[]; children: { id: string; title: string; level: number }[] };
  const chapters: Chapter[] = [];
  for (const b of blocks) {
    const isChapter = b.type === 'section' && ((b as { level?: number }).level ?? 1) <= 1;
    if (isChapter) {
      chapters.push({ id: b.id, title: (b as { title: string }).title || 'Untitled chapter', blockIds: [b.id], children: [] });
    } else if (chapters.length > 0) {
      const ch = chapters[chapters.length - 1];
      ch.blockIds.push(b.id);
      if (b.type === 'section') ch.children.push({ id: b.id, title: (b as { title: string }).title || 'Untitled', level: (b as { level?: number }).level ?? 2 });
    }
  }

  // Which block ids are visible given focus mode. In focus mode, only the
  // focused chapter's blocks render (plus preamble blocks like the thesis
  // details banner stay outside this filter).
  const focusVisibleIds: Set<string> | null = focusChapterId
    ? new Set(chapters.find((c) => c.id === focusChapterId)?.blockIds ?? [])
    : null;
  const score = report ? report.score : doc.readinessScore;
  const markers = markerMap(blocks, pool, tpl);
  const crossRefs = crossRefMap(blocks);
  const refList = orderedReferences(blocks, pool, tpl);

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] min-h-0 overflow-hidden">
      {/* toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-5 h-[52px] shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_1px_0_rgba(23,32,51,.02)]">
        <div className="flex flex-1 items-center gap-2 sm:gap-3 min-w-0">
          <button onClick={() => navigate('/')} aria-label="Back to documents"
            className="min-w-8 min-h-8 inline-flex items-center justify-center rounded-[var(--radius)] text-[var(--color-muted)] cursor-pointer hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-colors border border-transparent bg-transparent">
            <ArrowLeft size={17} />
          </button>
          <span className="tx-document text-[18px] font-semibold tracking-[-0.01em] truncate">{docTitle || "Untitled"}</span>
          {tpl && <span className="hidden lg:inline-flex"><Badge tone="accent">{tpl.name}</Badge></span>}
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <AnimatePresence mode="wait">
            <motion.span key={saved ? 'saved' : 'saving'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="text-[11px] font-medium text-[var(--color-faint)]">
              {saved ? 'Saved' : 'Saving…'}
            </motion.span>
          </AnimatePresence>
          <ReadinessMenu score={score} stale={stale} tpl={tpl} report={report} onCheck={checkCompliance} onGoToBlock={goToBlock} />
          <Button variant="secondary" size="sm" onClick={() => navigate(`/doc/${id}/export`)}>Export</Button>
        </div>
      </div>

      {/* Shared formatting toolbar (Word-like) — acts on the focused block. */}
      <div className="flex items-center gap-2 px-3 sm:px-5 h-[48px] shrink-0 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
        <div className="flex items-center gap-0.5 px-1.5 py-1 border border-[var(--color-border)] rounded-[var(--radius)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
          <button type="button" aria-label="Undo" onClick={undo} disabled={historyCounts.past === 0}
            title="Undo (Ctrl+Z)"
            className="min-h-7 min-w-7 inline-flex items-center justify-center rounded-md cursor-pointer text-[var(--color-muted)] hover:bg-[var(--color-accent-bg)] hover:text-[var(--color-accent)] transition-colors border-none bg-transparent disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]">
            <Undo2 size={15} />
          </button>
          <button type="button" aria-label="Redo" onClick={redo} disabled={historyCounts.future === 0}
            title="Redo (Ctrl+Y)"
            className="min-h-7 min-w-7 inline-flex items-center justify-center rounded-md cursor-pointer text-[var(--color-muted)] hover:bg-[var(--color-accent-bg)] hover:text-[var(--color-accent)] transition-colors border-none bg-transparent disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]">
            <Redo2 size={15} />
          </button>
        </div>
        <LabelsMenu documentId={id!} onPulled={() => setRefKey((k) => k + 1)} />
        <EditorToolbar onAfter={() => {
          const el = document.activeElement as HTMLElement | null;
          if (el && el.getAttribute('contenteditable') === 'true') {
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }} />
        <InsertMenu onInsert={(type, level) => insertBlockAt(type, level)} />
        <TableFormatMenu blocks={blocks} activeCell={activeTableCell} patchBlock={patchBlock} />
        <RefMenu blocks={blocks} onPick={(refId) => insertXref(refId)} />
        <div className="flex items-center gap-1.5 ml-auto min-[1200px]:hidden">
          <button type="button" onClick={(event) => { panelTrigger.current = event.currentTarget; setPanel('left'); }}
            aria-label="Open outline and references" aria-expanded={panel === 'left'} aria-controls="editor-left-panel"
            className="flex min-h-8 items-center gap-1.5 whitespace-nowrap text-[12px] font-medium px-2.5 py-1.5 border border-[var(--color-border)] rounded-[var(--radius)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-raised)] transition-colors">
            <PanelLeft size={14} /><span className="hidden sm:inline">Outline</span>
          </button>
        </div>
      </div>

      {panel && (
        <button type="button" tabIndex={-1} aria-label="Close editor panel" onClick={closePanel}
          className="fixed inset-x-0 top-14 bottom-0 z-40 bg-[#0b1220]/45 backdrop-blur-[2px] border-none min-[1200px]:hidden" />
      )}

      <div className="grid grid-cols-1 min-[1200px]:grid-cols-[232px_1fr] flex-1 min-h-0 min-w-0">
        {/* left: outline + reference pool */}
        <aside id="editor-left-panel" ref={leftPanel}
          inert={compactPanels && panel !== 'left'} aria-hidden={compactPanels && panel !== 'left'}
          role={compactPanels && panel === 'left' ? 'dialog' : undefined} aria-modal={compactPanels && panel === 'left' ? true : undefined}
          aria-label="Outline and references" className={`border-r border-[var(--color-border)] px-4 py-5 overflow-y-auto bg-[var(--color-surface-2)]
          min-[1200px]:static min-[1200px]:z-auto min-[1200px]:w-auto min-[1200px]:translate-x-0
          max-[1200px]:fixed max-[1200px]:top-14 max-[1200px]:bottom-0 max-[1200px]:left-0 max-[1200px]:z-50
          max-[1200px]:w-[min(320px,calc(100vw-48px))] max-[1200px]:transition-transform max-[1200px]:duration-200 max-[1200px]:shadow-[var(--shadow-modal)]
          ${panel === 'left' ? 'max-[1200px]:translate-x-0' : 'max-[1200px]:-translate-x-full'}`}>
          <div className="flex items-center justify-between mb-4 min-[1200px]:hidden">
            <span className="font-medium">Document tools</span>
            <button type="button" onClick={closePanel} aria-label="Close outline and references"
              className="p-2 rounded-[var(--radius)] text-[var(--color-muted)] border-none bg-transparent cursor-pointer">
              <X size={17} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className={paneLabel}>Outline</div>
            {focusChapterId && (
              <button onClick={() => setFocusChapterId(null)}
                className="text-[11px] text-[var(--color-accent)] cursor-pointer border-none bg-transparent">
                Show all
              </button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {chapters.length === 0 && sections.length === 0 && <span className="text-[13px] text-[var(--color-faint)]">Add a section to begin</span>}
            {chapters.map((c) => {
              const collapsed = expandedChapter !== c.id;
              const focused = focusChapterId === c.id;
              return (
                <div key={c.id}>
                  <div className={`flex items-center gap-1 rounded-[var(--radius)] ${focused ? 'bg-[var(--color-accent-bg)]' : ''}`}>
                    {c.children.length > 0 ? (
                      <button onClick={() => setExpandedChapter((cur) => cur === c.id ? null : c.id)}
                        className="text-[var(--color-faint)] hover:text-[var(--color-text)] cursor-pointer border-none bg-transparent px-1 text-[11px]"
                        aria-label={collapsed ? 'Expand' : 'Collapse'}>
                        {collapsed ? '▸' : '▾'}
                      </button>
                    ) : <span className="px-1 text-[11px] opacity-0">▸</span>}
                    <button onClick={() => { setExpandedChapter(c.id); setFocusChapterId(c.id); goToBlock(c.id); }}
                      className={`flex-1 text-left px-1.5 py-1.5 rounded-[var(--radius)] text-[13px] font-medium cursor-pointer hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] border-none bg-transparent truncate ${focused ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}
                      title="Click to focus this chapter">
                      {c.title}
                    </button>
                  </div>
                  {!collapsed && c.children.map((ch) => (
                    <button key={ch.id} onClick={() => goToBlock(ch.id)}
                      style={{ paddingLeft: 10 + (ch.level - 1) * 14 }}
                      className="w-full text-left py-1 rounded-[var(--radius)] text-[12px] text-[var(--color-muted)] cursor-pointer hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] border-none bg-transparent truncate">
                      {ch.title}
                    </button>
                  ))}
                </div>
              );
            })}
            {/* sections that aren't under any chapter (e.g. non-thesis docs with only top-level sections) */}
            {chapters.length === 0 && sections.map((s) => (
              <button key={s.id} onClick={() => goToBlock(s.id)}
                className="text-left px-2.5 py-2 rounded-[var(--radius)] text-[13px] text-[var(--color-muted)] cursor-pointer hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors border-none bg-transparent truncate">
                {(s as { title: string }).title || 'Untitled section'}
              </button>
            ))}
          </div>
          <ReferencePanel documentId={id!} onCite={(ref) => { cite(ref); closePanel(); }} refreshKey={refKey} />
        </aside>

        {/* center: writing surface with reorder + insert */}
        <section className="min-w-0 overflow-y-auto overflow-x-hidden px-3 sm:px-6 lg:px-8 min-[1200px]:px-10 py-4 sm:py-8 bg-[var(--color-bg)]">
          <div className="max-w-[760px] min-h-[calc(100%-32px)] mx-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-paper)] px-5 py-7 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
            {tpl?.id !== 'tpl-christ-thesis' && (
              <FrontMatter title={docTitle} authors={authors}
                onTitle={saveTitle} onAuthors={saveAuthors} />
            )}
            {tpl?.id === 'tpl-christ-thesis' && (
              <div className="mb-4 flex items-center gap-2 flex-wrap p-2.5 rounded-[var(--radius)] bg-[var(--color-accent-bg)] border border-[var(--color-accent)]/30">
                <span className="text-[13px] text-[var(--color-text)]">
                  CHRIST thesis details {christMeta?.projectTitle ? '✓ set' : '— not set yet'}
                </span>
                <button onClick={() => { if (!christMeta) setChristMeta(emptyChristMeta()); setShowChristForm(true); }}
                  className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--color-accent)] text-white cursor-pointer border-none">
                  {christMeta?.projectTitle ? 'Edit thesis details' : 'Set up thesis details'}
                </button>
              </div>
            )}
            {focusChapterId && (
              <div className="mb-4 flex items-center justify-between gap-2 p-2.5 rounded-[var(--radius)] bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                <span className="text-[13px] text-[var(--color-muted)]">
                  Focused on <b className="text-[var(--color-text)]">{chapters.find((c) => c.id === focusChapterId)?.title || 'chapter'}</b> — editing one chapter at a time.
                </span>
                <button onClick={() => setFocusChapterId(null)}
                  className="text-[12px] px-2.5 py-1 rounded-[var(--radius)] bg-[var(--color-accent)] text-white cursor-pointer border-none shrink-0">
                  Show whole document
                </button>
              </div>
            )}
            {blocks.map((b) => (
              focusVisibleIds && !focusVisibleIds.has(b.id) ? null : (
              <div key={b.id}
                onFocusCapture={() => setLastActiveBlockId(b.id)}
                onDragOver={(e) => { if (dragId) e.preventDefault(); }}
                onDrop={() => onDrop(b.id)}
                className={dragId && dragId !== b.id ? 'border-t-2 border-transparent hover:border-[var(--color-accent)]' : ''}>
                <div className="flex items-start gap-1 group/row">
                  <button
                    draggable onDragStart={() => setDragId(b.id)} onDragEnd={() => setDragId(null)}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                        event.preventDefault();
                        moveBlock(b.id, event.key === 'ArrowUp' ? -1 : 1);
                      }
                    }}
                    aria-label="Reorder block. Use Arrow Up or Arrow Down."
                    className="mt-1.5 opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 focus-visible:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-[var(--color-faint)] border-none bg-transparent p-1 shrink-0 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]">
                    <GripVertical size={14} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <BlockView block={b}
                      markers={markers}
                      crossRefs={crossRefs}
                      onChange={(patch) => patchBlock(b.id, patch)}
                      onDelete={() => deleteBlock(b.id)} />
                  </div>
                </div>
              </div>
              )
            ))}

            {/* auto-generated reference section */}
            {refList.length > 0 && (
              <div className="mt-8 pt-4 border-t border-[var(--color-border)]">
                <h2 className="tx-document text-[19px] font-semibold mb-3">References</h2>
                <div className="flex flex-col gap-2">
                  {refList.map((r, i) => (
                    <div key={r.id} className="tx-document text-[13px] text-[var(--color-text)] leading-snug">
                      {formatEntry(r, i, tpl)}
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-[var(--color-faint)] mt-2">
                  Auto-generated from citations · {tpl?.citationOrder === 'alphabetical' ? 'alphabetical' : 'order of appearance'}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {showChristForm && christMeta && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-8"
          onClick={() => setShowChristForm(false)}>
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] max-w-[560px] w-full mx-4 p-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[15px] font-semibold text-[var(--color-text)]">CHRIST Thesis details</h3>
              <button onClick={() => setShowChristForm(false)} className="text-[var(--color-faint)] hover:text-[var(--color-text)] cursor-pointer border-none bg-transparent text-lg">×</button>
            </div>
            <ChristThesisForm meta={christMeta} onChange={saveChristMeta} />
            <div className="flex justify-end mt-2">
              <button onClick={() => setShowChristForm(false)}
                className="text-[13px] px-4 py-2 rounded-[var(--radius)] bg-[var(--color-accent)] text-white cursor-pointer border-none">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
