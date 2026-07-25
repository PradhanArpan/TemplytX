/**
 * Theme management — light/dark with persistence.
 * Defaults to system preference; user toggle persists to localStorage.
 */
const KEY = 'templytx-theme';
export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
  const stored = localStorage.getItem(KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem(KEY, next);
  applyTheme(next);
  return next;
}

export function initTheme() { applyTheme(getTheme()); }
