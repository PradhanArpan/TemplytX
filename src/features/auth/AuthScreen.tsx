/**
 * Login / signup screen. Email + password via Supabase Auth. Shown when the
 * user is logged out and Supabase is configured.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../lib/auth';
import { Button } from '../../components/ui/Button';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(''); setBusy(true);
    try {
      if (mode === 'in') await signIn(email, password);
      else await signUp(email, password, name);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    } finally { setBusy(false); }
  }

  const inputCls =
    'w-full text-[14px] px-3 py-2.5 border border-[var(--color-border-strong)] rounded-[var(--radius)] ' +
    'bg-[var(--color-surface)] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] mb-3';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }} className="w-full max-w-[380px]">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="TemplytX" className="h-24 w-auto object-contain mx-auto mb-2" />
          <div className="tx-document italic text-[15px] text-[var(--color-muted)] mt-1">Just write.</div>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] p-6">
          <div className="flex gap-1 mb-5 p-1 bg-[var(--color-surface-2)] rounded-[var(--radius)]">
            {(['in', 'up'] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setErr(''); }}
                className={`flex-1 text-[13px] py-1.5 rounded-[6px] cursor-pointer border-none transition-colors ${mode === m ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm font-medium' : 'bg-transparent text-[var(--color-muted)]'}`}>
                {m === 'in' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          {mode === 'up' && (
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Full name" className={inputCls} />
          )}
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
            placeholder="Email" className={inputCls} autoComplete="email" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password"
            placeholder="Password" className={inputCls} autoComplete="current-password"
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />

          {err && <div className="text-[12px] text-[var(--status-error)] mb-3">{err}</div>}

          <Button variant="primary" className="w-full" onClick={submit} disabled={busy || !email || !password}>
            {busy ? 'Please wait…' : mode === 'in' ? 'Log in' : 'Create account'}
          </Button>
        </div>

        <p className="text-center text-[12px] text-[var(--color-faint)] mt-4">
          Your documents are private to your account.
        </p>
      </motion.div>
    </div>
  );
}
