/**
 * Left panel — THIS DOCUMENT'S references (working set).
 * Starts empty for a new document. A reference joins when you add it here or
 * pull it in from a Label on the right. Add by DOI / BibTeX / manual.
 * Click a reference to cite it at the cursor. Cards are compact + uniform.
 */
import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, BookMarked, Loader2, Tag } from 'lucide-react';
import {
  addReference, fetchByDoi, parseBibtex,
  listDocumentReferences, addReferenceToDocument, removeReferenceFromDocument,
  listLabels, toggleLabel, labelsForReference, type Label,
} from '../../services/references';
import type { Reference } from '../../types/document';

type Mode = 'doi' | 'bibtex' | 'manual';

export function ReferencePanel({ documentId, onCite, refreshKey }: {
  documentId: string;
  onCite: (ref: Reference) => void;
  refreshKey: number;
}) {
  const [refs, setRefs] = useState<Reference[]>([]);
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<Mode>('doi');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [manual, setManual] = useState({ title: '', authors: '', year: '', container: '' });

  const refresh = useCallback(() => {
    listDocumentReferences(documentId).then(setRefs);
  }, [documentId]);
  useEffect(() => { refresh(); }, [refresh, refreshKey]);

  const [labels, setLabels] = useState<Label[]>([]);
  const [tagFor, setTagFor] = useState<string | null>(null); // ref id whose tag menu is open
  const [tagSet, setTagSet] = useState<Set<string>>(new Set());
  useEffect(() => { listLabels().then(setLabels); }, [refreshKey]);

  async function openTags(refId: string) {
    if (tagFor === refId) { setTagFor(null); return; }
    setLabels(await listLabels());
    const ids = await labelsForReference(refId);
    setTagSet(new Set(ids));
    setTagFor(refId);
  }
  async function flipTag(refId: string, labelId: string) {
    await toggleLabel(refId, labelId);
    setTagSet((prev) => {
      const n = new Set(prev);
      if (n.has(labelId)) n.delete(labelId); else n.add(labelId);
      return n;
    });
  }

  async function submit() {
    setErr(''); setBusy(true);
    try {
      let created: Reference;
      if (mode === 'doi') created = await addReference(await fetchByDoi(input));
      else if (mode === 'bibtex') created = await addReference(parseBibtex(input));
      else created = await addReference({
        title: manual.title || 'Untitled',
        authors: manual.authors ? manual.authors.split(';').map((a) => a.trim()) : [],
        year: manual.year ? parseInt(manual.year, 10) : null,
        container: manual.container || undefined,
        cslJson: {},
      });
      await addReferenceToDocument(documentId, created.id); // pull into this doc
      setInput(''); setManual({ title: '', authors: '', year: '', container: '' });
      setAdding(false);
      refresh();
    } catch {
      setErr(mode === 'doi' ? 'Could not find that DOI.' : 'Could not parse that entry.');
    } finally { setBusy(false); }
  }

  const inputCls =
    'w-full text-[13px] px-2.5 py-2 border border-[var(--color-border-strong)] rounded-[var(--radius)] ' +
    'bg-[var(--color-surface)] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] mb-2';

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] tracking-[0.06em] uppercase text-[var(--color-faint)] font-semibold">
          References
        </span>
        <button onClick={() => setAdding((v) => !v)} aria-label="Add reference"
          className="p-1 rounded text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] cursor-pointer border-none bg-transparent">
          <Plus size={14} />
        </button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3">
            <div className="flex gap-1 mb-2">
              {(['doi', 'bibtex', 'manual'] as Mode[]).map((m) => (
                <button key={m} onClick={() => { setMode(m); setErr(''); }}
                  className={`text-[11px] px-2 py-1 rounded cursor-pointer border ${
                    mode === m ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-bg)]'
                    : 'border-[var(--color-border)] text-[var(--color-muted)] bg-transparent'}`}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            {mode === 'doi' && (
              <input autoFocus value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="10.1109/... or doi.org link" className={inputCls}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
            )}
            {mode === 'bibtex' && (
              <textarea autoFocus value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Paste BibTeX…" rows={4} className={inputCls} />
            )}
            {mode === 'manual' && (
              <>
                <input value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} placeholder="Title" className={inputCls} />
                <input value={manual.authors} onChange={(e) => setManual({ ...manual, authors: e.target.value })} placeholder="Authors (Surname, F.; …)" className={inputCls} />
                <input value={manual.year} onChange={(e) => setManual({ ...manual, year: e.target.value })} placeholder="Year" className={inputCls} />
                <input value={manual.container} onChange={(e) => setManual({ ...manual, container: e.target.value })} placeholder="Journal / source" className={inputCls} />
              </>
            )}
            {err && <div className="text-[11px] text-[var(--status-error)] mb-2">{err}</div>}
            <button onClick={submit} disabled={busy}
              className="w-full text-[12px] py-1.5 rounded-[var(--radius)] bg-[var(--color-accent)] text-white border-none cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
              {busy ? <><Loader2 size={12} className="animate-spin" /> Fetching…</> : 'Add to document'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {refs.length === 0 && !adding && (
        <div className="flex flex-col items-center text-center py-4 text-[var(--color-faint)]">
          <BookMarked size={18} strokeWidth={1.5} />
          <span className="text-[11px] mt-1.5 leading-snug">No references in this document yet.<br/>Add one, or pull from a Label →</span>
        </div>
      )}

      {/* Compact, uniform reference cards. */}
      <div className="flex flex-col gap-1">
        {refs.map((r) => (
          <div key={r.id} className="group border border-[var(--color-border)] rounded-[var(--radius)] px-2 py-1.5 hover:border-[var(--color-accent)] transition-colors">
            <div className="flex items-start gap-1.5">
              <button onClick={() => onCite(r)} title="Click to cite at cursor"
                className="text-left flex-1 min-w-0 cursor-pointer border-none bg-transparent p-0">
                <div className="text-[11.5px] font-medium text-[var(--color-text)] leading-tight truncate">{r.title}</div>
                <div className="text-[10.5px] text-[var(--color-muted)] truncate">
                  {r.authors[0]?.split(',')[0] ?? 'Unknown'}{r.authors.length > 1 ? ' et al.' : ''} · {r.year ?? 'n.d.'} · <span className="text-[var(--color-accent)] font-mono">{r.citeKey}</span>
                </div>
              </button>
              <button onClick={() => openTags(r.id)} aria-label="Labels" title="Add labels"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-faint)] hover:text-[var(--color-accent)] cursor-pointer border-none bg-transparent p-0 shrink-0 mt-0.5">
                <Tag size={11} />
              </button>
              <button onClick={async () => { await removeReferenceFromDocument(documentId, r.id); refresh(); }}
                aria-label="Remove from document"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-faint)] hover:text-[var(--status-error)] cursor-pointer border-none bg-transparent p-0 shrink-0 mt-0.5">
                <Trash2 size={11} />
              </button>
            </div>
            {tagFor === r.id && (
              <div className="mt-1.5 pt-1.5 border-t border-[var(--color-border)] flex flex-wrap gap-1">
                {labels.length === 0 && <span className="text-[10.5px] text-[var(--color-faint)]">No labels yet — create one on the right →</span>}
                {labels.map((l) => (
                  <button key={l.id} onClick={() => flipTag(r.id, l.id)}
                    className={`text-[10.5px] px-1.5 py-0.5 rounded-full cursor-pointer border ${
                      tagSet.has(l.id) ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)]'
                        : 'border-[var(--color-border)] text-[var(--color-muted)] bg-transparent'}`}>
                    {tagSet.has(l.id) ? '✓ ' : ''}{l.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
