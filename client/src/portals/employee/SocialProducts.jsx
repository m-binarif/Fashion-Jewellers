/**
 * SocialProducts.jsx — Dedicated Products Page for Social Media Managers & Admin.
 * Displays existing product records from PostgreSQL in read-only mode,
 * with conditional "Post" button based on exact business logic:
 *
 * Post button is VISIBLE ONLY when:
 * 1. Product's post_status is 'Pending'
 * 2. AND (no approval record exists OR latest approval attempt status is 'Rejected')
 *
 * Post button is HIDDEN when:
 * - Product's post_status is 'Published'
 * - Latest approval attempt is 'Pending', 'Processing', 'Awaiting Approval', 'Approved'
 * - Product is currently being processed by n8n
 */

import { useState, useEffect, useCallback } from 'react';
import api, { getAssetUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useRealtimeSync } from '../../services/realtime';

const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

const POST_STATUS_COLORS = {
  pending: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)', label: 'Pending' },
  processing: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)', label: 'Processing' },
  'awaiting approval': { bg: 'rgba(168, 85, 247, 0.15)', text: '#A855F7', border: 'rgba(168, 85, 247, 0.3)', label: 'Awaiting Approval' },
  approved: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)', label: 'Approved' },
  posted: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)', label: 'Published' },
  published: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)', label: 'Published' },
  rejected: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)', label: 'Rejected' },
  failed: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)', label: 'Failed' },
};

const PostStatusBadge = ({ status, latestApprovalStatus }) => {
  const norm = normalizeStatus(status) || 'pending';
  const c = POST_STATUS_COLORS[norm] || {
    bg: 'rgba(165, 168, 168, 0.12)',
    text: '#A5A8A8',
    border: 'rgba(165, 168, 168, 0.25)',
    label: status || '—',
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span
        style={{
          padding: '0.25rem 0.65rem',
          borderRadius: 20,
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: c.bg,
          color: c.text,
          border: `1px solid ${c.border}`,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          textTransform: 'capitalize',
          width: 'fit-content',
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: c.text }} />
        {c.label}
      </span>
      {latestApprovalStatus && norm === 'pending' && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          Latest: <strong style={{ color: 'var(--text-primary)' }}>{POST_STATUS_COLORS[normalizeStatus(latestApprovalStatus)]?.label || latestApprovalStatus}</strong>
        </span>
      )}
    </div>
  );
};

const SocialProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [triggeringId, setTriggeringId] = useState(null);
  const { showSuccess, showError } = useToast();

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get('/social/products');
      if (res.data.success) {
        setProducts(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load products for social dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    const interval = setInterval(fetchProducts, 5000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  // Real-time synchronization
  useRealtimeSync('products:changed', useCallback(() => {
    fetchProducts();
  }, [fetchProducts]));

  useRealtimeSync('social:post-triggered', useCallback(() => {
    fetchProducts();
  }, [fetchProducts]));

  useRealtimeSync('social:status-updated', useCallback(() => {
    fetchProducts();
  }, [fetchProducts]));

  const canShowPostButton = (product) => {
    const postStatus = normalizeStatus(product.post_status) || 'pending';
    if (postStatus === 'published' || postStatus === 'posted') {
      return false;
    }
    if (postStatus !== 'pending') {
      return false;
    }

    const latestStatus = product.latestApprovalStatus ? normalizeStatus(product.latestApprovalStatus) : null;
    const latestPosting = product.latestPostingStatus ? normalizeStatus(product.latestPostingStatus) : null;

    if (!latestStatus) {
      return true;
    }

    if (latestStatus === 'rejected') {
      return true;
    }

    if (
      latestStatus === 'pending' ||
      latestStatus === 'approved' ||
      latestPosting === 'processing' ||
      latestPosting === 'awaiting approval' ||
      latestPosting === 'publishing'
    ) {
      return false;
    }

    return false;
  };

  const handlePostClick = async (product) => {
    if (triggeringId) return;

    if (!canShowPostButton(product)) {
      showError('This product is not currently eligible for posting.');
      return;
    }

    try {
      setTriggeringId(product.id);
      const res = await api.post(`/social/products/${product.id}/post`);

      if (res.data.success) {
        showSuccess(
          res.data.message ||
            'Post workflow triggered! n8n is retrieving product details from PostgreSQL to generate the post.'
        );
        fetchProducts();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showError(`Failed to trigger post: ${msg}`);
    } finally {
      setTriggeringId(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || (p.name || '').toLowerCase().includes(q) || (p.id || '').toLowerCase().includes(q);
    const postNorm = normalizeStatus(p.post_status) || 'pending';
    const matchesFilter = !filterStatus || postNorm === normalizeStatus(filterStatus);
    return matchesSearch && matchesFilter;
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 700,
              color: 'var(--accent-primary)',
              display: 'inline-block',
              marginBottom: '0.35rem',
            }}
          >
            Social Media &amp; Campaign Automation
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: '1.65rem',
              fontFamily: 'var(--font-heading)',
              color: 'var(--text-primary)',
              letterSpacing: '0.04em',
            }}
          >
            Products Posting
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Trigger autonomous n8n Instagram publishing with AI caption generation and email approvals
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '380px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by product ID or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.4rem' }}
          />
          <span
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
            }}
          >
            🔍
          </span>
        </div>

        <select
          className="form-input"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ width: 'auto', minWidth: '180px' }}
        >
          <option value="">All Post Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="awaiting approval">Awaiting Approval</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Products Table Card */}
      <div
        className="card"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
        }}
      >
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div className="loader" style={{ margin: '0 auto 1rem' }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading product posting queue...</div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>📸</div>
            <div style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>No products match filter criteria.</div>
            <div style={{ fontSize: '0.85rem' }}>Try clearing the search or status filter.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.95rem 1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', fontWeight: 600 }}>Product ID</th>
                  <th style={{ padding: '0.95rem 1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', fontWeight: 600 }}>Jewellery Piece</th>
                  <th style={{ padding: '0.95rem 1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', fontWeight: 600 }}>Catalog Status</th>
                  <th style={{ padding: '0.95rem 1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', fontWeight: 600 }}>Instagram Status</th>
                  <th style={{ padding: '0.95rem 1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const showButton = canShowPostButton(product);
                  const isTriggering = triggeringId === product.id;

                  return (
                    <tr
                      key={product.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.825rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                        #{product.id}
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                          <div
                            style={{
                              width: 46,
                              height: 46,
                              borderRadius: 8,
                              overflow: 'hidden',
                              backgroundColor: '#1E2225',
                              border: '1px solid rgba(214, 180, 106, 0.25)',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <img
                              src={getAssetUrl(product.imageUrl)}
                              alt={product.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '💎';
                              }}
                            />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                              {product.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                              PKR {Number(product.price || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: 20,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: product.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: product.isActive ? '#10B981' : '#EF4444',
                            border: product.isActive ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                          }}
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <PostStatusBadge
                          status={product.post_status}
                          latestApprovalStatus={product.latestApprovalStatus}
                        />
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        {showButton ? (
                          <button
                            onClick={() => handlePostClick(product)}
                            disabled={isTriggering || triggeringId !== null}
                            className="btn"
                            title={
                              normalizeStatus(product.latestApprovalStatus) === 'rejected'
                                ? 'Re-trigger Instagram post generation via n8n'
                                : 'Generate & Publish Instagram Post via n8n'
                            }
                            style={{
                              padding: '0.45rem 1.1rem',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              borderRadius: 8,
                              background: 'linear-gradient(135deg, #E1306C 0%, #C13584 50%, #833AB4 100%)',
                              color: '#fff',
                              border: 'none',
                              cursor: isTriggering || triggeringId ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              boxShadow: '0 4px 14px rgba(225, 48, 108, 0.35)',
                              transition: 'all 0.2s ease',
                              opacity: isTriggering || triggeringId ? 0.6 : 1,
                            }}
                          >
                            {isTriggering ? (
                              <>
                                <span
                                  className="loader"
                                  style={{
                                    width: 14,
                                    height: 14,
                                    borderWidth: 2,
                                    borderColor: '#fff',
                                    borderTopColor: 'transparent',
                                  }}
                                />
                                <span>Triggering n8n...</span>
                              </>
                            ) : (
                              <>
                                <span>📸</span>
                                <span>{normalizeStatus(product.latestApprovalStatus) === 'rejected' ? 'Retry Post' : 'Post'}</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialProducts;
