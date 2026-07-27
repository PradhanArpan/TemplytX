import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, FileType, FileCode, TriangleAlert, Users, UserX } from 'lucide-react';
import { getDocument, listTemplates } from '../../services/documents';
import { runCompliance } from '../compliance/engine';
import { exportPdf } from './exportHtml';
import type { TemplytXDocument } from '../../types/document';
import type { Template } from '../../types/compliance';
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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [targetId, setTargetId] = useState<string>('');
  const [fmt, setFmt] = useState('pdf');
  const [includeAuthors, setIncludeAuthors] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDocument(id).then((d) => {
      setDoc(d);
      setTargetId(d?.targetTemplateId ?? 'tpl-ieee');
    });
    listTemplates().then(setTemplates);
  }, [id]);

  const tpl = templates.find((t) => t.id === targetId) ?? null;

  // Live compliance against the CHOSEN export target (not the doc's stored one).
  const report = doc && tpl ? runCompliance({
    documentId: doc.id, blocks: doc.blocks, references: doc.references,
    ruleConfigs: tpl.rules.map((rc) => rc.ruleId === 'required-sections'
      ? { ...rc, params: { ...(rc.params ?? {}), required: tpl.sections.filter((s) => s.required).map((s) => s.title) } }
      : rc),
  }) : null;
  const score = report ? report.score : null;
  const ready = score === 100;

  async function handleGenerate() {
    if (!doc || !tpl) return;
    setBusy(true);
    try {
      const docForExport = includeAuthors ? doc : { ...doc, authors: [] };
      if (fmt === 'docx') {
        const { exportDocx } = await import('./exportDocx');
        await exportDocx(docForExport, tpl);
      } else {
        exportPdf(docForExport, tpl);
      }
    } finally { setBusy(false); }
  }

  if (!doc) {
    return (
      <div className="max-w-[460px] mx-auto px-6 py-10">
        <Skeleton className="h-5 w-32 mb-6" /><Skeleton className="h-8 w-40 mb-3" />
        <Skeleton className="h-24 w-full mb-6" /><Skeleton className="h-12 w-full mb-2" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const inputCls =
    'w-full text-[14px] px-3 py-2.5 border border-[var(--color-border-strong)] rounded-[var(--radius)] ' +
    'bg-[var(--color-surface)] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }} className="max-w-[460px] mx-auto px-6 py-10">
      <button onClick={() => navigate(`/doc/${id}`)}
        className="flex items-center gap-1.5 text-[13px] text-[var(--color-muted)] mb-5 cursor-pointer border-none bg-transparent p-0 hover:text-[var(--color-text)] transition-colors">
        <ArrowLeft size={14} /> Back to editor
      </button>

      <h1 className="text-[28px] font-semibold tracking-tight mb-2">Export</h1>
      <p className="tx-document text-[var(--color-muted)] text-[16px] mb-6">{doc.title}</p>

      {/* CHOOSE TARGET FORMAT — the decoupling. Same article, any journal. */}
      <div className="text-[13px] text-[var(--color-faint)] uppercase tracking-[0.06em] font-semibold mb-2">
        Target format
      </div>
      <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className={`${inputCls} mb-2`}>
        {(['journal', 'thesis', 'report', 'proposal'] as const).map((type) => {
          const group = templates.filter((t) => t.type === type);
          if (group.length === 0) return null;
          const label = { journal: 'Journals', thesis: 'Thesis', report: 'Reports', proposal: 'Proposals' }[type];
          return <optgroup key={type} label={label}>
            {group.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </optgroup>;
        })}
      </select>

      {/* compliance against the chosen target */}
      <Card className="p-4 flex items-center gap-4 mb-6">
        <ReadinessGauge score={score} size={64} />
        <div>
          <div className="font-medium mb-1">
            {ready ? `Ready for ${tpl?.name}` : `Issues for ${tpl?.name}`}
          </div>
          <Badge tone={ready ? 'ready' : 'partial'}>
            {score}% compliant with {tpl?.name}
          </Badge>
        </div>
      </Card>

      {/* author block toggle */}
      {doc.authors.length > 0 && (
        <>
          <div className="text-[13px] text-[var(--color-faint)] uppercase tracking-[0.06em] font-semibold mb-2">
            Author block
          </div>
          <div className="flex gap-2 mb-6">
            <button onClick={() => setIncludeAuthors(true)}
              className={`flex-1 flex items-center gap-2 rounded-[var(--radius)] px-3 py-2.5 cursor-pointer text-left transition-all ${includeAuthors ? 'border border-[var(--color-accent)] bg-[var(--color-accent-bg)]' : 'border border-[var(--color-border)] bg-[var(--color-surface)]'}`}>
              <Users size={16} className={includeAuthors ? 'text-[var(--color-accent)]' : 'text-[var(--color-faint)]'} />
              <div><div className="font-medium text-[13px]">Include authors</div><div className="text-[11px] text-[var(--color-muted)]">Final submission</div></div>
            </button>
            <button onClick={() => setIncludeAuthors(false)}
              className={`flex-1 flex items-center gap-2 rounded-[var(--radius)] px-3 py-2.5 cursor-pointer text-left transition-all ${!includeAuthors ? 'border border-[var(--color-accent)] bg-[var(--color-accent-bg)]' : 'border border-[var(--color-border)] bg-[var(--color-surface)]'}`}>
              <UserX size={16} className={!includeAuthors ? 'text-[var(--color-accent)]' : 'text-[var(--color-faint)]'} />
              <div><div className="font-medium text-[13px]">Anonymize</div><div className="text-[11px] text-[var(--color-muted)]">Double-blind review</div></div>
            </button>
          </div>
        </>
      )}

      <div className="text-[13px] text-[var(--color-faint)] uppercase tracking-[0.06em] font-semibold mb-3">Format</div>
      <div className="flex flex-col gap-2 mb-6" role="radiogroup" aria-label="Export format">
        {formats.map((f) => {
          const Icon = f.icon; const active = fmt === f.id;
          return (
            <motion.button key={f.id} role="radio" aria-checked={active} onClick={() => setFmt(f.id)} whileTap={{ scale: 0.99 }}
              className={'flex items-center gap-3 rounded-[var(--radius)] px-4 py-3 cursor-pointer text-left transition-all ' +
                (active ? 'border border-[var(--color-accent)] bg-[var(--color-accent-bg)] shadow-[var(--shadow-card)]'
                        : 'border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]')}>
              <Icon size={18} className={active ? 'text-[var(--color-accent)]' : 'text-[var(--color-faint)]'} />
              <div><div className="font-medium text-[var(--color-text)] text-[14px]">{f.label}</div>
                <div className="text-[12px] text-[var(--color-muted)]">{f.hint}</div></div>
            </motion.button>
          );
        })}
      </div>

      {!ready && (
        <div className="flex items-start gap-2 text-[13px] text-[var(--status-partial)] bg-[var(--status-partial-bg)] px-4 py-3 rounded-[var(--radius)] mb-4">
          <TriangleAlert size={15} className="shrink-0 mt-0.5" />
          <span>Not fully compliant with {tpl?.name}. You can export anyway, but it may be desk-rejected.</span>
        </div>
      )}

      <Button variant="primary" className="w-full" onClick={handleGenerate} disabled={busy || !tpl}>
        {busy ? 'Generating…' : `Generate ${tpl?.name} ${fmt.toUpperCase()}`}
      </Button>
    </motion.div>
  );
}
