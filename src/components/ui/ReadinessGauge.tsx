/**
 * ReadinessGauge — the signature element, now animated.
 * The arc sweeps to its value on mount/change; the number counts up.
 */
import { motion, useSpring, useTransform, animate } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ReadinessGaugeProps {
  score: number | null;
  size?: number;
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

  const spring = useSpring(0, { stiffness: 60, damping: 16 });
  const dashOffset = useTransform(spring, (v) => circumference * (1 - v / 100));
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    spring.set(pct);
    const controls = animate(displayed, pct, {
      duration: 0.7, ease: 'easeOut',
      onUpdate: (v) => setDisplayed(Math.round(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  const arcColor = score === null ? 'var(--color-border-strong)' : colorFor(pct);

  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={score === null ? 'Not checked yet' : `Readiness ${pct} percent`}
      style={{ opacity: stale ? 0.5 : 1, transition: 'opacity var(--dur) var(--ease)' }}
    >
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
      {score !== null && (
        <motion.circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={arcColor} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset }}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      )}
      <text x={cx} y={cx - size * 0.03} textAnchor="middle"
        fontFamily="var(--font-ui)" fontSize={size * 0.24} fontWeight={600}
        fill="var(--color-text)">
        {score === null ? '—' : displayed}
      </text>
      {score !== null && (
        <text x={cx} y={cx + size * 0.16} textAnchor="middle"
          fontFamily="var(--font-ui)" fontSize={size * 0.1} fill="var(--color-faint)">
          percent
        </text>
      )}
    </svg>
  );
}
