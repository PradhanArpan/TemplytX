import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Moon, Sun, Command as CommandIcon, LogOut } from 'lucide-react';
import { getTheme, toggleTheme } from '../../lib/theme';
import { CommandPalette } from '../ui/CommandPalette';
import { useAuth } from '../../lib/auth';

export function AppLayout() {
  const [theme, setTheme] = useState(getTheme());

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="flex items-center justify-between px-6 h-14 border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-40">
        <Link to="/" className="flex items-center text-[var(--color-text)] no-underline">
          <img src="/logo.png" alt="TemplytX" className="h-12 w-auto object-contain" />
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="hidden sm:flex items-center gap-1.5 text-[12px] text-[var(--color-faint)] border border-[var(--color-border)] rounded-[var(--radius)] px-2.5 py-1.5 cursor-pointer hover:border-[var(--color-border-strong)] hover:text-[var(--color-muted)] transition-colors bg-transparent"
            aria-label="Open command palette"
          >
            <CommandIcon size={12} /> <span>Search</span>
            <kbd className="ml-1 px-1 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[10px]">Ctrl K</kbd>
          </button>

          <button
            onClick={() => setTheme(toggleTheme())}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="p-2 rounded-[var(--radius)] text-[var(--color-muted)] cursor-pointer hover:bg-[var(--color-surface-2)] transition-colors border-none bg-transparent"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <span className="tx-document italic text-[15px] text-[var(--color-muted)] hidden md:inline ml-2">
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
        className="p-2 rounded-[var(--radius)] text-[var(--color-muted)] cursor-pointer hover:bg-[var(--color-surface-2)] hover:text-[var(--status-error)] transition-colors border-none bg-transparent">
        <LogOut size={15} />
      </button>
    </div>
  );
}
