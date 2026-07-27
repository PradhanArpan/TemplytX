/**
 * Image input for figures/subfigures: upload from computer OR paste a URL.
 * Shows the image once set, with a control to replace it.
 */
import { useRef, useState } from 'react';
import { Upload, Link2, Loader2, X } from 'lucide-react';
import { uploadImage, validateImage, STORAGE_READY } from '../../../services/storage';

export function ImageInput({ src, onChange, height = 120 }: {
  src: string;
  onChange: (url: string) => void;
  height?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState('');

  async function onFile(f: File | null) {
    if (!f) return;
    const v = validateImage(f);
    if (v) { setErr(v); return; }
    setErr(''); setBusy(true);
    try {
      const publicUrl = await uploadImage(f);
      onChange(publicUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed.');
    } finally { setBusy(false); }
  }

  if (src) {
    return (
      <div style={{ position: 'relative', textAlign: 'center' }}>
        <img src={src} alt="" style={{ maxWidth: '100%', maxHeight: height * 2, objectFit: 'contain' }} />
        <button onClick={() => onChange('')} aria-label="Remove image"
          style={{ position: 'absolute', top: 4, right: 4, background: 'var(--color-surface)',
            border: '1px solid var(--color-border)', borderRadius: 6, cursor: 'pointer', padding: 2 }}>
          <X size={13} />
        </button>
      </div>
    );
  }

  const btn = 'flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer';

  return (
    <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 8, background: 'var(--color-surface-2)', padding: 10 }}>
      {urlMode ? (
        <div className="flex gap-1 w-full max-w-[280px]">
          <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…/image.png"
            onKeyDown={(e) => { if (e.key === 'Enter' && url.trim()) onChange(url.trim()); }}
            className="flex-1 text-[12px] px-2 py-1 border border-[var(--color-border-strong)] rounded bg-[var(--color-surface)] outline-none" />
          <button className={btn} onClick={() => url.trim() && onChange(url.trim())}>Add</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button className={btn} onClick={() => fileRef.current?.click()} disabled={busy || !STORAGE_READY}>
            {busy ? <><Loader2 size={13} className="animate-spin" /> Uploading…</> : <><Upload size={13} /> Upload</>}
          </button>
          <button className={btn} onClick={() => setUrlMode(true)}><Link2 size={13} /> Paste URL</button>
        </div>
      )}
      {!STORAGE_READY && <span className="text-[10.5px] text-[var(--color-faint)]">Uploads need Supabase Storage; URL still works.</span>}
      {err && <span className="text-[10.5px] text-[var(--status-error)]">{err}</span>}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
    </div>
  );
}
