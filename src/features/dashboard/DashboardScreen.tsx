import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Plus } from 'lucide-react';
import { listDocuments, createDocument, listTemplates } from '../../services/documents';
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
    <div className="max-w-[780px] mx-auto px-6 py-10">
      <div className="flex justify-between items-end mb-6">
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
        <Button variant={creating ? 'secondary' : 'primary'} onClick={() => setCreating((v) => !v)}>
          {creating ? 'Cancel' : <><Plus size={15} /> New document</>}
        </Button>
      </div>

      {creating && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden mb-6"
        >
          <Card className="p-4 flex gap-3 items-center flex-wrap">
            <input autoFocus placeholder="Document title" value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              className={`${inputCls} flex-1 min-w-[220px]`} />
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={inputCls}>
              {(['journal', 'thesis', 'report', 'proposal'] as const).map((type) => {
                const group = templates.filter((t) => t.type === type);
                if (group.length === 0) return null;
                const label = { journal: 'Journals', thesis: 'Thesis', report: 'Reports', proposal: 'Proposals' }[type];
                return (
                  <optgroup key={type} label={label}>
                    {group.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </optgroup>
                );
              })}
            </select>
            <Button variant="primary" onClick={handleCreate}>Create</Button>
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
                <Card onClick={() => navigate(`/doc/${d.id}`)} className="p-5 flex items-center gap-4">
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
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
