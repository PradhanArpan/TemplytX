import { TargetMenu } from '../export/TargetMenu';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Plus, Upload, Trash2 } from 'lucide-react';
import { listDocuments, createDocument, listTemplates, deleteDocument, updateDocument } from '../../services/documents';
import type { TemplytXDocument } from '../../types/document';
import type { Template } from '../../types/compliance';
import { Button, Badge } from '../../components/ui/Button';
import { Card, Skeleton, EmptyState } from '../../components/ui/Card';

function statusTone(status: string): 'ready' | 'partial' | 'none' {
  return status === 'ready' ? 'ready' : status === 'checked' ? 'partial' : 'none';
}
function statusLabel(d: TemplytXDocument): string {
  if (d.status === 'ready') return 'Ready to submit';
  if (d.status === 'checked') return 'Issues remain';
  return 'Not checked';
}
function scoreColor(d: TemplytXDocument): string {
  if (d.readinessScore === null) return 'var(--color-faint)';
  return d.status === 'ready' ? 'var(--status-ready)' : 'var(--status-partial)';
}

export function DashboardScreen() {
  const [docs, setDocs] = useState<TemplytXDocument[] | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(params.get('new') === '1');
  const [title, setTitle] = useState('');
  const [templateId, setTemplateId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    listDocuments().then(setDocs);
    listTemplates().then((t) => { setTemplates(t); setTemplateId(t[0]?.id ?? ''); });
  }, []);

  useEffect(() => {
    if (params.get('new') === '1') { setCreating(true); setParams({}, { replace: true }); }
  }, [params, setParams]);

  async function handleCreate() {
    const doc = await createDocument({ title: title.trim(), targetTemplateId: templateId || null });
    navigate(`/doc/${doc.id}`);
  }

  const [importing, setImporting] = useState(false);
  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      // Accept either a bare blocks array or { title, targetTemplateId, blocks }.
      const blocks = Array.isArray(data) ? data : data.blocks;
      if (!Array.isArray(blocks)) throw new Error('File must contain a blocks array.');
      const importTitle = (Array.isArray(data) ? '' : data.title) || file.name.replace(/\.json$/i, '');
      const targetId = (Array.isArray(data) ? null : data.targetTemplateId) ?? null;
      const doc = await createDocument({ title: importTitle, targetTemplateId: targetId });
      // Save blocks in chunks so very large imports don't send one huge request.
      const CHUNK = 300;
      let acc: unknown[] = [];
      for (let i = 0; i < blocks.length; i += CHUNK) {
        acc = acc.concat(blocks.slice(i, i + CHUNK));
        await updateDocument(doc.id, { blocks: acc as never });
      }
      navigate(`/doc/${doc.id}`);
    } catch (e) {
      alert('Import failed: ' + (e instanceof Error ? e.message : 'invalid file'));
    } finally {
      setImporting(false);
    }
  }

  const inputCls =
    'text-[14px] min-h-11 px-3.5 py-2.5 border border-[var(--color-border-strong)] rounded-[var(--radius)] ' +
    'bg-[var(--color-surface)] text-[var(--color-text)] outline-none ' +
    'placeholder:text-[var(--color-faint)] focus:border-[var(--color-accent)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] transition-[border-color,box-shadow]';

  return (
    <div className="max-w-[980px] mx-auto px-4 sm:px-6 py-9 sm:py-14">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-8 sm:mb-10">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[var(--color-accent)] mb-2">
            Writing workspace
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-[30px] sm:text-[36px] leading-tight font-semibold tracking-[-0.03em]"
          >
            Your documents
          </motion.h1>
          <p className="text-[var(--color-muted)] mt-2 text-[15px] sm:text-[16px] leading-relaxed max-w-[520px]">
            Organize your work, check requirements, and prepare every manuscript for submission.
          </p>
        </div>
        <div className="flex max-[399px]:flex-col w-full sm:w-auto items-center gap-2.5">
          <Button variant="secondary" className="w-full min-[400px]:flex-1 sm:w-auto sm:flex-none whitespace-nowrap" onClick={() => navigate('/templates/upload')}>
            <Upload size={15} /> Upload template
          </Button>
          <label className="w-full min-[400px]:flex-1 sm:w-auto sm:flex-none">
            <input type="file" accept="application/json,.json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.currentTarget.value = ''; }} />
            <span className="inline-flex items-center justify-center gap-2 w-full whitespace-nowrap text-[14px] min-h-11 px-4 rounded-[var(--radius)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer hover:border-[var(--color-accent)]">
              <Upload size={15} /> {importing ? 'Importing…' : 'Import document'}
            </span>
          </label>
          <Button variant={creating ? 'secondary' : 'primary'} className="w-full min-[400px]:flex-1 sm:w-auto sm:flex-none whitespace-nowrap"
            aria-expanded={creating} aria-controls="create-document-panel" onClick={() => setCreating((v) => !v)}>
            {creating ? 'Cancel' : <><Plus size={15} /> New document</>}
          </Button>
        </div>
      </div>

      {creating && (
        <motion.div
          id="create-document-panel"
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-visible mb-8"
        >
          <Card className="p-5 sm:p-6 min-w-0 border-[color-mix(in_srgb,var(--color-accent)_24%,var(--color-border))]">
            <div className="mb-4">
              <h2 className="text-[16px] font-semibold">Start a new document</h2>
              <p className="text-[13px] text-[var(--color-muted)] mt-1">Choose a clear working title and submission target.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(220px,1fr)_minmax(220px,auto)_auto] gap-3 items-end">
              <label className="min-w-0">
                <span className="block text-[12px] font-medium text-[var(--color-muted)] mb-1.5">Document title</span>
                <input autoFocus placeholder="e.g. Research manuscript" value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                  className={`${inputCls} w-full min-w-0`} />
              </label>
              <div className="min-w-0" role="group" aria-labelledby="target-template-label">
                <span id="target-template-label" className="block text-[12px] font-medium text-[var(--color-muted)] mb-1.5">Target template</span>
                <TargetMenu templates={templates} value={templateId} onChange={setTemplateId} />
              </div>
              <Button variant="primary" className="w-full sm:w-auto sm:min-h-11" onClick={handleCreate}>Create</Button>
            </div>
          </Card>
        </motion.div>
      )}

      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-[13px] font-semibold tracking-[0.04em] text-[var(--color-muted)]">Recent documents</h2>
        <span className="text-[12px] text-[var(--color-faint)] tabular-nums">
          {docs === null ? 'Loading…' : `${docs.length} total`}
        </span>
      </div>

      {docs === null && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[86px]" />)}
        </div>
      )}

      {docs !== null && docs.length === 0 && (
        <EmptyState
          icon={<FileText size={36} strokeWidth={1.5} />}
          title="No documents yet"
          hint="Create your first document and pick a submission target to get started."
          action={<Button variant="primary" onClick={() => setCreating(true)}><Plus size={15} /> New document</Button>}
        />
      )}

      {docs !== null && docs.length > 0 && (
        <motion.div
          className="grid grid-cols-1 gap-3.5"
          initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        >
          {docs.map((d) => {
            const tpl = templates.find((t) => t.id === d.targetTemplateId);
            return (
              <motion.div key={d.id}
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <Card className="relative p-4 sm:p-5 flex items-center gap-3.5 sm:gap-4 min-w-0 group transition-[border-color,box-shadow,transform] hover:shadow-[var(--shadow-hover)] hover:border-[color-mix(in_srgb,var(--color-accent)_30%,var(--color-border))]">
                  <button type="button" onClick={() => navigate(`/doc/${d.id}`)}
                    aria-label={`Open document: ${d.title}`}
                    className="absolute inset-0 z-0 rounded-[var(--radius-lg)] cursor-pointer border-none bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]" />
                  <div className="relative z-10 pointer-events-none w-11 h-11 rounded-xl shrink-0 hidden min-[430px]:inline-flex items-center justify-center bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]">
                    <FileText size={19} strokeWidth={1.8} />
                  </div>
                  <div className="relative z-10 flex-1 min-w-0 pointer-events-none">
                    <div className="tx-document text-[18px] sm:text-[19px] font-semibold text-[var(--color-text)] mb-2 truncate">
                      {d.title}
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Badge tone="accent">{tpl?.name ?? 'No template'}</Badge>
                      <Badge tone={statusTone(d.status)}>{statusLabel(d)}</Badge>
                    </div>
                  </div>
                  <div className="relative z-10 pointer-events-none tabular-nums text-[22px] font-semibold min-w-[52px] text-right"
                    style={{ color: scoreColor(d) }}>
                    {d.readinessScore === null ? '—' : `${d.readinessScore}%`}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${d.title}"? This cannot be undone.`)) {
                        deleteDocument(d.id).then(() => listDocuments().then(setDocs));
                      }
                    }}
                    aria-label="Delete document"
                    className="relative z-20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity p-2 rounded-[var(--radius)] text-[var(--color-faint)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] cursor-pointer border-none bg-transparent shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]">
                    <Trash2 size={16} />
                  </button>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
