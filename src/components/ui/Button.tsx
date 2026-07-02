import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const base: React.CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontSize: 'var(--text-base)',
  fontWeight: 500,
  padding: '8px 14px',
  borderRadius: 'var(--radius)',
  cursor: 'pointer',
  transition: 'background var(--dur) var(--ease), border-color var(--dur) var(--ease)',
  lineHeight: 1.2,
};

const variants: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--color-accent)',
    color: '#fff',
    border: '1px solid var(--color-accent)',
  },
  secondary: {
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border-strong)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-accent)',
    border: '1px solid transparent',
  },
};

export function Button({ variant = 'secondary', children, style, ...rest }: ButtonProps) {
  return (
    <button {...rest} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

type Tone = 'ready' | 'partial' | 'error' | 'none' | 'accent';

const tones: Record<Tone, { fg: string; bg: string }> = {
  ready:   { fg: 'var(--status-ready)',   bg: 'var(--status-ready-bg)' },
  partial: { fg: 'var(--status-partial)', bg: 'var(--status-partial-bg)' },
  error:   { fg: 'var(--status-error)',   bg: 'var(--status-error-bg)' },
  none:    { fg: 'var(--color-muted)',    bg: 'var(--color-surface-2)' },
  accent:  { fg: 'var(--color-accent-text)', bg: 'var(--color-accent-bg)' },
};

export function Badge({ tone = 'none', children }: { tone?: Tone; children: ReactNode }) {
  const t = tones[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', fontWeight: 500,
      color: t.fg, background: t.bg,
      padding: '3px 9px', borderRadius: 'var(--radius-pill)',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}
