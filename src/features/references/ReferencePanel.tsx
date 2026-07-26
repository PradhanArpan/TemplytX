/**
 * Reference pool panel (left sidebar, below the outline).
 * Lists the account's reference library; add by DOI / BibTeX / manual;
 * click a reference to cite it at the current cursor position.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, BookMarked, Loader2 } from 'lucide-react';
import {
  listReferences, addReference, removeReference, fetchByDoi, parseBibtex,
} from '../../services/references';
import type { Reference } from '../../types/document';

type Mode = 'doi' | 'bibtex' | 'manual';

export function ReferencePanel({ onCite }: { onCite: (ref: Reference) => void }) {
  const [refs, setRefs] = useState<Reference[]>([]);
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<Mode>('doi');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [manual, setManual] = useState({ title: '', authors: '', year: '', container: '' });

  const refresh = () => listReferences().then(setRefs);
  useEffect(() => { refresh(); }, []);

  async function submit() {
    setErr(''); setBusy(true);
    try {
      if (mode === 'doi') {
        const data = await fetchByDoi(input);
        await addReference(data);
      } else if (mode === 'bibtex') {
        await addReference(parseBibtex(input));
      } else {
        await addReference({
          title: manual.title || 'Untitled',
          authors: manual.authors ? manual.authors.split(';').map((a) => a.trim()) : [],
          year: manual.year ? parseInt(manual.year, 10) : null,
          container: manual.container || undefined,
          cslJson: {},
        });
      }
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
              {busy ? <><Loader2 size={12} className="animate-spin" /> Fetching…</> : 'Add to library'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {refs.length === 0 && !adding && (
        <div className="flex flex-col items-center text-center py-4 text-[var(--color-faint)]">
          <BookMarked size={20} strokeWidth={1.5} />
          <span className="text-[12px] mt-1.5">No references yet</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {refs.map((r) => (
          <div key={r.id} className="group border border-[var(--color-border)] rounded-[var(--radius)] p-2 hover:border-[var(--color-border-strong)] transition-colors">
            <button onClick={() => onCite(r)} title="Click to cite at cursor"
              className="text-left w-full cursor-pointer border-none bg-transparent p-0">
              <div className="text-[12px] font-medium text-[var(--color-text)] leading-snug line-clamp-2">{r.title}</div>
              <div className="text-[11px] text-[var(--color-muted)] mt-0.5 truncate">
                {r.authors[0]?.split(',')[0] ?? 'Unknown'}{r.authors.length > 1 ? ' et al.' : ''} · {r.year ?? 'n.d.'}
              </div>
            </button>
            <button onClick={async () => { await removeReference(r.id); refresh(); }} aria-label="Remove"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-faint)] hover:text-[var(--status-error)] cursor-pointer border-none bg-transparent p-0 mt-1">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
