/**
 * ReadinessGauge — the product's signature element.
 *
 * A precision-instrument dial showing how submission-ready a document is.
 * Color shifts with the score: amber/red when work remains, teal-green at
 * ready. The one deliberately bold element in the whole UI.
 */

interface ReadinessGaugeProps {
  /** 0–100, or null when never checked. */
  score: number | null;
  size?: number;
  /** Marks the score visually as outdated after edits. */
  stale?: boolean;
}

function colorFor(score: number): string {
  if (score >= 100) return 'var(--status-ready)';
  if (score >= 70) return 'var(--status-partial)';
  return 'var(--status-error)';
}

export function ReadinessGauge({ score, size = 112, stale = false }: ReadinessGaugeProps) {
  const stroke = Math.round(size * 0.08);
  const r = (size - stroke * 2) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = score ?? 0;
  const offset = circumference * (1 - pct / 100);
  const arcColor = score === null ? 'var(--color-border-strong)' : colorFor(score);

  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={score === null ? 'Not checked yet' : `Readiness ${pct} percent`}
      style={{ opacity: stale ? 0.5 : 1, transition: 'opacity var(--dur) var(--ease)' }}
    >
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke="var(--color-border)" strokeWidth={stroke} />
      {score !== null && (
        <circle cx={cx} cy={cx} r={r} fill="none"
          stroke={arcColor} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: 'stroke-dashoffset 400ms var(--ease), stroke var(--dur) var(--ease)' }} />
      )}
      <text x={cx} y={cx - size * 0.03} textAnchor="middle"
        fontFamily="var(--font-ui)" fontSize={size * 0.24} fontWeight={600}
        fill="var(--color-text)">
        {score === null ? '—' : pct}
      </text>
      {score !== null && (
        <text x={cx} y={cx + size * 0.16} textAnchor="middle"
          fontFamily="var(--font-ui)" fontSize={size * 0.1}
          fill="var(--color-faint)">
          percent
        </text>
      )}
    </svg>
  );
}
