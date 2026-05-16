import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [togglingId, setTogglingId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const pageSize = 10;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, pageSize });
      if (search) params.set('search', search);
      const res = await api.get(`/admin/customers?${params}`);
      if (res.data.success) {
        const data = res.data.data;
        setCustomers(data.customers || data || []);
        setTotal(data.total || (data.customers || data || []).length);
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleToggleStatus = async (customer) => {
    setTogglingId(customer.id);
    const newStatus = !customer.isActive;
    try {
      await api.patch(`/admin/customers/${customer.id}/status`, { isActive: newStatus });
      setCustomers(prev =>
        prev.map(c => c.id === customer.id ? { ...c, isActive: newStatus } : c)
      );
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer(prev => ({ ...prev, isActive: newStatus }));
      }
      showSuccess(`Customer account ${newStatus ? 'activated' : 'deactivated'} successfully!`);
    } catch (err) {
      showError('Failed to update status: ' + (err.response?.data?.message || err.message));
    } finally {
      setTogglingId(null);
    }
  };

  const handleViewDetails = async (customer) => {
    if (selectedCustomer?.id === customer.id) {
      setSelectedCustomer(null);
      return;
    }
    setDetailLoading(true);
    setSelectedCustomer(customer);
    try {
      const res = await api.get(`/admin/customers/${customer.id}`);
      if (res.data.success) setSelectedCustomer(res.data.data);
    } catch {
      /* use basic info already set */
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ margin: 0 }}>Customer Management</h2>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {total} registered customer{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ maxWidth: 320 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedCustomer ? '1fr 340px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}><div className="loader" style={{ margin: '0 auto' }} /></div>
          ) : customers.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No customers found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    {['Customer', 'Email', 'Phone', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr
                      key={c.id}
                      style={{
                        borderTop: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        backgroundColor: selectedCustomer?.id === c.id ? 'var(--bg-tertiary)' : '',
                        transition: 'background 0.15s'
                      }}
                      onClick={() => handleViewDetails(c)}
                      onMouseEnter={e => { if (selectedCustomer?.id !== c.id) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'; }}
                      onMouseLeave={e => { if (selectedCustomer?.id !== c.id) e.currentTarget.style.backgroundColor = ''; }}
                    >
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            backgroundColor: 'var(--accent-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0
                          }}>
                            {(c.name || c.username || '?')[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.name || c.username || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{c.email || '—'}</td>
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{c.phone || '—'}</td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                          backgroundColor: c.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                          color: c.isActive ? '#22c55e' : '#ef4444'
                        }}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                        <button
                          className="btn btn-outline"
                          style={{
                            padding: '0.3rem 0.7rem', fontSize: '0.75rem',
                            borderColor: c.isActive ? 'var(--error-color)' : 'var(--success-color)',
                            color: c.isActive ? 'var(--error-color)' : 'var(--success-color)'
                          }}
                          onClick={() => handleToggleStatus(c)}
                          disabled={togglingId === c.id}
                        >
                          {togglingId === c.id ? '…' : c.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <button className="btn btn-outline" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Sidebar */}
        {selectedCustomer && (
          <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Customer Profile</h3>
              <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}><div className="loader" style={{ margin: '0 auto' }} /></div>
            ) : (
              <>
                {/* Avatar */}
                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    backgroundColor: 'var(--accent-primary)', color: '#fff',
                    fontSize: '1.5rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem'
                  }}>
                    {(selectedCustomer.name || selectedCustomer.username || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{selectedCustomer.name || selectedCustomer.username}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedCustomer.email}</div>
                </div>

                {/* Fields */}
                {[
                  { label: 'Customer ID', val: selectedCustomer.id },
                  { label: 'Phone', val: selectedCustomer.phone || '—' },
                  { label: 'Address', val: selectedCustomer.address || '—' },
                  { label: 'Status', val: selectedCustomer.isActive ? '✅ Active' : '🔴 Inactive' },
                  { label: 'Member Since', val: selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString() : '—' },
                  { label: 'Total Orders', val: selectedCustomer.orderCount ?? '—' },
                  { label: 'Total Spent (PKR)', val: selectedCustomer.totalSpent ? Number(selectedCustomer.totalSpent).toLocaleString() : '—' },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '55%', wordBreak: 'break-word' }}>{val}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCustomers;
