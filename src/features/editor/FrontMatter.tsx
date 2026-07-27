/**
 * Front-matter editor: document title + structured authors (name,
 * affiliation, corresponding). Added via "+". This is metadata, not body
 * content — it's included or anonymized at export time per journal rules.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Star, ChevronUp, ChevronDown } from 'lucide-react';
import type { Author } from '../../types/document';

export function FrontMatter({ title, authors, onTitle, onAuthors }: {
  title: string;
  authors: Author[];
  onTitle: (t: string) => void;
  onAuthors: (a: Author[]) => void;
}) {
  function addAuthor() {
    onAuthors([...authors, {
      id: `au-${crypto.randomUUID()}`, name: '', affiliation: '',
      isCorresponding: authors.length === 0, // first author corresponding by default
    }]);
  }
  function patch(id: string, p: Partial<Author>) {
    onAuthors(authors.map((a) => (a.id === id ? { ...a, ...p } : a)));
  }
  function remove(id: string) { onAuthors(authors.filter((a) => a.id !== id)); }
  function move(id: string, dir: -1 | 1) {
    const i = authors.findIndex((a) => a.id === id);
    const j = i + dir;
    if (i === -1 || j < 0 || j >= authors.length) return;
    const next = [...authors];
    [next[i], next[j]] = [next[j], next[i]];
    onAuthors(next);
  }
  function setCorresponding(id: string) {
    onAuthors(authors.map((a) => ({ ...a, isCorresponding: a.id === id })));
  }

  return (
    <div className="mb-8 pb-6 border-b border-[var(--color-border)]">
      <input value={title} onChange={(e) => onTitle(e.target.value)}
        placeholder="Document title"
        className="tx-document w-full text-[26px] font-semibold bg-transparent border-none outline-none text-[var(--color-text)] mb-4 placeholder:text-[var(--color-faint)]" />

      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {authors.map((a) => (
            <motion.div key={a.id}
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 group">
              <button onClick={() => setCorresponding(a.id)} title="Mark corresponding author"
                aria-label="Mark corresponding author"
                className="p-1 rounded cursor-pointer border-none bg-transparent shrink-0"
                style={{ color: a.isCorresponding ? 'var(--color-accent)' : 'var(--color-faint)' }}>
                <Star size={14} fill={a.isCorresponding ? 'var(--color-accent)' : 'none'} />
              </button>
              <input value={a.name} onChange={(e) => patch(a.id, { name: e.target.value })}
                placeholder="Author name"
                className="flex-1 min-w-0 text-[14px] px-2 py-1.5 border border-[var(--color-border)] rounded-[var(--radius)] bg-[var(--color-surface)] outline-none focus:border-[var(--color-accent)]" />
              <input value={a.affiliation} onChange={(e) => patch(a.id, { affiliation: e.target.value })}
                placeholder="Affiliation"
                className="flex-1 min-w-0 text-[13px] px-2 py-1.5 border border-[var(--color-border)] rounded-[var(--radius)] bg-[var(--color-surface)] outline-none focus:border-[var(--color-accent)] text-[var(--color-muted)]" />
              <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => move(a.id, -1)} aria-label="Move author up"
                  className="p-0 text-[var(--color-faint)] hover:text-[var(--color-accent)] cursor-pointer border-none bg-transparent leading-none">
                  <ChevronUp size={13} />
                </button>
                <button onClick={() => move(a.id, 1)} aria-label="Move author down"
                  className="p-0 text-[var(--color-faint)] hover:text-[var(--color-accent)] cursor-pointer border-none bg-transparent leading-none">
                  <ChevronDown size={13} />
                </button>
              </div>
              <button onClick={() => remove(a.id)} aria-label="Remove author"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[var(--color-faint)] hover:text-[var(--status-error)] cursor-pointer border-none bg-transparent shrink-0">
                <Trash2 size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        <button onClick={addAuthor}
          className="self-start flex items-center gap-1.5 text-[12px] text-[var(--color-muted)] cursor-pointer border border-[var(--color-border)] rounded-[var(--radius)] px-2.5 py-1 bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors mt-1">
          <Plus size={13} /> Add author
        </button>
      </div>
      {authors.some((a) => a.isCorresponding) && (
        <div className="text-[11px] text-[var(--color-faint)] mt-2 flex items-center gap-1">
          <Star size={10} fill="var(--color-accent)" style={{ color: 'var(--color-accent)' }} /> corresponding author
        </div>
      )}
    </div>
  );
}
