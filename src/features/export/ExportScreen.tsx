import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDocument } from '../../services/documents';
import type { TemplytXDocument } from '../../types/document';
import { Button, Badge } from '../../components/ui/Button';
import { ReadinessGauge } from '../../components/ui/ReadinessGauge';

const formats = [
  { id: 'pdf', label: 'PDF', hint: 'Publication-ready' },
  { id: 'docx', label: 'Word (.docx)', hint: 'Editable source' },
  { id: 'latex', label: 'LaTeX source (.zip)', hint: 'For Overleaf' },
];

export function ExportScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<TemplytXDocument | null>(null);
  const [fmt, setFmt] = useState('pdf');

  useEffect(() => { if (id) getDocument(id).then(setDoc); }, [id]);
  if (!doc) return <div style={{ padding: 'var(--space-10)', color: 'var(--color-muted)' }}>Loading…</div>;

  const ready = doc.readinessScore === 100;

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', padding: 'var(--space-10) var(--space-6)' }}>
      <button onClick={() => navigate(`/doc/${id}`)}
        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-5)', padding: 0 }}>
        ← Back to editor
      </button>

      <h1 style={{ fontSize: 'var(--text-2xl)', letterSpacing: '-0.02em', marginBottom: 'var(--space-2)' }}>Export</h1>
      <p className="tx-document" style={{ color: 'var(--color-muted)', fontSize: 'var(--text-md)', margin: '0 0 var(--space-6)' }}>{doc.title}</p>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)', background: 'var(--color-surface)', marginBottom: 'var(--space-6)',
      }}>
        <ReadinessGauge score={doc.readinessScore} size={64} />
        <div>
          <div style={{ fontWeight: 500, marginBottom: 3 }}>
            {ready ? 'Ready to submit' : doc.readinessScore === null ? 'Not checked yet' : 'Issues remain'}
          </div>
          <Badge tone={ready ? 'ready' : doc.readinessScore === null ? 'none' : 'partial'}>
            {doc.readinessScore === null ? 'Run a compliance check first' : `${doc.readinessScore}% compliant`}
          </Badge>
        </div>
      </div>

      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Format</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        {formats.map((f) => (
          <label key={f.id} style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
            border: `1px solid ${fmt === f.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius)', padding: 'var(--space-3) var(--space-4)',
            cursor: 'pointer', background: fmt === f.id ? 'var(--color-accent-bg)' : 'var(--color-surface)',
            transition: 'border-color var(--dur) var(--ease)',
          }}>
            <input type="radio" name="fmt" checked={fmt === f.id} onChange={() => setFmt(f.id)} />
            <div>
              <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{f.label}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>{f.hint}</div>
            </div>
          </label>
        ))}
      </div>

      {!ready && (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--status-partial)', background: 'var(--status-partial-bg)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-4)' }}>
          This document isn't fully compliant yet. You can export anyway, but it may be desk-rejected.
        </div>
      )}

      <Button variant="primary" style={{ width: '100%' }} onClick={() => {}}>
        Generate &amp; download
      </Button>
    </div>
  );
}
