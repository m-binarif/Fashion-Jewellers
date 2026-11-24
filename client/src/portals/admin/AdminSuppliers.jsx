import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useRealtimeSync } from '../../services/realtime';

const InfoRow = ({ label, val }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.65rem 0',
      borderBottom: '1px solid rgba(58, 61, 63, 0.6)',
      fontSize: '0.825rem',
    }}
  >
    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{val ?? '—'}</span>
  </div>
);

const AdminSuppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [search, setSearch] = useState('');

  // Dual-purpose Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', type: 'Supplier', isActive: true,
  });

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/suppliers');
      if (res.data.success) {
        setSuppliers(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load suppliers', err);
      alert('Error loading suppliers: ' + (err.response?.data?.message || err.message));
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Real-time synchronization
  useRealtimeSync('suppliers:changed', useCallback(() => {
    fetchSuppliers();
  }, [fetchSuppliers]));

  const handleSelectSupplier = (supplier) => {
    if (selectedSupplier?.id === supplier.id) {
      setSelectedSupplier(null);
      return;
    }
    setSelectedSupplier(supplier);
  };

  const openAddModal = () => {
    setModalMode('add');
    setSelectedId(null);
    setFormData({ name: '', email: '', phone: '', type: 'Supplier', isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (supplier) => {
    setModalMode('edit');
    setSelectedId(supplier.id);
    setFormData({
      name: supplier.name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      type: supplier.type || 'Supplier',
      isActive: supplier.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        const res = await api.post('/admin/suppliers', formData);
        if (res.data.success) {
          setSuppliers([res.data.data, ...suppliers]);
          setIsModalOpen(false);
        }
      } else {
        const res = await api.put(`/admin/suppliers/${selectedId}`, formData);
        if (res.data.success) {
          setSuppliers(suppliers.map((s) => (s.id === selectedId ? { ...s, ...res.data.data } : s)));
          if (selectedSupplier?.id === selectedId) {
            setSelectedSupplier({ ...selectedSupplier, ...res.data.data });
          }
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      alert('Operation failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleStatus = async (supplier) => {
    const action = supplier.isActive ? 'deactivate' : 'activate';
    const newStatus = !supplier.isActive;
    try {
      await api.patch(`/admin/suppliers/${supplier.id}/status`, { isActive: newStatus });
      setSuppliers(suppliers.map((s) => (s.id === supplier.id ? { ...s, isActive: newStatus } : s)));
      if (selectedSupplier?.id === supplier.id) {
        setSelectedSupplier({ ...selectedSupplier, isActive: newStatus });
      }
    } catch (err) {
      alert(`Failed to ${action} supplier: ` + (err.response?.data?.message || err.message));
    }
  };

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    return !q || (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
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
            Supply Chain &amp; Procurement
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
            Supplier Data &amp; Partners
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {suppliers.length} verified jewellery artisans and gemstone wholesalers
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={openAddModal}
          style={{
            padding: '0.7rem 1.35rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>✦</span>
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '380px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search suppliers by name or email…"
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
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedSupplier ? '1fr 360px' : '1fr',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Supplier Cards Grid */}
        <div>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <div className="loader" style={{ margin: '0 auto 1rem' }} />
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading suppliers...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="card"
              style={{
                padding: '4rem',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-card)',
                borderRadius: 12,
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>🏭</div>
              <div style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>No suppliers found.</div>
              <div style={{ fontSize: '0.85rem' }}>Adjust your search filter.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {filtered.map((s) => {
                const id = s.id;
                const name = s.name || `Supplier #${id}`;
                const isSelected = selectedSupplier?.id === s.id;

                return (
                  <div
                    key={id}
                    className="card"
                    style={{
                      padding: '1.4rem',
                      cursor: 'pointer',
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: 12,
                      border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      boxShadow: isSelected
                        ? '0 8px 25px rgba(214, 180, 106, 0.15)'
                        : '0 6px 18px rgba(0, 0, 0, 0.25)',
                      transition: 'all 0.2s ease',
                      opacity: s.isActive === false ? 0.6 : 1,
                    }}
                    onClick={() => handleSelectSupplier(s)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1rem' }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background:
                            s.isActive === false
                              ? 'rgba(165, 168, 168, 0.15)'
                              : 'linear-gradient(135deg, rgba(214, 180, 106, 0.25) 0%, rgba(214, 180, 106, 0.05) 100%)',
                          border: `1.5px solid ${s.isActive === false ? '#737779' : 'var(--accent-primary)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: s.isActive === false ? '#A5A8A8' : 'var(--accent-primary)',
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {name[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {name}
                        </div>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {s.email || '—'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '20px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          backgroundColor: 'rgba(214, 180, 106, 0.12)',
                          color: 'var(--accent-primary)',
                          border: '1px solid rgba(214, 180, 106, 0.25)',
                        }}
                      >
                        {s.type || 'Supplier'}
                      </span>
                      {s.phone && (
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '20px',
                            fontSize: '0.72rem',
                            backgroundColor: '#1E2225',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          📞 {s.phone}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Supplier Dossier Drawer */}
        {selectedSupplier && (
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
                  Supplier Dossier
                </span>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                  Partner Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedSupplier(null)}
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

            {/* Avatar & Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background:
                    selectedSupplier.isActive === false
                      ? 'rgba(165, 168, 168, 0.15)'
                      : 'linear-gradient(135deg, rgba(214, 180, 106, 0.3) 0%, rgba(214, 180, 106, 0.08) 100%)',
                  border: `2px solid ${selectedSupplier.isActive === false ? '#737779' : 'var(--accent-primary)'}`,
                  color: selectedSupplier.isActive === false ? '#A5A8A8' : 'var(--accent-primary)',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.65rem',
                  boxShadow: '0 4px 16px rgba(214, 180, 106, 0.2)',
                }}
              >
                {(selectedSupplier.name || 'S')[0].toUpperCase()}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                {selectedSupplier.name || '—'}
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                {selectedSupplier.email}
              </div>
            </div>

            <InfoRow label="Supplier ID" val={`#${selectedSupplier.id}`} />
            <InfoRow label="Contact Phone" val={selectedSupplier.phone} />
            <InfoRow label="Business Category" val={selectedSupplier.type} />
            <InfoRow label="Operating Status" val={selectedSupplier.isActive ? 'Active' : 'Inactive'} />

            {/* Actions */}
            <div style={{ marginTop: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => openEditModal(selectedSupplier)}
                style={{ width: '100%' }}
              >
                Edit Specifications
              </button>
              <button
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  fontSize: '0.825rem',
                  borderRadius: 8,
                  border: selectedSupplier.isActive ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                  color: selectedSupplier.isActive ? '#EF4444' : '#10B981',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
                onClick={() => handleToggleStatus(selectedSupplier)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = selectedSupplier.isActive
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(16, 185, 129, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {selectedSupplier.isActive ? 'Deactivate Supplier' : 'Activate Supplier'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Supplier Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#1E2225',
              border: '1px solid #3A3D3F',
              borderTop: '3px solid var(--accent-primary)',
              borderRadius: 14,
              padding: '2rem',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(214, 180, 106, 0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-primary)', fontWeight: 700 }}>
                  Supplier Directory
                </span>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.25rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                  {modalMode === 'add' ? 'Add New Supplier' : 'Edit Supplier Record'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1.1rem' }}>
                <label className="form-label">Full Name / Company *</label>
                <input
                  required
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.1rem' }}>
                <label className="form-label">Email Address *</label>
                <input
                  required
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.1rem' }}>
                <label className="form-label">Contact Phone</label>
                <input
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Supplier Category</label>
                <select
                  className="form-input"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Wholesaler">Wholesaler</option>
                  <option value="Importer">Importer</option>
                  <option value="Supplier">Artisan / Other</option>
                </select>
              </div>

              {modalMode === 'edit' && (
                <div className="form-group" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ accentColor: 'var(--accent-primary)', width: 16, height: 16 }}
                  />
                  <label htmlFor="isActive" style={{ cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    Active Supplier Status
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'add' ? '✦ Create Supplier' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSuppliers;
