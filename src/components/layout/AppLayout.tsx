import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Moon, Sun, Command as CommandIcon, LogOut } from 'lucide-react';
import { getTheme, toggleTheme } from '../../lib/theme';
import { CommandPalette } from '../ui/CommandPalette';
import { useAuth } from '../../lib/auth';

export function AppLayout() {
  const [theme, setTheme] = useState(getTheme());

  return (
    <div className="tx-app-shell min-h-screen bg-[var(--color-bg)]">
      <header className="flex items-center justify-between px-3 sm:px-6 h-14 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] backdrop-blur-xl sticky top-0 z-40 shadow-[0_1px_0_rgba(23,32,51,.02)]">
        <Link to="/" className="flex items-center text-[var(--color-text)] no-underline rounded-[var(--radius)]">
          <img src="/logo.png" alt="TemplytX" className="h-12 w-auto object-contain" />
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="hidden sm:flex min-h-9 items-center gap-2 text-[12px] text-[var(--color-muted)] border border-[var(--color-border)] rounded-[var(--radius-pill)] pl-3 pr-2 py-1.5 cursor-pointer hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors bg-[var(--color-surface)] shadow-[var(--shadow-card)]"
            aria-label="Open command palette"
          >
            <CommandIcon size={12} /> <span>Search</span>
            <kbd className="ml-1 px-1.5 py-0.5 rounded-md bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[10px] font-medium">Ctrl K</kbd>
          </button>

          <button
            onClick={() => setTheme(toggleTheme())}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-[var(--radius)] text-[var(--color-muted)] cursor-pointer hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-colors border border-transparent bg-transparent"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <span className="tx-document italic text-[15px] text-[var(--color-muted)] hidden lg:inline ml-1 pl-3 border-l border-[var(--color-border)]">
            Just write.
          </span>
          <UserMenu />
        </div>
      </header>

      <main><Outlet /></main>
      <CommandPalette />
    </div>
  );
}

/** Shows the logged-in user's email + a logout button (only when configured). */
function UserMenu() {
  const { user, configured, signOut } = useAuth();
  if (!configured || !user) return null;
  return (
    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-[var(--color-border)]">
      <span className="text-[12px] text-[var(--color-muted)] hidden sm:inline max-w-[160px] truncate">
        {user.email}
      </span>
      <button onClick={() => signOut()} aria-label="Log out"
        className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-[var(--radius)] text-[var(--color-muted)] cursor-pointer hover:bg-[var(--color-surface-2)] hover:text-[var(--status-error)] transition-colors border border-transparent bg-transparent">
        <LogOut size={15} />
      </button>
    </div>
  );
}
