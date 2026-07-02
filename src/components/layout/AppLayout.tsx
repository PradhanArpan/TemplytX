import { Link, Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 var(--space-6)', height: 56,
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}>
        <Link to="/" style={{
          display: 'flex', alignItems: 'baseline', gap: 8,
          color: 'var(--color-text)', textDecoration: 'none',
        }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 18, letterSpacing: '-0.01em' }}>
            Templyt<span style={{ color: 'var(--color-accent)' }}>X</span>
          </span>
        </Link>
        <span style={{
          fontFamily: 'var(--font-document)', fontStyle: 'italic',
          fontSize: 15, color: 'var(--color-muted)',
        }}>
          Just write.
        </span>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
