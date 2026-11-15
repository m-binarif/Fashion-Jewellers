/**
 * SocialPostConfirmation.jsx — Post Confirmation & Approval Tracking Page.
 * Uses the simplified 9-column post_approval schema.
 * Product information (Name, Price, Original Image) is retrieved dynamically from the product table.
 *
 * Organized into 3 main sections:
 * 1. Pending Approval: Shows posts waiting for Gmail decision with direct "Open Gmail" link (NO dashboard Approve/Reject buttons)
 * 2. Published Posts: Shows successfully published Instagram posts with published_at timestamp
 * 3. Rejected Posts: Shows historical rejected attempts
 */

import { useState, useEffect, useCallback } from 'react';
import api, { getAssetUrl } from '../../services/api';
import { useRealtimeSync } from '../../services/realtime';

const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

const STATUS_BADGES = {
  pending: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', label: 'Pending Approval' },
  approved: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', label: 'Approved' },
  published: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', label: 'Published' },
  rejected: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', label: 'Rejected' },
};

const POSTING_STATUS_BADGES = {
  'awaiting approval': { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', label: 'Awaiting Approval' },
  processing: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', label: 'Processing' },
  publishing: { bg: 'rgba(59, 130, 246, 0.2)', text: '#2563eb', label: 'Publishing' },
  published: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', label: 'Published' },
  posted: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', label: 'Published' },
  rejected: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', label: 'Rejected' },
  failed: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', label: 'Failed' },
};

const SocialPostConfirmation = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending'); // 'Pending' | 'Published' | 'Rejected' | 'all'

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/social/approvals');
      if (res.data.success) {
        setApprovals(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load post approvals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
    // 5-second polling fallback so external n8n updates show up automatically
    const interval = setInterval(fetchApprovals, 5000);
    return () => clearInterval(interval);
  }, [fetchApprovals]);

  // Real-time synchronization
  useRealtimeSync('social:approval-created', useCallback(() => {
    fetchApprovals();
  }, [fetchApprovals]));

  useRealtimeSync('social:status-updated', useCallback(() => {
    fetchApprovals();
  }, [fetchApprovals]));

  useRealtimeSync('social:post-triggered', useCallback(() => {
    fetchApprovals();
  }, [fetchApprovals]));

  // Categorize records into 3 sections using normalized status
  const pendingPosts = approvals.filter((item) => {
    const appStatus = normalizeStatus(item.approvalStatus);
    const postState = normalizeStatus(item.postingStatus);
    return (
      appStatus === 'pending' ||
      postState === 'awaiting approval' ||
      postState === 'processing' ||
      postState === 'publishing'
    );
  });

  const publishedPosts = approvals.filter((item) => {
    const appStatus = normalizeStatus(item.approvalStatus);
    const postState = normalizeStatus(item.postingStatus);
    return (
      postState === 'published' ||
      postState === 'posted' ||
      appStatus === 'approved'
    );
  });

  const rejectedPosts = approvals.filter((item) => {
    const appStatus = normalizeStatus(item.approvalStatus);
    const postState = normalizeStatus(item.postingStatus);
    return appStatus === 'rejected' || postState === 'rejected';
  });

  const getDisplayedItems = () => {
    if (activeTab === 'Pending') return pendingPosts;
    if (activeTab === 'Published') return publishedPosts;
    if (activeTab === 'Rejected') return rejectedPosts;
    return approvals;
  };

  const displayedItems = getDisplayedItems();

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Post Confirmation & History</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Review AI-generated Instagram posts, captions, and publishing status. Decisions occur through Gmail.
          </p>
        </div>

        {/* Section Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          {[
            { id: 'Pending', label: `Pending Approval (${pendingPosts.length})` },
            { id: 'Published', label: `Published (${publishedPosts.length})` },
            { id: 'Rejected', label: `Rejected History (${rejectedPosts.length})` },
            { id: 'all', label: `All (${approvals.length})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.45rem 0.9rem',
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
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading state */}
      {loading && approvals.length === 0 && (
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <div className="loader" style={{ margin: '0 auto' }} />
        </div>
      )}

      {/* Empty State */}
      {!loading && displayedItems.length === 0 && (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {activeTab === 'Pending' ? '📬' : activeTab === 'Published' ? '📸' : '📁'}
          </div>
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
            {activeTab === 'Pending'
              ? 'No Posts Awaiting Gmail Approval'
              : activeTab === 'Published'
              ? 'No Published Instagram Posts Yet'
              : activeTab === 'Rejected'
              ? 'No Rejected Posts'
              : 'No Records Found'}
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            {activeTab === 'Pending'
              ? 'When you trigger a post from the Products page, the approval request will appear here while waiting for Gmail decision.'
              : 'Posts approved via Gmail will be published to Instagram and archived here.'}
          </p>
        </div>
      )}

      {/* Post Cards Grid */}
      {!loading && displayedItems.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: '1.5rem' }}>
          {displayedItems.map((item) => {
            const appStatus = normalizeStatus(item.approvalStatus);
            const postState = normalizeStatus(item.postingStatus);

            const isPending =
              appStatus === 'pending' ||
              postState === 'awaiting approval' ||
              postState === 'processing' ||
              postState === 'publishing';
            const isPublished =
              postState === 'published' ||
              postState === 'posted' ||
              appStatus === 'approved';
            const isRejected = appStatus === 'rejected' || postState === 'rejected';

            const statusConfig = STATUS_BADGES[appStatus] || STATUS_BADGES.pending;
            const postingConfig =
              POSTING_STATUS_BADGES[postState] || { bg: 'rgba(107, 114, 128, 0.12)', text: '#9ca3af', label: item.postingStatus };
            const previewImage = item.enhancedImageUrl || item.productImageUrl;

            return (
              <div
                key={item.approvalRequestId}
                className="card bg-bg-secondary"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  border: isPending
                    ? '1px solid rgba(245, 158, 11, 0.35)'
                    : isPublished
                    ? '1px solid rgba(34, 197, 94, 0.3)'
                    : isRejected
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : '1px solid var(--border-color)',
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
                    <strong style={{ fontSize: '0.9rem' }}>Instagram Post</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>• {item.approvalRequestId}</span>
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
                      {postingConfig.label || item.postingStatus}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '1.25rem', display: 'flex', gap: '1.25rem', flex: 1 }}>
                  {/* Left: Enhanced Image Preview */}
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
                        {item.enhancedImageUrl ? 'Enhanced' : 'Original'}
                      </div>
                    </div>

                    <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                      <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        ID: {item.productId}
                      </span>
                    </div>
                  </div>

                  {/* Right: Details & Caption (Retrieved dynamically through product_id join) */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.98rem', marginBottom: '0.25rem' }}>
                      {item.productName}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      Price: Rs. {Number(item.price || 0).toLocaleString()}
                    </div>

                    {/* Caption Preview Box */}
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
                          Caption generation in progress by n8n AI workflow...
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Attempt ID: {item.approvalRequestId}</span>
                      <span>
                        Created:{' '}
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </span>
                    </div>

                    {/* Publication Timestamp */}
                    {item.publishedAt && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#22c55e', fontWeight: 600 }}>
                        ✓ Published at:{' '}
                        {new Date(item.publishedAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer: NO dashboard Approve/Reject buttons */}
                <div
                  style={{
                    padding: '0.85rem 1.25rem',
                    borderTop: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-tertiary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  {isPending ? (
                    <>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>Awaiting decision via Gmail</span>
                      </div>

                      {/* Open Gmail button */}
                      <a
                        href="https://mail.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn"
                        style={{
                          padding: '0.45rem 1.1rem',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          borderRadius: '6px',
                          backgroundColor: '#ea4335',
                          color: '#fff',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          border: 'none',
                          boxShadow: '0 2px 6px rgba(234, 67, 53, 0.3)',
                        }}
                      >
                        <span>✉️</span> Open Gmail
                      </a>
                    </>
                  ) : isPublished ? (
                    <div style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 600 }}>
                      ✓ Successfully Approved via Gmail & Published to Instagram
                    </div>
                  ) : isRejected ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Rejected via Gmail. You can re-attempt posting this product from the{' '}
                      <strong>Products</strong> page.
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Status: {item.approvalStatus}
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
