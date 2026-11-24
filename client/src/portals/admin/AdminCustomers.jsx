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

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleToggleStatus = async (customer) => {
    setTogglingId(customer.id);
    const newStatus = !customer.isActive;
    try {
      await api.patch(`/admin/customers/${customer.id}/status`, { isActive: newStatus });
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, isActive: newStatus } : c))
      );
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer((prev) => ({ ...prev, isActive: newStatus }));
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
            Client Relations &amp; Profiles
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
            Customer Management
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {total} registered client{total !== 1 ? 's' : ''} in the boutique membership directory
          </p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '380px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by client name or email…"
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
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedCustomer ? '1fr 360px' : '1fr',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Table Card */}
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
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading clientele directory...</div>
            </div>
          ) : customers.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>👥</div>
              <div style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>No clients found.</div>
              <div style={{ fontSize: '0.85rem' }}>Adjust your search filter.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    {['Client', 'Email', 'Contact Phone', 'Account Status', 'Member Since', 'Actions'].map((h) => (
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
                  {customers.map((c) => {
                    const isSelected = selectedCustomer?.id === c.id;

                    return (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(214, 180, 106, 0.08)' : 'transparent',
                          transition: 'background-color 0.15s ease',
                        }}
                        onClick={() => handleViewDetails(c)}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(214, 180, 106, 0.03)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, rgba(214, 180, 106, 0.25) 0%, rgba(214, 180, 106, 0.05) 100%)',
                                border: '1.5px solid var(--accent-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--accent-primary)',
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {(c.name || c.username || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                {c.name || c.username || '—'}
                              </div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                ID: #{c.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {c.email || '—'}
                        </td>

                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {c.phone || '—'}
                        </td>

                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.65rem',
                              borderRadius: 20,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: c.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              color: c.isActive ? '#10B981' : '#EF4444',
                              border: c.isActive ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: c.isActive ? '#10B981' : '#EF4444' }} />
                            {c.isActive ? 'Active Member' : 'Deactivated'}
                          </span>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.825rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {c.createdAt
                            ? new Date(c.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>

                        <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.78rem',
                              borderRadius: 7,
                              border: c.isActive ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                              color: c.isActive ? '#EF4444' : '#10B981',
                              backgroundColor: 'transparent',
                              cursor: 'pointer',
                              transition: 'all 0.18s ease',
                            }}
                            onClick={() => handleToggleStatus(c)}
                            disabled={togglingId === c.id}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = c.isActive
                                ? 'rgba(239, 68, 68, 0.12)'
                                : 'rgba(16, 185, 129, 0.12)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            {togglingId === c.id ? '…' : c.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
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

        {/* Selected Customer Dossier Sidebar */}
        {selectedCustomer && (
          <div
            className="card"
            style={{
              padding: '1.75rem',
              position: 'sticky',
              top: '1.5rem',
              backgroundColor: '#1E2225',
              border: '1px solid var(--border-color)',
              borderTop: '3px solid var(--accent-primary)',
              borderRadius: 12,
              boxShadow: '0 12px 35px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-primary)', fontWeight: 700 }}>
                  Client Dossier
                </span>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                  Profile Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  color: 'var(--text-secondary)',
                }}
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="loader" style={{ margin: '0 auto' }} />
              </div>
            ) : (
              <>
                {/* Monogram Avatar & Primary Info */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(214, 180, 106, 0.3) 0%, rgba(214, 180, 106, 0.08) 100%)',
                      border: '2px solid var(--accent-primary)',
                      color: 'var(--accent-primary)',
                      fontSize: '1.6rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.75rem',
                      boxShadow: '0 4px 16px rgba(214, 180, 106, 0.2)',
                    }}
                  >
                    {(selectedCustomer.name || selectedCustomer.username || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                    {selectedCustomer.name || selectedCustomer.username}
                  </div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    {selectedCustomer.email}
                  </div>
                </div>

                {/* Profile Data Points */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { label: 'Client Identifier', val: `#${selectedCustomer.id}` },
                    { label: 'Phone Number', val: selectedCustomer.phone || '—' },
                    { label: 'Delivery Address', val: selectedCustomer.address || '—' },
                    { label: 'Account Standing', val: selectedCustomer.isActive ? 'Active' : 'Inactive' },
                    {
                      label: 'Client Since',
                      val: selectedCustomer.createdAt
                        ? new Date(selectedCustomer.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—',
                    },
                    { label: 'Lifetime Orders', val: selectedCustomer.orderCount ?? '0' },
                    {
                      label: 'Cumulative Spend',
                      val: selectedCustomer.totalSpent
                        ? `PKR ${Number(selectedCustomer.totalSpent).toLocaleString()}`
                        : 'PKR 0',
                    },
                  ].map(({ label, val }) => (
                    <div
                      key={label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0',
                        borderBottom: '1px solid rgba(58, 61, 63, 0.6)',
                        fontSize: '0.825rem',
                      }}
                    >
                      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCustomers;
