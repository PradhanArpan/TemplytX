/**
 * Template upload entry point. Users upload a .zip (institute LaTeX template)
 * or .docx. V1 stores it and captures a spec to write against. TRUE typeset
 * fidelity (running the .cls) needs the compile backend — clearly flagged.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, FileArchive, Info } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { addUploadedTemplate } from '../../services/uploadedTemplates';

export function UploadTemplate() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'journal' | 'thesis' | 'report' | 'proposal'>('thesis');
  const [done, setDone] = useState(false);

  function onFile(f: File | null) {
    setFile(f);
    if (f && !name) setName(f.name.replace(/\.(zip|docx)$/i, ''));
  }
  async function save() {
    if (!file || !name) return;
    await addUploadedTemplate({ name, type, fileName: file.name, sizeBytes: file.size });
    setDone(true);
  }

  const inputCls =
    'w-full text-[14px] px-3 py-2.5 border border-[var(--color-border-strong)] rounded-[var(--radius)] ' +
    'bg-[var(--color-surface)] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }} className="max-w-[520px] mx-auto px-6 py-10">
      <button onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-[13px] text-[var(--color-muted)] mb-5 cursor-pointer border-none bg-transparent p-0 hover:text-[var(--color-text)] transition-colors">
        <ArrowLeft size={14} /> Back to documents
      </button>
      <h1 className="text-[28px] font-semibold tracking-tight mb-2">Upload a template</h1>
      <p className="text-[var(--color-muted)] text-[15px] mb-6">
        Bring your institute or publisher's template. Upload a LaTeX <code>.zip</code> or a Word <code>.docx</code>.
      </p>

      {done ? (
        <Card className="p-6 text-center">
          <div className="text-[var(--status-ready)] font-medium mb-2">Template saved to your library</div>
          <p className="text-[13px] text-[var(--color-muted)] mb-4">
            It's now selectable when creating a document. You can write against its structure today.
          </p>
          <Button variant="primary" onClick={() => navigate('/')}>Back to documents</Button>
        </Card>
      ) : (
        <>
          <label className="block mb-4">
            <div className={`border-2 border-dashed rounded-[var(--radius-lg)] p-8 text-center cursor-pointer transition-colors ${file ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)]' : 'border-[var(--color-border-strong)] hover:border-[var(--color-accent)]'}`}>
              {file ? (
                <div className="flex flex-col items-center gap-2 text-[var(--color-accent-text)]">
                  <FileArchive size={28} />
                  <span className="font-medium text-[14px]">{file.name}</span>
                  <span className="text-[12px] text-[var(--color-muted)]">{(file.size / 1024).toFixed(0)} KB</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-[var(--color-faint)]">
                  <Upload size={28} /><span className="text-[14px]">Click to choose a .zip or .docx</span>
                </div>
              )}
            </div>
            <input type="file" accept=".zip,.docx" className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          </label>

          <div className="mb-3">
            <label className="text-[12px] text-[var(--color-faint)] uppercase tracking-[0.06em] font-semibold">Template name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CHRIST University PhD Thesis" className={`${inputCls} mt-1`} />
          </div>
          <div className="mb-5">
            <label className="text-[12px] text-[var(--color-faint)] uppercase tracking-[0.06em] font-semibold">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={`${inputCls} mt-1`}>
              <option value="journal">Journal</option><option value="thesis">Thesis</option>
              <option value="report">Report</option><option value="proposal">Proposal</option>
            </select>
          </div>

          <div className="flex items-start gap-2 text-[12px] text-[var(--color-muted)] bg-[var(--color-surface-2)] px-3 py-2.5 rounded-[var(--radius)] mb-5">
            <Info size={14} className="shrink-0 mt-0.5 text-[var(--color-accent)]" />
            <span>Today this stores your template so you can write against its structure and export to our clean
              manuscript format. Reproducing your institute's <em>exact</em> LaTeX-typeset PDF needs the
              compilation engine — that's on the roadmap.</span>
          </div>

          <Button variant="primary" className="w-full" onClick={save} disabled={!file || !name}>
            Save to my templates
          </Button>
        </>
      )}
    </motion.div>
  );
}
