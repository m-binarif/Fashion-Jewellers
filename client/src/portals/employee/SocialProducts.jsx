/**
 * SocialProducts.jsx — Dedicated Products Page for Social Media Managers.
 * Displays existing product records from the database in read-only mode,
 * with conditional "Post" button for products with 'Pending' post status.
 */

import { useState, useEffect, useCallback } from 'react';
import api, { getAssetUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useRealtimeSync } from '../../services/realtime';

const POST_STATUS_COLORS = {
  pending:             { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', label: 'Pending' },
  processing:          { bg: 'rgba(59, 130, 246, 0.12)',  text: '#3b82f6', label: 'Processing' },
  'awaiting approval': { bg: 'rgba(168, 85, 247, 0.12)', text: '#a855f7', label: 'Awaiting Approval' },
  approved:            { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', label: 'Approved' },
  posted:              { bg: 'rgba(34, 197, 94, 0.15)',  text: '#22c55e', label: 'Posted' },
  rejected:            { bg: 'rgba(239, 68, 68, 0.12)',  text: '#ef4444', label: 'Rejected' },
  failed:              { bg: 'rgba(239, 68, 68, 0.15)',  text: '#ef4444', label: 'Failed' },
};

const PostStatusBadge = ({ status }) => {
  const norm = (status || 'pending').toLowerCase();
  const c = POST_STATUS_COLORS[norm] || { bg: 'rgba(107, 114, 128, 0.12)', text: '#9ca3af', label: status || '—' };
  return (
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
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: c.text }} />
      {c.label}
    </span>
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
      setLoading(true);
      const res = await api.get('/products?pageSize=100');
      if (res.data.success) {
        setProducts(res.data.data.products || res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load products for social dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Real-time synchronization: Auto-refresh when products or posting status updates
  useRealtimeSync('products:changed', useCallback(() => {
    fetchProducts();
  }, [fetchProducts]));

  useRealtimeSync('social:post-triggered', useCallback(() => {
    fetchProducts();
  }, [fetchProducts]));

  useRealtimeSync('social:status-updated', useCallback(() => {
    fetchProducts();
  }, [fetchProducts]));

  const handlePostClick = async (product) => {
    // 1. Guard against in-flight triggers
    if (triggeringId) return;

    // 2. Validate current post_status is pending
    const currentStatus = (product.post_status || '').toLowerCase().trim();
    if (currentStatus !== 'pending') {
      showError(`Only products with 'Pending' post status can be posted. Current status: ${product.post_status}`);
      return;
    }

    try {
      setTriggeringId(product.id);

      const res = await api.post('/social/trigger-post', {
        productId: product.id,
      });

      if (res.data.success) {
        showSuccess(res.data.data?.note || 'Post generation initiated! n8n workflow triggered.');
        // Optimistically update product post_status to Processing
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, post_status: 'Processing' } : p))
        );
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to trigger post workflow: ' + err.message);
    } finally {
      setTriggeringId(null);
    }
  };

  // Filter products by search and status
  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || (p.name || '').toLowerCase().includes(q) || (p.id || '').toLowerCase().includes(q);
    const postNorm = (p.post_status || 'pending').toLowerCase();
    const matchesFilter = !filterStatus || postNorm === filterStatus.toLowerCase();
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
          <option value="approved">Approved</option>
          <option value="posted">Posted</option>
          <option value="rejected">Rejected</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table Card */}
      <div className="card bg-bg-secondary overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="loader" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <th className="p-4" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Product ID</th>
                <th className="p-4" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Product Name</th>
                <th className="p-4" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Status</th>
                <th className="p-4" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Post Status</th>
                <th className="p-4" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const isPending = (product.post_status || 'pending').toLowerCase() === 'pending';
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
                      <PostStatusBadge status={product.post_status} />
                    </td>

                    {/* 5. Action */}
                    <td className="p-4">
                      {isPending ? (
                        <button
                          onClick={() => handlePostClick(product)}
                          disabled={isTriggering || triggeringId !== null}
                          className="btn"
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
                              Posting...
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
