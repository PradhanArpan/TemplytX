import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CircleAlert, CircleCheck, Crosshair } from 'lucide-react';
import { getDocument, updateDocument, listTemplates } from '../../services/documents';
import { runCompliance } from '../compliance/engine';
import type { TemplytXDocument, DocumentBlock } from '../../types/document';
import type { Template, ComplianceReport } from '../../types/compliance';
import { Button, Badge } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Card';
import { ReadinessGauge } from '../../components/ui/ReadinessGauge';
import { BlockView } from './blocks/BlockView';

const paneLabel =
  'text-[12px] tracking-[0.06em] uppercase text-[var(--color-faint)] font-semibold mb-3';

function newBlock(type: DocumentBlock['type']): DocumentBlock {
  const id = `b-${crypto.randomUUID()}`;
  switch (type) {
    case 'section': return { id, type, level: 1, title: '' };
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
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [stale, setStale] = useState(false);
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    getDocument(id).then((d) => {
      setDoc(d);
      setBlocks(d?.blocks ?? []);
      if (d?.targetTemplateId) listTemplates().then((ts) =>
        setTpl(ts.find((t) => t.id === d.targetTemplateId) ?? null));
    });
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
    applyBlocks(blocks.map((b) => (b.id === blockId ? { ...b, ...patch } as DocumentBlock : b)));
  }
  function deleteBlock(blockId: string) { applyBlocks(blocks.filter((b) => b.id !== blockId)); }
  function addBlock(type: DocumentBlock['type']) { applyBlocks([...blocks, newBlock(type)]); }

  async function checkCompliance() {
    if (!doc || !tpl) return;
    // Feed the template's required section titles into the required-sections rule.
    const required = tpl.sections.filter((s) => s.required).map((s) => s.title);
    const ruleConfigs = tpl.rules.map((rc) =>
      rc.ruleId === 'required-sections'
        ? { ...rc, params: { ...(rc.params ?? {}), required } }
        : rc);
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
  }

  if (!doc) {
    return (
      <div className="grid grid-cols-[190px_1fr_276px] h-[calc(100vh-56px)]">
        <div className="border-r border-[var(--color-border)] p-5"><Skeleton className="h-5 w-24 mb-4" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-3/4" /></div>
        <div className="p-10"><Skeleton className="h-7 w-2/3 mb-6" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-5/6" /></div>
        <div className="border-l border-[var(--color-border)] p-5 flex flex-col items-center"><Skeleton className="h-28 w-28 rounded-full mb-4" /><Skeleton className="h-9 w-full" /></div>
      </div>
    );
  }

  const sections = blocks.filter((b) => b.type === 'section');
  const score = report ? report.score : doc.readinessScore;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* toolbar */}
      <div className="flex items-center justify-between px-6 h-[52px] border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/')} aria-label="Back to documents"
            className="p-1.5 rounded-[var(--radius)] text-[var(--color-muted)] cursor-pointer hover:bg-[var(--color-surface-2)] transition-colors border-none bg-transparent">
            <ArrowLeft size={17} />
          </button>
          <span className="tx-document text-[18px] font-medium truncate">{doc.title}</span>
          {tpl && <Badge tone="accent">{tpl.name}</Badge>}
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            <motion.span key={saved ? 'saved' : 'saving'}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-[12px] text-[var(--color-faint)]">
              {saved ? 'Saved' : 'Saving…'}
            </motion.span>
          </AnimatePresence>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/doc/${id}/export`)}>Export</Button>
        </div>
      </div>

      {/* three panes */}
      <div className="grid grid-cols-[190px_1fr_276px] flex-1 min-h-0">
        {/* outline */}
        <aside className="border-r border-[var(--color-border)] px-4 py-5 overflow-y-auto">
          <div className={paneLabel}>Outline</div>
          <div className="flex flex-col gap-0.5">
            {sections.length === 0 && (
              <span className="text-[13px] text-[var(--color-faint)]">Add a section to begin</span>
            )}
            {sections.map((s) => (
              <button key={s.id} onClick={() => goToBlock(s.id)}
                className="text-left px-2.5 py-1.5 rounded-[var(--radius)] text-[13px] text-[var(--color-muted)] cursor-pointer hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-colors border-none bg-transparent truncate">
                {(s as { title: string }).title || 'Untitled section'}
              </button>
            ))}
          </div>
        </aside>

        {/* writing surface */}
        <section className="overflow-y-auto px-10 py-8 bg-[var(--color-bg)]">
          <div className="max-w-[640px] mx-auto">
            {blocks.map((b) => (
              <BlockView key={b.id} block={b}
                onChange={(patch) => patchBlock(b.id, patch)}
                onDelete={() => deleteBlock(b.id)} />
            ))}
            <div className="flex gap-2 mt-6 flex-wrap">
              {([['section', '+ Section'], ['paragraph', '+ Text'], ['equation', '+ Equation'],
                 ['figure', '+ Figure'], ['table', '+ Table']] as const).map(([type, label]) => (
                <button key={type} onClick={() => addBlock(type)}
                  className="text-[12px] text-[var(--color-muted)] cursor-pointer border border-[var(--color-border)] rounded-[var(--radius)] px-3 py-1.5 bg-[var(--color-surface)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] transition-colors">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* readiness */}
        <aside className="border-l border-[var(--color-border)] px-4 py-5 bg-[var(--color-surface)] overflow-y-auto">
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
          {!tpl && (
            <div className="text-[12px] text-[var(--color-faint)] mt-2">
              Choose a template on the dashboard to enable checks.
            </div>
          )}

          <AnimatePresence>
            {report && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mt-5 mb-2 text-[13px] text-[var(--color-muted)] flex items-center gap-1.5">
                  {report.issues.length === 0
                    ? <><CircleCheck size={14} className="text-[var(--status-ready)]" /> No issues — ready to submit</>
                    : `${report.issues.length} issue${report.issues.length === 1 ? '' : 's'}`}
                </div>
                <motion.div className="flex flex-col gap-2"
                  initial="hidden" animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
                  {report.issues.map((issue) => (
                    <motion.div key={issue.id}
                      variants={{ hidden: { opacity: 0, x: 8 }, show: { opacity: 1, x: 0 } }}
                      transition={{ duration: 0.2 }}
                      className="border border-[var(--color-border)] rounded-[var(--radius)] p-2.5 flex gap-2 items-start justify-between bg-[var(--color-bg)]">
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
        </aside>
      </div>
    </div>
  );
}
