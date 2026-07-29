import { TargetMenu } from './TargetMenu';
import { ChristThesisForm, emptyChristMeta } from './ChristThesisForm';
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
  { id: 'latex-pdf', label: 'LaTeX PDF (local)', hint: 'True typeset — needs local server', icon: FileCode },
  { id: 'latex-src', label: 'LaTeX source (.tex)', hint: 'For Overleaf', icon: FileCode },
];

const LATEX_SERVER = 'http://localhost:4711';

export function ExportScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<TemplytXDocument | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [targetId, setTargetId] = useState<string>('');
  const [fmt, setFmt] = useState('pdf');
  const [latexMode, setLatexMode] = useState<'submission' | 'cameraready'>('submission');
  const [customClass, setCustomClass] = useState('');
  const [christMeta, setChristMeta] = useState(emptyChristMeta());
  const [christLoaded, setChristLoaded] = useState(false);
  const [includeAuthors, setIncludeAuthors] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDocument(id).then((d) => {
      setDoc(d);
      setTargetId(d?.targetTemplateId ?? 'tpl-ieee');
      if (d?.christThesis && !christLoaded) { setChristMeta(d.christThesis); setChristLoaded(true); }
    });
    listTemplates().then(setTemplates);
  }, [id]);

  const tpl = templates.find((t) => t.id === targetId) ?? null;
  const isChristThesis = tpl?.id === 'tpl-christ-thesis';

  // Live compliance against the CHOSEN export target (not the doc's stored one).
  const report = doc && tpl ? runCompliance({
    documentId: doc.id, blocks: doc.blocks, references: doc.references,
    ruleConfigs: tpl.rules.map((rc) => rc.ruleId === 'required-sections'
      ? { ...rc, params: { ...(rc.params ?? {}), required: tpl.sections.filter((s) => s.required).map((s) => s.title) } }
      : rc),
  }) : null;
  const score = report ? report.score : null;
  const ready = score === 100;

  const [latexError, setLatexError] = useState('');

  async function handleGenerate() {
    if (!doc || !tpl) return;
    setBusy(true);
    setLatexError('');
    try {
      const docForExport = includeAuthors ? doc : { ...doc, authors: [] };
      if (fmt === 'docx') {
        const { exportDocx } = await import('./exportDocx');
        await exportDocx(docForExport, tpl);
      } else if (fmt === 'latex-src') {
        // Download the .tex source.
        let tex: string;
        if (isChristThesis) {
          const { buildChristThesis } = await import('./exportChristThesis');
          tex = buildChristThesis({ ...docForExport, christThesis: christMeta });
        } else {
          const { buildLatex } = await import('./exportLatex');
          tex = buildLatex(docForExport, tpl, latexMode, customClass);
        }
        const blob = new Blob([tex], { type: 'text/x-tex' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${(doc.title || 'document').replace(/[^a-z0-9]+/gi, '_')}.tex`;
        a.click(); URL.revokeObjectURL(url);
      } else if (fmt === 'latex-pdf') {
        // Send .tex to the local LaTeX server and open the compiled PDF.
        let tex: string;
        if (isChristThesis) {
          const { buildChristThesis } = await import('./exportChristThesis');
          tex = buildChristThesis({ ...docForExport, christThesis: christMeta });
        } else {
          const { buildLatex } = await import('./exportLatex');
          tex = buildLatex(docForExport, tpl, latexMode, customClass);
        }
        try {
          const res = await fetch(`${LATEX_SERVER}/compile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latex: tex }),
          });
          if (!res.ok) {
            const msg = await res.text();
            setLatexError(`LaTeX compile failed:\n${msg.slice(0, 800)}`);
            return;
          }
          const blob = await res.blob();
          window.open(URL.createObjectURL(blob), '_blank');
        } catch {
          setLatexError('Could not reach your local LaTeX server. Start it (run start-latex.bat or `node server.js`), then try again.');
        }
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
      <TargetMenu templates={templates} value={targetId} onChange={setTargetId} />

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

      {isChristThesis && (fmt === 'latex-pdf' || fmt === 'latex-src') && (
        <ChristThesisForm meta={christMeta} onChange={setChristMeta} />
      )}

      {(fmt === 'latex-pdf' || fmt === 'latex-src') && !isChristThesis && (
        <div className="mb-3">
          <div className="text-[12px] font-medium text-[var(--color-muted)] mb-1.5">LaTeX output mode</div>
          <div className="flex gap-2">
            <button onClick={() => setLatexMode('submission')}
              className={`flex-1 text-left px-3 py-2 rounded-[var(--radius)] border cursor-pointer ${latexMode === 'submission' ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)]' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}>
              <div className="text-[13px] font-medium text-[var(--color-text)]">Submission</div>
              <div className="text-[11px] text-[var(--color-muted)]">Review manuscript — what you send first</div>
            </button>
            <button onClick={() => setLatexMode('cameraready')}
              className={`flex-1 text-left px-3 py-2 rounded-[var(--radius)] border cursor-pointer ${latexMode === 'cameraready' ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)]' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}>
              <div className="text-[13px] font-medium text-[var(--color-text)]">Camera-ready</div>
              <div className="text-[11px] text-[var(--color-muted)]">Final typeset look (e.g. two-column)</div>
            </button>
          </div>
          <div className="mt-2">
            <label className="text-[12px] text-[var(--color-muted)]">
              Custom journal class (optional) — for a template you dropped in the server's <code>classes</code> folder:
            </label>
            <input value={customClass} onChange={(e) => setCustomClass(e.target.value)}
              placeholder="e.g. sn-jnl (leave blank to use the built-in mapping)"
              className="w-full mt-1 text-[13px] px-2.5 py-1.5 border border-[var(--color-border-strong)] rounded-[var(--radius)] bg-[var(--color-surface)] outline-none focus:border-[var(--color-accent)]" />
          </div>
        </div>
      )}

      <Button variant="primary" className="w-full" onClick={handleGenerate} disabled={busy || !tpl}>
        {busy ? 'Generating…' : `Generate ${tpl?.name} ${fmt.toUpperCase()}`}
      </Button>
      {fmt === 'latex-pdf' && !latexError && (
        <p className="text-[12px] text-[var(--color-muted)] mt-2">
          Requires your local LaTeX server running (start-latex.bat). True typeset PDF via pdflatex.
        </p>
      )}
      {latexError && (
        <pre className="text-[12px] text-[var(--status-error)] mt-2 whitespace-pre-wrap bg-[var(--status-error-bg)] p-2 rounded-[var(--radius)]">{latexError}</pre>
      )}
    </motion.div>
  );
}
