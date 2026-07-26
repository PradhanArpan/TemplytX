import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { initTheme } from './lib/theme';
import { AuthProvider, useAuth } from './lib/auth';
import { AuthScreen } from './features/auth/AuthScreen';
import './styles/tokens.css';

initTheme();

/** Gate: if Supabase is configured and the user is logged out, show login.
 *  If Supabase isn't configured (no keys), run the app in mock mode as before. */
function Root() {
  const { user, loading, configured } = useAuth();
  if (configured && loading) {
    return <div style={{ padding: 40, color: 'var(--color-muted)' }}>Loading…</div>;
  }
  if (configured && !user) return <AuthScreen />;
  return <RouterProvider router={router} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>,
);
