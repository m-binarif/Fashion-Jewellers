/**
 * SocialProducts.jsx — Dedicated Products Page for Social Media Managers.
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
  pending: { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', label: 'Pending' },
  processing: { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6', label: 'Processing' },
  'awaiting approval': { bg: 'rgba(168, 85, 247, 0.12)', text: '#a855f7', label: 'Awaiting Approval' },
  approved: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', label: 'Approved' },
  posted: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', label: 'Published' },
  published: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', label: 'Published' },
  rejected: { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', label: 'Rejected' },
  failed: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', label: 'Failed' },
};

const PostStatusBadge = ({ status, latestApprovalStatus }) => {
  const norm = normalizeStatus(status) || 'pending';
  const c = POST_STATUS_COLORS[norm] || { bg: 'rgba(107, 114, 128, 0.12)', text: '#9ca3af', label: status || '—' };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span
        style={{
          padding: '0.25rem 0.65rem',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: c.bg,
          color: c.text,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          textTransform: 'capitalize',
          width: 'fit-content',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: c.text }} />
        {c.label}
      </span>
      {latestApprovalStatus && norm === 'pending' && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          Latest Attempt: <strong>{POST_STATUS_COLORS[normalizeStatus(latestApprovalStatus)]?.label || latestApprovalStatus}</strong>
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
      // Use dedicated social endpoint that returns products with latest approval status
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
    // 5-second polling fallback in addition to SSE
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

  /**
   * Post Button Visibility Logic:
   * 1. Product's post_status must be 'pending' (never 'published')
   * 2. AND (no approval record exists OR latest approval attempt status is 'rejected')
   *
   * Hidden when:
   * - Product is published
   * - Latest approval is pending / approved
   * - Latest posting is processing / awaiting approval / publishing
   */
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

    // If no record exists yet -> SHOW
    if (!latestStatus) {
      return true;
    }

    // If latest attempt was rejected -> SHOW (allows retrying)
    if (latestStatus === 'rejected') {
      return true;
    }

    // If latest attempt is pending, approved, processing, awaiting approval, publishing -> HIDE
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

      // Call backend API: passes only productId in the route
      const res = await api.post(`/social/products/${product.id}/post`);

      if (res.data.success) {
        showSuccess(
          res.data.message ||
            'Post workflow triggered! n8n is retrieving product details from PostgreSQL to generate the post.'
        );
        // Refresh product list immediately
        fetchProducts();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showError(`Failed to trigger post: ${msg}`);
    } finally {
      setTriggeringId(null);
    }
  };

  // Filter products by search and status
  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || (p.name || '').toLowerCase().includes(q) || (p.id || '').toLowerCase().includes(q);
    const postNorm = normalizeStatus(p.post_status) || 'pending';
    const matchesFilter = !filterStatus || postNorm === normalizeStatus(filterStatus);
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Products for Social Media</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Review catalog items and initiate automated Instagram post generation for eligible products.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search by product ID or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <select
          className="form-input"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ maxWidth: 200 }}
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

      {/* Table Card */}
      <div className="card bg-bg-secondary overflow-hidden">
        {loading ? (
          <div className="p-8 text-center" style={{ padding: '3rem' }}>
            <div className="loader" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <th className="p-4" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Product ID</th>
                <th className="p-4" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Product Name</th>
                <th className="p-4" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Product Status</th>
                <th className="p-4" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Post Status</th>
                <th className="p-4" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const showButton = canShowPostButton(product);
                const isTriggering = triggeringId === product.id;

                return (
                  <tr key={product.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {/* 1. Product ID */}
                    <td className="p-4 font-mono font-semibold" style={{ fontSize: '0.88rem' }}>
                      {product.id}
                    </td>

                    {/* 2. Product Name */}
                    <td className="p-4">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                          src={getAssetUrl(product.imageUrl)}
                          alt={product.name}
                          style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-color)' }}
                        />
                        <div>
                          <div className="font-semibold" style={{ fontSize: '0.9rem' }}>{product.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Rs. {Number(product.price || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 3. Product Status (Active / Inactive) */}
                    <td className="p-4">
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: product.isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: product.isActive ? 'var(--success-color)' : 'var(--error-color)',
                        }}
                      >
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* 4. Post Status */}
                    <td className="p-4">
                      <PostStatusBadge
                        status={product.post_status}
                        latestApprovalStatus={product.latestApprovalStatus}
                      />
                    </td>

                    {/* 5. Action (Post Button) */}
                    <td className="p-4">
                      {showButton ? (
                        <button
                          onClick={() => handlePostClick(product)}
                          disabled={isTriggering || triggeringId !== null}
                          className="btn"
                          title={normalizeStatus(product.latestApprovalStatus) === 'rejected' ? 'Re-trigger post generation' : 'Generate Instagram Post'}
                          style={{
                            padding: '0.45rem 1rem',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                            background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                            color: '#fff',
                            border: 'none',
                            cursor: isTriggering || triggeringId ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            boxShadow: '0 2px 6px rgba(220, 39, 67, 0.3)',
                            transition: 'opacity 0.2s',
                            opacity: isTriggering || triggeringId ? 0.6 : 1,
                          }}
                        >
                          {isTriggering ? (
                            <>
                              <span className="loader" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent' }} />
                              Triggering...
                            </>
                          ) : (
                            <>
                              <span>📸</span> Post
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
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className="p-8 text-center text-text-secondary" style={{ padding: '3rem' }}>
            No products found matching the criteria.
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialProducts;
