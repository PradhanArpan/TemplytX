import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 font-semibold cursor-pointer ' +
  'rounded-[var(--radius)] transition-[color,background-color,border-color,box-shadow,transform] duration-150 select-none ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:translate-y-px';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-primary-solid)] text-white border border-[var(--color-primary-solid)] ' +
    'hover:bg-[var(--color-primary-solid-hover)] hover:border-[var(--color-primary-solid-hover)] ' +
    'shadow-[0_1px_2px_rgba(23,32,51,.14),0_5px_12px_rgba(31,95,168,.16)] hover:shadow-[0_2px_5px_rgba(23,32,51,.16),0_8px_18px_rgba(31,95,168,.2)]',
  secondary:
    'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border-strong)] ' +
    'hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-2)] hover:shadow-[var(--shadow-card)]',
  ghost:
    'bg-transparent text-[var(--color-accent)] border border-transparent ' +
    'hover:bg-[var(--color-accent-bg)]',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'text-[13px] min-h-8 px-3 py-1.5',
  md: 'text-[14px] min-h-10 px-4 py-2',
};

export function Button({ variant = 'secondary', size = 'md', children, className = '', ...rest }: ButtonProps) {
  return (
    <button {...rest} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  );
}

type Tone = 'ready' | 'partial' | 'error' | 'none' | 'accent';

const tones: Record<Tone, string> = {
  ready:   'text-[var(--status-ready)] bg-[var(--status-ready-bg)]',
  partial: 'text-[var(--status-partial)] bg-[var(--status-partial-bg)]',
  error:   'text-[var(--status-error)] bg-[var(--status-error-bg)]',
  none:    'text-[var(--color-muted)] bg-[var(--color-surface-2)]',
  accent:  'text-[var(--color-accent-text)] bg-[var(--color-accent-bg)]',
};

export function Badge({ tone = 'none', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.01em] px-2.5 py-1 rounded-full whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
}
