import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Plus, Upload, Trash2 } from 'lucide-react';
import { listDocuments, createDocument, listTemplates, deleteDocument } from '../../services/documents';
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

  const inputCls =
    'text-[14px] px-3 py-2.5 border border-[var(--color-border-strong)] rounded-[var(--radius)] ' +
    'bg-[var(--color-surface)] text-[var(--color-text)] outline-none ' +
    'focus:border-[var(--color-accent)] transition-colors';

  return (
    <div className="max-w-[780px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-[28px] font-semibold tracking-tight"
          >
            Your documents
          </motion.h1>
          <p className="text-[var(--color-muted)] mt-1.5 text-[16px]">
            {docs === null ? '…' : `${docs.length} document${docs.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex max-[399px]:flex-col w-full sm:w-auto items-center gap-2">
          <Button variant="secondary" className="w-full min-[400px]:flex-1 sm:w-auto sm:flex-none whitespace-nowrap" onClick={() => navigate('/templates/upload')}>
            <Upload size={15} /> Upload template
          </Button>
          <Button variant={creating ? 'secondary' : 'primary'} className="w-full min-[400px]:flex-1 sm:w-auto sm:flex-none whitespace-nowrap" onClick={() => setCreating((v) => !v)}>
            {creating ? 'Cancel' : <><Plus size={15} /> New document</>}
          </Button>
        </div>
      </div>

      {creating && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden mb-6"
        >
          <Card className="p-4 flex gap-3 items-center flex-wrap min-w-0">
            <input autoFocus placeholder="Document title" value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              className={`${inputCls} flex-1 basis-full sm:basis-auto min-w-0 sm:min-w-[220px]`} />
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={`${inputCls} w-full sm:w-auto min-w-0`}>
              {(['journal', 'thesis', 'report', 'proposal', 'lab-report', 'cv'] as const).map((type) => {
                const group = templates.filter((t) => t.type === type);
                if (group.length === 0) return null;
                const label = { journal: 'Journals', thesis: 'Thesis', report: 'Reports', proposal: 'Proposals', 'lab-report': 'Lab Reports', cv: 'Academic CV' }[type];
                return (
                  <optgroup key={type} label={label}>
                    {group.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </optgroup>
                );
              })}
            </select>
            <Button variant="primary" className="w-full sm:w-auto" onClick={handleCreate}>Create</Button>
          </Card>
        </motion.div>
      )}

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
          className="flex flex-col gap-3"
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
                <Card onClick={() => navigate(`/doc/${d.id}`)} className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4 min-w-0 group">
                  <div className="flex-1 min-w-0">
                    <div className="tx-document text-[18px] font-medium text-[var(--color-text)] mb-2 truncate">
                      {d.title}
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge tone="accent">{tpl?.name ?? 'No template'}</Badge>
                      <Badge tone={statusTone(d.status)}>{statusLabel(d)}</Badge>
                    </div>
                  </div>
                  <div className="tabular-nums text-[22px] font-semibold min-w-[52px] text-right"
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
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-[var(--radius)] text-[var(--color-faint)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] cursor-pointer border-none bg-transparent shrink-0">
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
