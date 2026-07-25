/**
 * Command palette (Ctrl/⌘+K) — search documents, run actions, navigate.
 * The signature premium interaction: everything reachable from the keyboard.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, Plus, Moon, Sun, LayoutDashboard } from 'lucide-react';
import { listDocuments } from '../../services/documents';
import { toggleTheme, getTheme } from '../../lib/theme';
import type { TemplytXDocument } from '../../types/document';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<TemplytXDocument[]>([]);
  const [theme, setTheme] = useState(getTheme());
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => { if (open) listDocuments().then(setDocs); }, [open]);

  function run(fn: () => void) { fn(); setOpen(false); }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/30 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[560px] mx-4"
          >
            <Command
              label="Command palette"
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] overflow-hidden"
            >
              <Command.Input
                autoFocus placeholder="Search documents or type a command…"
                className="w-full px-4 py-3.5 text-[15px] bg-transparent outline-none border-b border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-faint)]"
              />
              <Command.List className="max-h-[320px] overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-[13px] text-[var(--color-faint)]">
                  No results.
                </Command.Empty>

                <Command.Group heading="Documents"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--color-faint)] [&_[cmdk-group-heading]]:font-semibold">
                  {docs.map((d) => (
                    <Command.Item key={d.id} value={d.title}
                      onSelect={() => run(() => navigate(`/doc/${d.id}`))}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius)] text-[14px] text-[var(--color-text)] cursor-pointer data-[selected=true]:bg-[var(--color-accent-bg)] data-[selected=true]:text-[var(--color-accent-text)]">
                      <FileText size={15} className="shrink-0 opacity-60" />
                      <span className="truncate tx-document">{d.title}</span>
                      <span className="ml-auto text-[12px] tabular-nums opacity-60">
                        {d.readinessScore === null ? '—' : `${d.readinessScore}%`}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Actions"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--color-faint)] [&_[cmdk-group-heading]]:font-semibold">
                  <Command.Item value="new document create"
                    onSelect={() => run(() => navigate('/?new=1'))}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius)] text-[14px] cursor-pointer data-[selected=true]:bg-[var(--color-accent-bg)] data-[selected=true]:text-[var(--color-accent-text)]">
                    <Plus size={15} className="shrink-0 opacity-60" /> New document
                  </Command.Item>
                  <Command.Item value="dashboard home"
                    onSelect={() => run(() => navigate('/'))}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius)] text-[14px] cursor-pointer data-[selected=true]:bg-[var(--color-accent-bg)] data-[selected=true]:text-[var(--color-accent-text)]">
                    <LayoutDashboard size={15} className="shrink-0 opacity-60" /> Go to dashboard
                  </Command.Item>
                  <Command.Item value="toggle theme dark light mode"
                    onSelect={() => run(() => setTheme(toggleTheme()))}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius)] text-[14px] cursor-pointer data-[selected=true]:bg-[var(--color-accent-bg)] data-[selected=true]:text-[var(--color-accent-text)]">
                    {theme === 'dark' ? <Sun size={15} className="shrink-0 opacity-60" /> : <Moon size={15} className="shrink-0 opacity-60" />}
                    Switch to {theme === 'dark' ? 'light' : 'dark'} mode
                  </Command.Item>
                </Command.Group>
              </Command.List>

              <div className="flex items-center gap-3 px-4 py-2 border-t border-[var(--color-border)] text-[11px] text-[var(--color-faint)]">
                <span><kbd className="px-1 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)]">↑↓</kbd> navigate</span>
                <span><kbd className="px-1 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)]">↵</kbd> open</span>
                <span><kbd className="px-1 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)]">esc</kbd> close</span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
