import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listDocuments, createDocument, listTemplates } from '../../services/documents';
import type { TemplytXDocument } from '../../types/document';
import type { Template } from '../../types/compliance';
import { Button, Badge } from '../../components/ui/Button';

function statusTone(status: string): 'ready' | 'partial' | 'none' {
  return status === 'ready' ? 'ready' : status === 'checked' ? 'partial' : 'none';
}
function statusLabel(d: TemplytXDocument): string {
  if (d.status === 'ready') return 'Ready to submit';
  if (d.status === 'checked') return 'Issues remain';
  return 'Not checked';
}

export function DashboardScreen() {
  const [docs, setDocs] = useState<TemplytXDocument[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [templateId, setTemplateId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    listDocuments().then(setDocs);
    listTemplates().then((t) => { setTemplates(t); setTemplateId(t[0]?.id ?? ''); });
  }, []);

  async function handleCreate() {
    const doc = await createDocument({ title: title.trim(), targetTemplateId: templateId || null });
    navigate(`/doc/${doc.id}`);
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--font-ui)', fontSize: 'var(--text-base)',
    padding: '9px 11px', border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius)', background: 'var(--color-surface)',
    color: 'var(--color-text)',
  };

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: 'var(--space-10) var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', letterSpacing: '-0.02em' }}>Your documents</h1>
          <p style={{ color: 'var(--color-muted)', margin: '6px 0 0', fontSize: 'var(--text-md)' }}>
            {docs.length} document{docs.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button variant={creating ? 'secondary' : 'primary'} onClick={() => setCreating((v) => !v)}>
          {creating ? 'Cancel' : '+ New document'}
        </Button>
      </div>

      {creating && (
        <div style={{
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)', marginBottom: 'var(--space-6)',
          background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)',
          display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap',
        }}>
          <input autoFocus placeholder="Document title" value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            style={{ ...inputStyle, flex: 1, minWidth: 220 }} />
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} style={inputStyle}>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <Button variant="primary" onClick={handleCreate}>Create</Button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {docs.map((d) => {
          const tpl = templates.find((t) => t.id === d.targetTemplateId);
          return (
            <button key={d.id} onClick={() => navigate(`/doc/${d.id}`)}
              style={{
                textAlign: 'left', cursor: 'pointer', width: '100%',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4) var(--space-5)', background: 'var(--color-surface)',
                boxShadow: 'var(--shadow-card)', transition: 'border-color var(--dur) var(--ease)',
                display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tx-document" style={{
                  fontSize: 'var(--text-lg)', fontWeight: 500, color: 'var(--color-text)',
                  marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {d.title}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                  <Badge tone="accent">{tpl?.name ?? 'No template'}</Badge>
                  <Badge tone={statusTone(d.status)}>{statusLabel(d)}</Badge>
                </div>
              </div>
              <div style={{
                fontVariantNumeric: 'tabular-nums', fontSize: 'var(--text-xl)', fontWeight: 600,
                color: d.readinessScore === null ? 'var(--color-faint)'
                  : d.status === 'ready' ? 'var(--status-ready)' : 'var(--status-partial)',
                minWidth: 52, textAlign: 'right',
              }}>
                {d.readinessScore === null ? '—' : `${d.readinessScore}%`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
