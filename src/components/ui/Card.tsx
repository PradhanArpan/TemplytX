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
        `bg-[var(--color-surface-raised)] border border-[var(--color-border)] ` +
        `rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] ` +
        (interactive ? 'cursor-pointer hover:shadow-[var(--shadow-hover)] hover:border-[color-mix(in_srgb,var(--color-accent)_32%,var(--color-border))] ' : '') +
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
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-[var(--color-border-strong)] rounded-[var(--radius-lg)] bg-[color-mix(in_srgb,var(--color-surface)_84%,transparent)]">
      <div className="w-14 h-14 rounded-2xl inline-flex items-center justify-center text-[var(--color-accent)] bg-[var(--color-accent-bg)] mb-4">{icon}</div>
      <div className="font-semibold text-[16px] text-[var(--color-text)] mb-1.5">{title}</div>
      {hint && <div className="text-[13px] text-[var(--color-muted)] leading-relaxed max-w-[340px] mb-5">{hint}</div>}
      {action}
    </div>
  );
}
