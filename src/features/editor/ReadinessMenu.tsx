/**
 * Title-bar "Readiness" dropdown — a compact score badge that opens a
 * popover with the full gauge, re-check button, and issue list. Content is
 * unchanged from the old right-sidebar panel; just relocated + collapsible.
 */
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, CircleCheck, Crosshair } from 'lucide-react';
import { Button, Badge } from '../../components/ui/Button';
import { ReadinessGauge } from '../../components/ui/ReadinessGauge';
import type { ComplianceReport, Template } from '../../types/compliance';
import { useClickOutside } from './useClickOutside';

export function ReadinessMenu({ score, stale, tpl, report, onCheck, onGoToBlock }: {
  score: number | null;
  stale: boolean;
  tpl: Template | null;
  report: ComplianceReport | null;
  onCheck: () => void;
  onGoToBlock: (blockId?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  useClickOutside(open, [trigger, menuRef], () => setOpen(false));

  function toggle() {
    setOpen((v) => {
      const next = !v;
      if (next && trigger.current) {
        const r = trigger.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
      }
      return next;
    });
  }

  return (
    <div className="relative">
      <button ref={trigger} type="button" onClick={toggle}
        aria-haspopup="menu" aria-expanded={open} aria-controls="editor-readiness-menu"
        className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] cursor-pointer hover:border-[var(--color-border-strong)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]">
        <ReadinessGauge score={score} size={26} stale={stale && score !== null} />
        <span className="text-[11px] font-medium text-[var(--color-muted)]">Readiness</span>
      </button>

      {open && pos && createPortal(
        <div ref={menuRef} id="editor-readiness-menu" role="menu"
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 1000 }}
          className="w-[300px] max-h-[70vh] overflow-y-auto p-4 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)]">
          <div className="flex flex-col items-center gap-3">
            <ReadinessGauge score={score} stale={stale && score !== null} />
            <AnimatePresence>
              {stale && score !== null && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Badge tone="partial">Edited since last check</Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button variant="primary" className="w-full mt-4" onClick={onCheck} disabled={!tpl}>
            {score === null ? 'Check compliance' : 'Re-check'}
          </Button>
          {!tpl && <div className="text-[12px] text-[var(--color-faint)] mt-2">Choose a template on the dashboard to enable checks.</div>}

          <AnimatePresence>
            {report && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mt-5 mb-2 text-[13px] text-[var(--color-muted)] flex items-center gap-1.5">
                  {report.issues.length === 0
                    ? <><CircleCheck size={14} className="text-[var(--status-ready)]" /> No issues — ready to submit</>
                    : `${report.issues.length} issue${report.issues.length === 1 ? '' : 's'}`}
                </div>
                <motion.div className="flex flex-col gap-2" initial="hidden" animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
                  {report.issues.map((issue) => (
                    <motion.div key={issue.id} variants={{ hidden: { opacity: 0, x: 8 }, show: { opacity: 1, x: 0 } }}
                      transition={{ duration: 0.2 }}
                      className="border border-[var(--color-border)] rounded-[var(--radius)] p-2.5 flex gap-2 items-start justify-between bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
                      <div className="flex gap-2 items-start min-w-0">
                        <CircleAlert size={14} className="shrink-0 mt-0.5"
                          style={{ color: issue.severity === 'error' ? 'var(--status-error)' : 'var(--status-partial)' }} />
                        <span className="text-[12px] text-[var(--color-text)] leading-snug">{issue.message}</span>
                      </div>
                      {issue.targetBlockId && (
                        <button onClick={() => { onGoToBlock(issue.targetBlockId); setOpen(false); }}
                          className="shrink-0 flex items-center gap-1 text-[12px] text-[var(--color-accent)] cursor-pointer border border-[var(--color-accent-bg)] rounded-md px-2 py-0.5 bg-transparent hover:bg-[var(--color-accent-bg)] transition-colors">
                          <Crosshair size={11} /> Go
                        </button>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </div>
  );
}
