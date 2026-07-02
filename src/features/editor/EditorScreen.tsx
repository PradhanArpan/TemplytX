import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDocument, listTemplates } from '../../services/documents';
import type { TemplytXDocument } from '../../types/document';
import type { Template } from '../../types/compliance';
import { Button, Badge } from '../../components/ui/Button';
import { ReadinessGauge } from '../../components/ui/ReadinessGauge';

const paneLabel: React.CSSProperties = {
  fontSize: 'var(--text-xs)', letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'var(--color-faint)', fontWeight: 600, marginBottom: 'var(--space-3)',
};

export function EditorScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<TemplytXDocument | null>(null);
  const [tpl, setTpl] = useState<Template | null>(null);

  useEffect(() => {
    if (!id) return;
    getDocument(id).then((d) => {
      setDoc(d);
      if (d?.targetTemplateId) listTemplates().then((ts) =>
        setTpl(ts.find((t) => t.id === d.targetTemplateId) ?? null));
    });
  }, [id]);

  if (!doc) return <div style={{ padding: 'var(--space-10)', color: 'var(--color-muted)' }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      {/* editor toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 var(--space-6)', height: 52, borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
          <button onClick={() => navigate('/')} aria-label="Back to documents"
            style={{ border: 'none', background: 'none', cursor: 'pointer',
              color: 'var(--color-muted)', fontSize: 18, padding: 4 }}>←</button>
          <span className="tx-document" style={{
            fontSize: 'var(--text-lg)', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{doc.title}</span>
          {tpl && <Badge tone="accent">{tpl.name}</Badge>}
        </div>
        <Button variant="secondary" onClick={() => navigate(`/doc/${id}/export`)}>Export</Button>
      </div>

      {/* three panes */}
      <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr 268px', flex: 1, minHeight: 0 }}>
        {/* outline */}
        <aside style={{ borderRight: '1px solid var(--color-border)', padding: 'var(--space-5) var(--space-4)', overflowY: 'auto' }}>
          <div style={paneLabel}>Outline</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {['Abstract', '1  Introduction', '2  Methods', '3  Results', '4  Conclusion', 'References'].map((s, i) => (
              <div key={s} style={{
                padding: '6px 9px', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                background: i === 1 ? 'var(--color-accent-bg)' : 'transparent',
                color: i === 1 ? 'var(--color-accent-text)' : 'var(--color-muted)',
                fontWeight: i === 1 ? 500 : 400,
              }}>{s}</div>
            ))}
          </div>
        </aside>

        {/* content */}
        <section style={{ overflowY: 'auto', padding: 'var(--space-8) var(--space-10)', background: 'var(--color-bg)' }}>
          <div className="tx-document" style={{ maxWidth: 640, margin: '0 auto', color: 'var(--color-text)', lineHeight: 1.7 }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 6 }}>Abstract</h2>
            <p style={{ margin: '0 0 var(--space-5)', color: 'var(--color-muted)' }}>
              We present a thermal model of additively manufactured heat sinks, evaluating
              conduction pathways across three lattice geometries under steady-state load…
            </p>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 6 }}>1&nbsp;&nbsp;Introduction</h2>
            <p style={{ margin: '0 0 var(--space-5)', color: 'var(--color-muted)' }}>
              Recent work <span style={{ color: 'var(--color-accent)' }}>[3]</span> has shown
              that gyroid lattices outperform conventional fin arrays in constrained volumes…
            </p>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)',
              border: '1px dashed var(--color-border-strong)', borderRadius: 'var(--radius)',
              padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', color: 'var(--color-text)', background: 'var(--color-surface)',
            }}>
              <span>q = −k ∇T</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-faint)' }}>Eq. 1</span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-5)', fontFamily: 'var(--font-ui)' }}>
              {['+ Text', 'Equation', 'Figure', 'Table'].map((b) => (
                <span key={b} style={{
                  fontSize: 'var(--text-xs)', color: 'var(--color-muted)',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                  padding: '5px 11px', cursor: 'pointer',
                }}>{b}</span>
              ))}
            </div>
          </div>
        </section>

        {/* readiness */}
        <aside style={{ borderLeft: '1px solid var(--color-border)', padding: 'var(--space-5) var(--space-4)', background: 'var(--color-surface)', overflowY: 'auto' }}>
          <div style={paneLabel}>Readiness</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
            <ReadinessGauge score={doc.readinessScore} stale={doc.status === 'checked'} />
            {doc.status === 'checked' && <Badge tone="partial">⚠ Edited since last check</Badge>}
          </div>
          <Button variant="primary" style={{ width: '100%', marginTop: 'var(--space-4)' }}
            onClick={() => {}}>
            Check compliance
          </Button>

          <div style={{ marginTop: 'var(--space-5)', fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginBottom: 'var(--space-2)' }}>3 issues</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[
              { tone: 'partial' as const, msg: 'Abstract exceeds 250 words (268)', action: null },
              { tone: 'error' as const, msg: 'Reference 12 is missing a DOI', action: 'Fix' },
              { tone: 'error' as const, msg: 'Figure 3 is not cited in the text', action: 'Go' },
            ].map((issue, i) => (
              <div key={i} style={{
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                padding: '9px 10px', display: 'flex', gap: 8, alignItems: 'flex-start',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                  <span style={{ color: issue.tone === 'error' ? 'var(--status-error)' : 'var(--status-partial)', fontSize: 14, lineHeight: 1.3 }}>●</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)', lineHeight: 1.4 }}>{issue.msg}</span>
                </div>
                {issue.action && (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', border: '1px solid var(--color-accent-bg)', borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }}>{issue.action}</span>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
