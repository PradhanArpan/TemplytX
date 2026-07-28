import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-1.5 font-medium cursor-pointer ' +
  'rounded-[var(--radius)] transition-all duration-150 select-none ' +
  'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-primary-solid)] text-white border border-[var(--color-primary-solid)] ' +
    'hover:bg-[var(--color-primary-solid-hover)] hover:border-[var(--color-primary-solid-hover)] ' +
    'shadow-[var(--shadow-card)]',
  secondary:
    'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border-strong)] ' +
    'hover:border-[var(--color-faint)] hover:shadow-[var(--shadow-card)]',
  ghost:
    'bg-transparent text-[var(--color-accent)] border border-transparent ' +
    'hover:bg-[var(--color-accent-bg)]',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'text-[13px] px-2.5 py-1.5',
  md: 'text-[14px] px-3.5 py-2',
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
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-[3px] rounded-full whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
}
