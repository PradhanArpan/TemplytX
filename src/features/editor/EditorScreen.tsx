import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CircleAlert, CircleCheck, Crosshair, GripVertical, PanelLeft, PanelRight, X } from 'lucide-react';
import { getDocument, updateDocument, listTemplates } from '../../services/documents';
import { listReferences } from '../../services/references';
import { runCompliance } from '../compliance/engine';
import { orderedReferences, markerMap, formatEntry, crossRefMap } from '../references/format';
import { ReferencePanel } from '../references/ReferencePanel';
import { LabelsPanel } from '../references/LabelsPanel';
import { addReferenceToDocument } from '../../services/references';
import type { TemplytXDocument, DocumentBlock, Reference } from '../../types/document';
import type { Template, ComplianceReport } from '../../types/compliance';
import { Button, Badge } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Card';
import { ReadinessGauge } from '../../components/ui/ReadinessGauge';
import { BlockView } from './blocks/BlockView';
import { EditorToolbar } from './EditorToolbar';
import { RefMenu } from './RefMenu';
import { FrontMatter } from './FrontMatter';
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

function newBlock(type: DocumentBlock['type'], title = ''): DocumentBlock {
  const id = `b-${crypto.randomUUID()}`;
  switch (type) {
    case 'section': return { id, type, level: 1, title };
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
  const [panel, setPanel] = useState<'left' | 'right' | null>(null);
  const [compactPanels, setCompactPanels] = useState(() => window.matchMedia('(max-width: 1199px)').matches);
  const [refKey, setRefKey] = useState(0); // bump to refresh the left ref panel
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelTrigger = useRef<HTMLButtonElement | null>(null);
  const leftPanel = useRef<HTMLElement | null>(null);
  const rightPanel = useRef<HTMLElement | null>(null);
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
    const container = panel === 'left' ? leftPanel.current : rightPanel.current;
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
      setBlocks(d?.blocks ?? []);
      setAuthors(d?.authors ?? []);
      setDocTitle(d?.title ?? '');
      if (d?.targetTemplateId) listTemplates().then((ts) =>
        setTpl(ts.find((t) => t.id === d.targetTemplateId) ?? null));
    });
    listReferences().then(setPool);
  }, [id]);

  const applyBlocks = useCallback((next: DocumentBlock[]) => {
    setBlocks(next);
    setStale(true);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (id) await updateDocument(id, { blocks: next });
      setSaved(true);
    }, 800);
  }, [id]);

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
  function deleteBlock(blockId: string) { applyBlocks(blocks.filter((b) => b.id !== blockId)); }

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
  function insertBlock(type: DocumentBlock['type'], at?: number) {
    const b = newBlock(type);
    const next = [...blocks];
    next.splice(at ?? next.length, 0, b);
    applyBlocks(next);
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
    applyBlocks(next);
    setDragId(null);
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    const from = blocks.findIndex((block) => block.id === blockId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    applyBlocks(next);
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
      <div className="grid grid-cols-1 min-[1200px]:grid-cols-[232px_1fr_288px] h-[calc(100dvh-56px)]">
        <div className="hidden min-[1200px]:block border-r border-[var(--color-border)] p-5"><Skeleton className="h-5 w-24 mb-4" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-3/4" /></div>
        <div className="p-6 sm:p-10"><Skeleton className="h-7 w-2/3 mb-6" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-5/6" /></div>
        <div className="hidden min-[1200px]:flex border-l border-[var(--color-border)] p-5 flex-col items-center"><Skeleton className="h-28 w-28 rounded-full mb-4" /><Skeleton className="h-9 w-full" /></div>
      </div>
    );
  }

  const sections = blocks.filter((b) => b.type === 'section');
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
          <Button variant="secondary" size="sm" onClick={() => navigate(`/doc/${id}/export`)}>Export</Button>
        </div>
      </div>

      {/* Shared formatting toolbar (Word-like) — acts on the focused block. */}
      <div className="flex items-center gap-2 px-3 sm:px-5 h-[48px] shrink-0 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
        <EditorToolbar onAfter={() => {
          const el = document.activeElement as HTMLElement | null;
          if (el && el.getAttribute('contenteditable') === 'true') {
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }} />
        <RefMenu blocks={blocks} onPick={(refId) => insertXref(refId)} />
        <div className="flex items-center gap-1.5 ml-auto min-[1200px]:hidden">
          <button type="button" onClick={(event) => { panelTrigger.current = event.currentTarget; setPanel('left'); }}
            aria-label="Open outline and references" aria-expanded={panel === 'left'} aria-controls="editor-left-panel"
            className="flex min-h-8 items-center gap-1.5 whitespace-nowrap text-[12px] font-medium px-2.5 py-1.5 border border-[var(--color-border)] rounded-[var(--radius)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-raised)] transition-colors">
            <PanelLeft size={14} /><span className="hidden sm:inline">Outline</span>
          </button>
          <button type="button" onClick={(event) => { panelTrigger.current = event.currentTarget; setPanel('right'); }}
            aria-label="Open readiness and labels" aria-expanded={panel === 'right'} aria-controls="editor-right-panel"
            className="flex min-h-8 items-center gap-1.5 whitespace-nowrap text-[12px] font-medium px-2.5 py-1.5 border border-[var(--color-border)] rounded-[var(--radius)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-raised)] transition-colors">
            <PanelRight size={14} /><span className="hidden sm:inline">Readiness</span>
          </button>
        </div>
      </div>

      {panel && (
        <button type="button" tabIndex={-1} aria-label="Close editor panel" onClick={closePanel}
          className="fixed inset-x-0 top-14 bottom-0 z-40 bg-[#0b1220]/45 backdrop-blur-[2px] border-none min-[1200px]:hidden" />
      )}

      <div className="grid grid-cols-1 min-[1200px]:grid-cols-[232px_1fr_288px] flex-1 min-h-0 min-w-0">
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
          <div className={paneLabel}>Outline</div>
          <div className="flex flex-col gap-0.5">
            {sections.length === 0 && <span className="text-[13px] text-[var(--color-faint)]">Add a section to begin</span>}
            {sections.map((s) => (
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
            <FrontMatter title={docTitle} authors={authors}
              onTitle={saveTitle} onAuthors={saveAuthors} />
            {blocks.map((b, i) => (
              <div key={b.id}
                onDragOver={(e) => { if (dragId) e.preventDefault(); }}
                onDrop={() => onDrop(b.id)}
                className={dragId && dragId !== b.id ? 'border-t-2 border-transparent hover:border-[var(--color-accent)]' : ''}>
                {/* insert-between affordance */}
                <InsertBar onInsert={(t) => insertBlock(t, i)} />
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
            ))}

            <InsertBar onInsert={(t) => insertBlock(t)} always />

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

        {/* right: readiness */}
        <aside id="editor-right-panel" ref={rightPanel}
          inert={compactPanels && panel !== 'right'} aria-hidden={compactPanels && panel !== 'right'}
          role={compactPanels && panel === 'right' ? 'dialog' : undefined} aria-modal={compactPanels && panel === 'right' ? true : undefined}
          aria-label="Readiness and labels" className={`border-l border-[var(--color-border)] px-4 py-5 bg-[var(--color-surface-2)] overflow-y-auto
          min-[1200px]:static min-[1200px]:z-auto min-[1200px]:w-auto min-[1200px]:translate-x-0
          max-[1200px]:fixed max-[1200px]:top-14 max-[1200px]:bottom-0 max-[1200px]:right-0 max-[1200px]:z-50
          max-[1200px]:w-[min(340px,calc(100vw-48px))] max-[1200px]:transition-transform max-[1200px]:duration-200 max-[1200px]:shadow-[var(--shadow-modal)]
          ${panel === 'right' ? 'max-[1200px]:translate-x-0' : 'max-[1200px]:translate-x-full'}`}>
          <div className="flex items-center justify-between mb-4 min-[1200px]:hidden">
            <span className="font-medium">Readiness and labels</span>
            <button type="button" onClick={closePanel} aria-label="Close readiness and labels"
              className="p-2 rounded-[var(--radius)] text-[var(--color-muted)] border-none bg-transparent cursor-pointer">
              <X size={17} />
            </button>
          </div>
          <div className={paneLabel}>Readiness</div>
          <div className="flex flex-col items-center gap-3">
            <ReadinessGauge score={score} stale={stale && score !== null} />
            <AnimatePresence>
              {stale && score !== null && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Badge tone="partial">Edited since last check</Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button variant="primary" className="w-full mt-4" onClick={checkCompliance} disabled={!tpl}>
            {score === null ? 'Check compliance' : 'Re-check'}
          </Button>
          {!tpl && <div className="text-[12px] text-[var(--color-faint)] mt-2">Choose a template on the dashboard to enable checks.</div>}

          <AnimatePresence>
            {report && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mt-5 mb-2 text-[13px] text-[var(--color-muted)] flex items-center gap-1.5">
                  {report.issues.length === 0
                    ? <><CircleCheck size={14} className="text-[var(--status-ready)]" /> No issues — ready to submit</>
                    : `${report.issues.length} issue${report.issues.length === 1 ? '' : 's'}`}
                </div>
                <motion.div className="flex flex-col gap-2" initial="hidden" animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
                  {report.issues.map((issue) => (
                    <motion.div key={issue.id} variants={{ hidden: { opacity: 0, x: 8 }, show: { opacity: 1, x: 0 } }}
                      transition={{ duration: 0.2 }}
                      className="border border-[var(--color-border)] rounded-[var(--radius)] p-2.5 flex gap-2 items-start justify-between bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
                      <div className="flex gap-2 items-start min-w-0">
                        <CircleAlert size={14} className="shrink-0 mt-0.5"
                          style={{ color: issue.severity === 'error' ? 'var(--status-error)' : 'var(--status-partial)' }} />
                        <span className="text-[12px] text-[var(--color-text)] leading-snug">{issue.message}</span>
                      </div>
                      {issue.targetBlockId && (
                        <button onClick={() => goToBlock(issue.targetBlockId)}
                          className="shrink-0 flex items-center gap-1 text-[12px] text-[var(--color-accent)] cursor-pointer border border-[var(--color-accent-bg)] rounded-md px-2 py-0.5 bg-transparent hover:bg-[var(--color-accent-bg)] transition-colors">
                          <Crosshair size={11} /> Go
                        </button>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <LabelsPanel documentId={id!} onPulled={() => setRefKey((k) => k + 1)} />
        </aside>
      </div>
    </div>
  );
}

/** A slim insert affordance between blocks: hover reveals block-type buttons. */
function InsertBar({ onInsert, always = false }: {
  onInsert: (t: DocumentBlock['type']) => void; always?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const items = [['paragraph', 'Text'], ['section', 'Section'], ['equation', 'Equation'],
    ['figure', 'Figure'], ['table', 'Table']] as const;

  if (always) {
    // Persistent, prominent "add content" toolbar at the end of the document.
    return (
      <div className="mt-8 pt-5 border-t border-dashed border-[var(--color-border-strong)]">
        <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-faint)] font-semibold mb-2">
          Add content
        </div>
        <div className="flex gap-2 flex-wrap">
          {items.map(([type, label]) => (
            <button key={type} onClick={() => onInsert(type)}
              className="flex min-h-9 items-center gap-1.5 text-[13px] font-medium text-[var(--color-text)] cursor-pointer border border-[var(--color-border)] rounded-[var(--radius)] px-3 py-1.5 bg-[var(--color-surface-2)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-bg)] transition-colors">
              <span className="text-[var(--color-accent)] font-semibold">+</span> {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Between-blocks inserter: a hoverable gap that reveals a + and buttons.
  return (
    <div className="relative h-5 flex items-center justify-center group/ins"
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {open ? (
        <div className="flex gap-1.5 flex-wrap py-1 px-2 bg-[var(--color-bg)] z-10 rounded">
          {items.map(([type, label]) => (
            <button key={type} onClick={() => onInsert(type)}
              className="text-[11px] text-[var(--color-muted)] cursor-pointer border border-[var(--color-border)] rounded-[var(--radius)] px-2.5 py-0.5 bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
              + {label}
            </button>
          ))}
        </div>
      ) : (
        <div className="w-full flex items-center justify-center">
          <div className="flex-1 h-px group-hover/ins:bg-[var(--color-border)] transition-colors" />
          <span className="opacity-0 group-hover/ins:opacity-100 transition-opacity text-[var(--color-faint)] text-[11px] px-2 shrink-0">+ insert</span>
          <div className="flex-1 h-px group-hover/ins:bg-[var(--color-border)] transition-colors" />
        </div>
      )}
    </div>
  );
}
