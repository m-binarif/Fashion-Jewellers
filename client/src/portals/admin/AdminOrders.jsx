import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useRealtimeSync } from '../../services/realtime';

const STATUS_CONFIG = {
  Pending: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
  Processing: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' },
  Shipped: { bg: 'rgba(168, 85, 247, 0.15)', text: '#A855F7', border: 'rgba(168, 85, 247, 0.3)' },
  Delivered: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' },
  Cancelled: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' },
  'Payment Failed': { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_CONFIG[status] || {
    bg: 'rgba(165, 168, 168, 0.12)',
    text: '#A5A8A8',
    border: 'rgba(165, 168, 168, 0.25)',
  };

  return (
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
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: c.text }} />
      {status || '—'}
    </span>
  );
};

const STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Payment Failed'];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const { showSuccess, showError } = useToast();
  const pageSize = 10;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, pageSize });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/admin/orders?${params}`);
      if (res.data.success) {
        const data = res.data.data;
        setOrders(data.orders || data || []);
        setTotal(data.total || (data.orders || data || []).length);
      }
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time synchronization
  useRealtimeSync('orders:changed', useCallback(() => {
    fetchOrders();
  }, [fetchOrders]));

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      showSuccess(`Order status updated to ${newStatus}`);
    } catch (err) {
      showError('Failed to update status: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

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
            Fulfillment &amp; Transactions
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
            Order Management
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {total} total order{total !== 1 ? 's' : ''} tracked across boutique channels
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
            placeholder="Search by order ID or customer…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          style={{ width: 'auto', minWidth: '180px' }}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Orders Table Card */}
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
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading transaction records...</div>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>📦</div>
            <div style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>No orders found.</div>
            <div style={{ fontSize: '0.85rem' }}>Adjust your search or status filter.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  {['Order ID', 'Customer Details', 'Items', 'Total (PKR)', 'Status', 'Date', 'Actions'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '0.95rem 1.25rem',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const oid = order.id || order.order_id;
                  const isExpanded = expandedId === oid;

                  return (
                    <tr key={oid} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : oid)}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1.2fr 2fr 1fr 1.4fr 1.4fr 1.3fr 1.8fr',
                            alignItems: 'center',
                            padding: '1rem 1.25rem',
                            cursor: 'pointer',
                            backgroundColor: isExpanded ? 'rgba(214, 180, 106, 0.05)' : 'transparent',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isExpanded) e.currentTarget.style.backgroundColor = 'rgba(214, 180, 106, 0.03)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                            <span style={{ color: 'var(--accent-primary)' }}>#</span>
                            <span style={{ color: 'var(--text-primary)' }}>{order.orderNumber || order.order_number || oid}</span>
                          </div>

                          <div style={{ fontSize: '0.875rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {order.customerName || order.customer_name || '—'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                              {order.customerPhone || order.customer_phone || order.phone || 'No phone'}
                            </div>
                          </div>

                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {order.itemCount ?? order.item_count ?? '1'} piece{Number(order.itemCount || 1) !== 1 ? 's' : ''}
                          </div>

                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                            PKR {Number(order.totalAmount || order.total_amount || 0).toLocaleString()}
                          </div>

                          <div>
                            <StatusBadge status={order.status} />
                          </div>

                          <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {order.orderDate
                              ? new Date(order.orderDate).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <select
                              className="form-input"
                              value={order.status || ''}
                              onChange={(e) => handleStatusChange(oid, e.target.value)}
                              disabled={updatingId === oid || ['Delivered', 'Cancelled'].includes(order.status)}
                              style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.78rem',
                                width: 'auto',
                                maxWidth: '130px',
                                margin: 0,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>

                            <button
                              className="btn btn-outline"
                              style={{
                                padding: '0.35rem 0.55rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 6,
                              }}
                              title="Download Official Invoice PDF"
                              onClick={(e) => {
                                e.stopPropagation();
                                const token =
                                  sessionStorage.getItem('employee_token') ||
                                  localStorage.getItem('admin_token') ||
                                  localStorage.getItem('token');
                                const url = `${
                                  import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
                                }/orders/${oid}/invoice?token=${token}`;
                                window.open(url, '_blank');
                              }}
                            >
                              <svg style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Shipping Details & Summary */}
                        {isExpanded && (
                          <div
                            style={{
                              padding: '1.25rem 2rem 1.5rem',
                              backgroundColor: '#1E2225',
                              borderTop: '1px dashed var(--border-color)',
                            }}
                          >
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.75rem' }}>
                              <div>
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    display: 'block',
                                    marginBottom: '0.65rem',
                                    color: 'var(--accent-primary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    fontWeight: 700,
                                  }}
                                >
                                  Shipping Destination
                                </span>
                                <div style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                                  <div style={{ fontWeight: 600 }}>{order.customerName || order.customer_name}</div>
                                  <div style={{ color: 'var(--text-secondary)' }}>
                                    {order.street || order.shipping_street || 'No street provided'}
                                  </div>
                                  <div style={{ color: 'var(--text-secondary)' }}>
                                    {order.city || order.shipping_city || ''}
                                    {(order.city || order.shipping_city) && (order.state || order.shipping_state) ? ', ' : ''}
                                    {order.state || order.shipping_state || ''} {order.postalCode || order.shipping_postal_code || ''}
                                  </div>
                                  <div style={{ color: 'var(--text-secondary)' }}>{order.country || order.shipping_country || ''}</div>
                                  <div style={{ marginTop: '0.45rem', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.825rem' }}>
                                    📞 {order.customerPhone || order.customer_phone || order.phone || 'No phone'}
                                  </div>
                                </div>
                              </div>

                              <div>
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    display: 'block',
                                    marginBottom: '0.65rem',
                                    color: 'var(--accent-primary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    fontWeight: 700,
                                  }}
                                >
                                  Invoice Actions &amp; Summary
                                </span>
                                <div
                                  style={{
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 8,
                                    padding: '0.9rem 1.15rem',
                                    backgroundColor: 'var(--bg-card)',
                                  }}
                                >
                                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.65rem' }}>
                                    Total Payable: <strong style={{ color: 'var(--text-primary)' }}>PKR {Number(order.totalAmount || order.total_amount || 0).toLocaleString()}</strong>
                                  </div>
                                  <button
                                    className="btn btn-outline"
                                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const token =
                                        sessionStorage.getItem('employee_token') ||
                                        localStorage.getItem('admin_token') ||
                                        localStorage.getItem('token');
                                      const url = `${
                                        import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
                                      }/orders/${oid}/invoice?token=${token}`;
                                      window.open(url, '_blank');
                                    }}
                                  >
                                    View &amp; Print Full Invoice ↗
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-outline"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <button
                className="btn btn-outline"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
