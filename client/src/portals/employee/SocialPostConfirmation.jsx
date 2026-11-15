/**
 * SocialPostConfirmation.jsx — Post Confirmation & Approval Page.
 * Displays all generated Instagram posts awaiting approval or with historical decisions.
 * Provides Approve and Reject buttons connected to the n8n approval workflow.
 */

import { useState, useEffect, useCallback } from 'react';
import api, { getAssetUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useRealtimeSync } from '../../services/realtime';

const STATUS_BADGES = {
  Pending:   { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', label: 'Pending Approval' },
  Approved:  { bg: 'rgba(34, 197, 94, 0.15)',  text: '#22c55e', label: 'Approved' },
  Rejected:  { bg: 'rgba(239, 68, 68, 0.15)',  text: '#ef4444', label: 'Rejected' },
};

const POSTING_STATUS_BADGES = {
  'Awaiting Approval': { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
  Processing:          { bg: 'rgba(59, 130, 246, 0.15)',  text: '#3b82f6' },
  Posted:              { bg: 'rgba(34, 197, 94, 0.15)',   text: '#22c55e' },
  Rejected:            { bg: 'rgba(239, 68, 68, 0.15)',   text: '#ef4444' },
  Failed:              { bg: 'rgba(239, 68, 68, 0.2)',    text: '#ef4444' },
};

const SocialPostConfirmation = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'Pending' | 'Approved' | 'Rejected'
  const [processingId, setProcessingId] = useState(null);
  const { showSuccess, showError } = useToast();

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const url = filter === 'all' ? '/social/approvals' : `/social/approvals?status=${filter}`;
      const res = await api.get(url);
      if (res.data.success) {
        setApprovals(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load post approvals:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Real-time synchronization: Auto-refresh when new posts are generated or statuses update
  useRealtimeSync('social:approval-created', useCallback(() => {
    fetchApprovals();
  }, [fetchApprovals]));

  useRealtimeSync('social:status-updated', useCallback(() => {
    fetchApprovals();
  }, [fetchApprovals]));

  const handleDecision = async (approvalId, decision) => {
    if (processingId) return;

    try {
      setProcessingId(approvalId);

      const res = await api.post(`/social/approvals/${approvalId}/decision`, {
        decision,
      });

      if (res.data.success) {
        showSuccess(res.data.message || `Post ${decision === 'approve' ? 'approved' : 'rejected'} successfully.`);
        fetchApprovals();
      }
    } catch (err) {
      showError(err.response?.data?.message || `Failed to ${decision} post: ` + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Post Confirmation & Approval</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Review AI-generated Instagram posts, captions, and creative assets before publishing to Instagram.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          {['all', 'Pending', 'Approved', 'Rejected'].map((statusKey) => {
            const isActive = filter === statusKey;
            const label = statusKey === 'all' ? 'All Requests' : statusKey;
            return (
              <button
                key={statusKey}
                onClick={() => setFilter(statusKey)}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 600 : 400,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <div className="loader" style={{ margin: '0 auto' }} />
        </div>
      )}

      {/* Empty State */}
      {!loading && approvals.length === 0 && (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>No Posts Awaiting Confirmation</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            {filter === 'Pending'
              ? 'There are currently no generated posts waiting for your approval.'
              : 'No post approval requests found matching the current filter.'}
          </p>
        </div>
      )}

      {/* Approvals Grid */}
      {!loading && approvals.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: '1.5rem' }}>
          {approvals.map((item) => {
            const isPending = item.approvalStatus === 'Pending';
            const isProcessing = processingId === item.approvalId;
            const statusConfig = STATUS_BADGES[item.approvalStatus] || STATUS_BADGES.Pending;
            const postingConfig = POSTING_STATUS_BADGES[item.postingStatus] || { bg: 'rgba(107, 114, 128, 0.12)', text: '#9ca3af' };
            const previewImage = item.generatedImageUrl || item.productImageUrl;

            return (
              <div
                key={item.approvalId}
                className="card bg-bg-secondary"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  border: isPending ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-color)',
                  boxShadow: isPending ? '0 4px 12px rgba(245, 158, 11, 0.08)' : 'none',
                }}
              >
                {/* Card Topbar */}
                <div
                  style={{
                    padding: '0.9rem 1.25rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>📸</span>
                    <strong style={{ fontSize: '0.9rem' }}>{item.platform || 'Instagram'} Post</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>• {item.approvalId}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        backgroundColor: statusConfig.bg,
                        color: statusConfig.text,
                      }}
                    >
                      {statusConfig.label}
                    </span>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        backgroundColor: postingConfig.bg,
                        color: postingConfig.text,
                      }}
                    >
                      {item.postingStatus}
                    </span>
                  </div>
                </div>

                {/* Card Content Split */}
                <div style={{ padding: '1.25rem', display: 'flex', gap: '1.25rem', flex: 1 }}>
                  {/* Left: Image Preview */}
                  <div style={{ width: '160px', flexShrink: 0 }}>
                    <div
                      style={{
                        width: '100%',
                        height: '160px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      {previewImage ? (
                        <img
                          src={getAssetUrl(previewImage)}
                          alt={item.productName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '2rem' }}>💎</span>
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 6,
                          left: 6,
                          padding: '0.15rem 0.4rem',
                          background: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          fontSize: '0.68rem',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                      >
                        Preview
                      </div>
                    </div>

                    <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                      <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        ID: {item.productId}
                      </span>
                    </div>
                  </div>

                  {/* Right: Post Details */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.98rem', marginBottom: '0.25rem' }}>
                      {item.productName}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      Price: Rs. {Number(item.price || 0).toLocaleString()}
                    </div>

                    {/* Instagram Caption Box */}
                    <div
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.82rem',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        overflowY: 'auto',
                        maxHeight: '130px',
                        marginBottom: '0.5rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {item.generatedCaption || (
                        <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                          Caption generation in progress...
                        </span>
                      )}
                    </div>

                    {/* Meta info */}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Workflow Ref: {item.executionId || item.approvalId}</span>
                      <span>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                    </div>

                    {/* Instagram Post Link if already posted */}
                    {item.instagramPostId && (
                      <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#22c55e', fontWeight: 600 }}>
                        ✓ Published to Instagram (Post ID: {item.instagramPostId})
                      </div>
                    )}

                    {/* Error message if failed */}
                    {item.errorMessage && (
                      <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--error-color)' }}>
                        ⚠️ {item.errorMessage}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div
                  style={{
                    padding: '0.85rem 1.25rem',
                    borderTop: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-tertiary)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  {isPending ? (
                    <>
                      <button
                        onClick={() => handleDecision(item.approvalId, 'reject')}
                        disabled={isProcessing}
                        className="btn btn-outline"
                        style={{
                          padding: '0.45rem 1rem',
                          fontSize: '0.82rem',
                          borderColor: 'var(--error-color)',
                          color: 'var(--error-color)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <span>✕</span> Reject
                      </button>

                      <button
                        onClick={() => handleDecision(item.approvalId, 'approve')}
                        disabled={isProcessing}
                        className="btn btn-primary"
                        style={{
                          padding: '0.45rem 1.2rem',
                          fontSize: '0.82rem',
                          backgroundColor: '#22c55e',
                          color: '#fff',
                          border: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        {isProcessing ? (
                          <>
                            <span className="loader" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent' }} />
                            Processing...
                          </>
                        ) : (
                          <>
                            <span>✓</span> Approve & Publish
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Decision recorded ({item.approvalStatus}) on{' '}
                      {item.decidedAt ? new Date(item.decidedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SocialPostConfirmation;
