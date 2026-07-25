import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, FileType, FileCode, TriangleAlert } from 'lucide-react';
import { getDocument } from '../../services/documents';
import type { TemplytXDocument } from '../../types/document';
import { Button, Badge } from '../../components/ui/Button';
import { Card, Skeleton } from '../../components/ui/Card';
import { ReadinessGauge } from '../../components/ui/ReadinessGauge';

const formats = [
  { id: 'pdf', label: 'PDF', hint: 'Publication-ready', icon: FileText },
  { id: 'docx', label: 'Word (.docx)', hint: 'Editable source', icon: FileType },
  { id: 'latex', label: 'LaTeX source (.zip)', hint: 'For Overleaf', icon: FileCode },
];

export function ExportScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<TemplytXDocument | null>(null);
  const [fmt, setFmt] = useState('pdf');

  useEffect(() => { if (id) getDocument(id).then(setDoc); }, [id]);

  if (!doc) {
    return (
      <div className="max-w-[460px] mx-auto px-6 py-10">
        <Skeleton className="h-5 w-32 mb-6" />
        <Skeleton className="h-8 w-40 mb-3" />
        <Skeleton className="h-5 w-full mb-6" />
        <Skeleton className="h-24 w-full mb-6" />
        <Skeleton className="h-12 w-full mb-2" />
        <Skeleton className="h-12 w-full mb-2" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const ready = doc.readinessScore === 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="max-w-[460px] mx-auto px-6 py-10"
    >
      <button onClick={() => navigate(`/doc/${id}`)}
        className="flex items-center gap-1.5 text-[13px] text-[var(--color-muted)] mb-5 cursor-pointer border-none bg-transparent p-0 hover:text-[var(--color-text)] transition-colors">
        <ArrowLeft size={14} /> Back to editor
      </button>

      <h1 className="text-[28px] font-semibold tracking-tight mb-2">Export</h1>
      <p className="tx-document text-[var(--color-muted)] text-[16px] mb-6">{doc.title}</p>

      <Card className="p-4 flex items-center gap-4 mb-6">
        <ReadinessGauge score={doc.readinessScore} size={64} />
        <div>
          <div className="font-medium mb-1">
            {ready ? 'Ready to submit' : doc.readinessScore === null ? 'Not checked yet' : 'Issues remain'}
          </div>
          <Badge tone={ready ? 'ready' : doc.readinessScore === null ? 'none' : 'partial'}>
            {doc.readinessScore === null ? 'Run a compliance check first' : `${doc.readinessScore}% compliant`}
          </Badge>
        </div>
      </Card>

      <div className="text-[13px] text-[var(--color-faint)] uppercase tracking-[0.06em] font-semibold mb-3">
        Format
      </div>
      <div className="flex flex-col gap-2 mb-6" role="radiogroup" aria-label="Export format">
        {formats.map((f) => {
          const Icon = f.icon;
          const active = fmt === f.id;
          return (
            <motion.button key={f.id} role="radio" aria-checked={active}
              onClick={() => setFmt(f.id)}
              whileTap={{ scale: 0.99 }}
              className={
                'flex items-center gap-3 rounded-[var(--radius)] px-4 py-3 cursor-pointer text-left transition-all ' +
                (active
                  ? 'border border-[var(--color-accent)] bg-[var(--color-accent-bg)] shadow-[var(--shadow-card)]'
                  : 'border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]')
              }>
              <Icon size={18} className={active ? 'text-[var(--color-accent)]' : 'text-[var(--color-faint)]'} />
              <div>
                <div className="font-medium text-[var(--color-text)] text-[14px]">{f.label}</div>
                <div className="text-[12px] text-[var(--color-muted)]">{f.hint}</div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {!ready && (
        <div className="flex items-start gap-2 text-[13px] text-[var(--status-partial)] bg-[var(--status-partial-bg)] px-4 py-3 rounded-[var(--radius)] mb-4">
          <TriangleAlert size={15} className="shrink-0 mt-0.5" />
          <span>This document isn't fully compliant yet. You can export anyway, but it may be desk-rejected.</span>
        </div>
      )}

      <Button variant="primary" className="w-full">Generate &amp; download</Button>
    </motion.div>
  );
}
