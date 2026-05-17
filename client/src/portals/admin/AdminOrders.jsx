import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const STATUS_COLORS = {
  Pending:    { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b' },
  Processing: { bg: 'rgba(59,130,246,0.12)',  text: '#3b82f6' },
  Shipped:    { bg: 'rgba(139,92,246,0.12)',  text: '#8b5cf6' },
  Delivered:  { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e' },
  Cancelled:  { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444' },
  'Payment Failed': { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' }
};

const StatusBadge = ({ status }) => {
  const c = STATUS_COLORS[status] || { bg: '#6b728018', text: '#6b7280' };
  return (
    <span style={{ padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: c.bg, color: c.text }}>
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

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      showSuccess(`Order status updated to ${newStatus}`);
    } catch (err) {
      showError('Failed to update status: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ margin: 0 }}>Order Management</h2>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {total} total order{total !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search by order ID or customer…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ maxWidth: 280 }}
        />
        <select
          className="form-input"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ maxWidth: 180 }}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}><div className="loader" style={{ margin: '0 auto' }} /></div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No orders found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  {['Order ID', 'Customer', 'Items', 'Total (PKR)', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <>
                    <tr
                      key={order.id || order.order_id}
                      style={{ borderTop: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s', backgroundColor: expandedId === (order.id || order.order_id) ? 'var(--bg-tertiary)' : '' }}
                      onClick={() => setExpandedId(expandedId === (order.id || order.order_id) ? null : (order.id || order.order_id))}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = expandedId === (order.id || order.order_id) ? 'var(--bg-tertiary)' : ''}
                    >
                      <td style={{ padding: '0.9rem 1rem', fontWeight: 700 }}>#{order.orderNumber || order.order_number || order.id}</td>
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.875rem' }}>
                        <div>{order.customerName || order.customer_name || '—'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{order.customerPhone || order.customer_phone || order.phone}</div>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{order.itemCount ?? order.item_count ?? '—'}</td>
                      <td style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>{Number(order.totalAmount || order.total_amount || 0).toLocaleString()}</td>
                      <td style={{ padding: '0.9rem 1rem' }}><StatusBadge status={order.status} /></td>
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <select
                            className="form-input"
                            value={order.status || ''}
                            onChange={e => handleStatusChange(order.id || order.order_id, e.target.value)}
                            disabled={updatingId === (order.id || order.order_id) || ['Delivered', 'Cancelled'].includes(order.status)}
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: 'auto', maxWidth: 120, display: 'inline-block', margin: 0 }}
                            onClick={e => e.stopPropagation()}
                          >
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Download Invoice"
                            onClick={(e) => {
                              e.stopPropagation();
                              const oid = order.id || order.order_id;
                              const token = localStorage.getItem('admin_token');
                              const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/orders/${oid}/invoice?token=${token}`;
                              window.open(url, '_blank');
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {(expandedId === order.id || expandedId === order.order_id) && (
                      <tr key={`${order.id || order.order_id}-expand`} style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <td colSpan={7} style={{ padding: '1rem 2.5rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                              <strong style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shipping Destination</strong>
                              <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                                <div style={{ fontWeight: 600 }}>{order.customerName || order.customer_name}</div>
                                <div>{order.street || order.shipping_street || 'No street provided'}</div>
                                <div>
                                  {order.city || order.shipping_city || ''}
                                  {(order.city || order.shipping_city) && (order.state || order.shipping_state) ? ', ' : ''}
                                  {order.state || order.shipping_state || ''} {order.postalCode || order.shipping_postal_code || ''}
                                </div>
                                <div>{order.country || order.shipping_country || ''}</div>
                                <div style={{ marginTop: '0.5rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                                  📞 {order.customerPhone || order.customer_phone || order.phone || 'No phone'}
                                </div>
                              </div>
                            </div>
                            <div>
                              <strong style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Summary</strong>
                              <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', backgroundColor: 'var(--bg-primary)' }}>
                                <table style={{ width: '100%', fontSize: '0.85rem' }}>
                                  <tbody>
                                    <tr><td colSpan={2} style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Click "View & Print Invoice" to see full itemized list.</td></tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <button className="btn btn-outline" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
