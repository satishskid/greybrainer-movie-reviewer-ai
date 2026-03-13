import React, { useEffect, useState } from 'react';
import { listDrafts, updateDraftRecord, publishDraftToWebsite } from '../services/omnichannelDraftService';
import type { DraftRecord } from '../services/omnichannelDraftService';

type StatusFilter = 'all' | 'generated' | 'approved' | 'published';

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    generated: '#eab308',
    approved: '#3b82f6',
    published: '#22c55e',
    draft: '#6b7280',
  };
  const bg = colors[status] ?? '#6b7280';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase' as const,
        background: `${bg}22`,
        color: bg,
        border: `1px solid ${bg}44`,
      }}
    >
      {status}
    </span>
  );
}

function contentTypeBadge(subjectType: string) {
  const label =
    subjectType === 'daily-brief'
      ? 'Brief'
      : subjectType === 'research'
        ? 'Research'
        : 'Review';
  const color =
    subjectType === 'daily-brief'
      ? '#d4a017'
      : subjectType === 'research'
        ? '#3b82f6'
        : '#ef4444';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase' as const,
        background: `${color}18`,
        color,
        border: `1px solid ${color}33`,
        marginLeft: 6,
      }}
    >
      {label}
    </span>
  );
}

function formatDate(raw: string | null) {
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return raw;
  }
}

export const DraftsListApp: React.FC = () => {
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listDrafts(100);
      setDrafts(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drafts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = filter === 'all' ? drafts : drafts.filter((d) => d.status === filter);

  const handleApproveAndPublish = async (draft: DraftRecord) => {
    setBusyId(draft.id);
    setMessage(null);
    setError(null);
    try {
      // Auto-approve if needed
      if (draft.status !== 'approved' && draft.status !== 'published') {
        await updateDraftRecord(draft.id, { status: 'approved' });
      }
      // Publish to website
      const result = await publishDraftToWebsite(draft.id, {
        requestedBy: 'editor:studio',
        versionId: draft.currentVersionId,
      });
      setMessage(`✅ Published: ${result.canonicalUrl}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed.');
    } finally {
      setBusyId(null);
    }
  };

  const counts = {
    all: drafts.length,
    generated: drafts.filter((d) => d.status === 'generated').length,
    approved: drafts.filter((d) => d.status === 'approved').length,
    published: drafts.filter((d) => d.status === 'published').length,
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'Manrope, system-ui, sans-serif' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: '#f5f5f5' }}>
          GreyBrainer Studio
        </h1>
        <p style={{ color: '#a0a0a0', fontSize: '0.85rem', margin: '0.4rem 0 0' }}>
          Content pipeline — review AI output, add images, and publish to Lens.
        </p>
      </header>

      {message && (
        <div style={{ padding: '0.75rem 1rem', background: '#22c55e18', border: '1px solid #22c55e44', borderRadius: 8, marginBottom: '1rem', color: '#22c55e', fontSize: '0.85rem' }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#ef444418', border: '1px solid #ef444444', borderRadius: 8, marginBottom: '1rem', color: '#ef4444', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(['all', 'generated', 'approved', 'published'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: filter === f ? '1px solid #c1432e' : '1px solid #333',
              background: filter === f ? '#c1432e22' : 'transparent',
              color: filter === f ? '#e8886d' : '#999',
              fontSize: '0.78rem',
              fontWeight: 600,
              textTransform: 'capitalize',
              cursor: 'pointer',
            }}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#888' }}>Loading drafts…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#888' }}>No drafts found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((draft) => (
            <div
              key={draft.id}
              style={{
                background: '#111',
                border: '1px solid #222',
                borderRadius: 10,
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              {/* Content info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {statusBadge(draft.status)}
                  {contentTypeBadge(draft.subjectType)}
                </div>
                <a
                  href={`/studio/drafts/${draft.id}`}
                  style={{ color: '#f5f5f5', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.3 }}
                >
                  {draft.subjectTitle}
                </a>
                <div style={{ color: '#777', fontSize: '0.72rem', marginTop: 4 }}>
                  {formatDate(draft.updatedAt)}
                  {draft.websiteUrl && (
                    <> · <a href={draft.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#888', textDecoration: 'underline' }}>View on Lens</a></>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <a
                  href={`/studio/drafts/${draft.id}`}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: '1px solid #333',
                    background: 'transparent',
                    color: '#ccc',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Edit
                </a>
                {draft.status !== 'published' && (
                  <button
                    disabled={busyId === draft.id}
                    onClick={() => void handleApproveAndPublish(draft)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: '1px solid #c1432e',
                      background: '#c1432e22',
                      color: '#e8886d',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: busyId === draft.id ? 'wait' : 'pointer',
                      opacity: busyId === draft.id ? 0.6 : 1,
                    }}
                  >
                    {busyId === draft.id ? 'Publishing…' : '🚀 Publish'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
