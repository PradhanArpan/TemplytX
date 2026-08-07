/**
 * Right panel — LABELS (account-wide reference taxonomy).
 * Create labels; select one or more to see every reference in your account
 * carrying them; pull any into the current document. Labels persist across
 * all documents. This is the "finder"; the left panel is this doc's set.
 */
import { useCallback, useEffect, useState } from 'react';
import { Plus, Tag, ArrowLeftCircle } from 'lucide-react';
import {
  listLabels, createLabel, referencesByLabels, addReferenceToDocument,
  type Label,
} from '../../services/references';
import type { Reference } from '../../types/document';

export function LabelsPanel({ documentId, onPulled }: {
  documentId: string;
  onPulled: () => void; // tell the left panel to refresh
}) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [matches, setMatches] = useState<Reference[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');

  const loadLabels = useCallback(() => { listLabels().then(setLabels); }, []);
  useEffect(() => { loadLabels(); }, [loadLabels]);

  useEffect(() => {
    const ids = [...selected];
    if (ids.length === 0) { setMatches([]); return; }
    referencesByLabels(ids).then(setMatches);
  }, [selected]);

  function toggleSel(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function addLabel() {
    if (!name.trim()) return;
    try {
      await createLabel(name.trim());
      setName(''); setAdding(false); loadLabels();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create label.');
    }
  }

  async function pull(ref: Reference) {
    await addReferenceToDocument(documentId, ref.id);
    onPulled();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] tracking-[0.06em] uppercase text-[var(--color-faint)] font-semibold">Labels</span>
        <button onClick={() => setAdding((v) => !v)} aria-label="New label"
          className="p-1 rounded text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] cursor-pointer border-none bg-transparent">
          <Plus size={14} />
        </button>
      </div>

      {adding && (
        <div className="flex gap-1 mb-2">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addLabel(); }}
            placeholder="Label name (e.g. NRW)"
            className="flex-1 text-[12px] px-2 py-1 border border-[var(--color-border-strong)] rounded-[var(--radius)] bg-[var(--color-surface)] outline-none focus:border-[var(--color-accent)]" />
          <button onClick={addLabel} className="text-[11px] px-2 rounded-[var(--radius)] bg-[var(--color-primary-solid)] text-white border-none cursor-pointer">Add</button>
        </div>
      )}
      {err && <div className="text-[11px] text-[var(--status-error)] mb-2">{err}</div>}

      {labels.length === 0 ? (
        <div className="flex flex-col items-center text-center py-3 text-[var(--color-faint)]">
          <Tag size={16} strokeWidth={1.5} />
          <span className="text-[11px] mt-1">No labels yet</span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1 mb-3">
          {labels.map((l) => {
            const on = selected.has(l.id);
            return (
              <button key={l.id} onClick={() => toggleSel(l.id)}
                className={`text-[11px] px-2 py-0.5 rounded-full cursor-pointer border transition-colors ${
                  on ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)]'
                     : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]'}`}>
                {l.name}
              </button>
            );
          })}
        </div>
      )}

      {/* References carrying the selected labels — pull into the document. */}
      {selected.size > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-[10.5px] text-[var(--color-faint)] mb-0.5">
            {matches.length} reference{matches.length === 1 ? '' : 's'} · click ← to add to document
          </div>
          {matches.map((r) => (
            <button key={r.id} onClick={() => pull(r)} title="Add to this document"
              className="group flex items-start gap-1.5 text-left border border-[var(--color-border)] rounded-[var(--radius)] px-2 py-1.5 hover:border-[var(--color-accent)] cursor-pointer bg-transparent">
              <ArrowLeftCircle size={13} className="shrink-0 mt-0.5 text-[var(--color-faint)] group-hover:text-[var(--color-accent)]" />
              <span className="min-w-0">
                <span className="block text-[11.5px] font-medium text-[var(--color-text)] leading-tight truncate">{r.title}</span>
                <span className="block text-[10.5px] text-[var(--color-muted)] truncate">
                  {r.authors[0]?.split(',')[0] ?? 'Unknown'} · {r.year ?? 'n.d.'}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
