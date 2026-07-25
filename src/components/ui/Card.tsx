import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/** Interactive card with lift-on-hover. The workhorse container. */
export function Card({ children, onClick, className = '' }: {
  children: ReactNode; onClick?: () => void; className?: string;
}) {
  const interactive = Boolean(onClick);
  return (
    <motion.div
      onClick={onClick}
      whileHover={interactive ? { y: -2 } : undefined}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={
        `bg-[var(--color-surface)] border border-[var(--color-border)] ` +
        `rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] ` +
        (interactive ? 'cursor-pointer hover:shadow-[var(--shadow-hover)] hover:border-[var(--color-border-strong)] ' : '') +
        className
      }
    >
      {children}
    </motion.div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`tx-skeleton ${className}`} aria-hidden="true" />;
}

export function EmptyState({ icon, title, hint, action }: {
  icon: ReactNode; title: string; hint?: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="text-[var(--color-faint)] mb-3">{icon}</div>
      <div className="font-medium text-[var(--color-text)] mb-1">{title}</div>
      {hint && <div className="text-[13px] text-[var(--color-muted)] max-w-[300px] mb-4">{hint}</div>}
      {action}
    </div>
  );
}
