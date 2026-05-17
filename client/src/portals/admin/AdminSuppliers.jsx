import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const InfoRow = ({ label, val }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.55rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ fontWeight: 500 }}>{val ?? '—'}</span>
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
    name: '', email: '', phone: '', type: 'Supplier', isActive: true
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

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

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
      isActive: supplier.isActive !== false
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
          setSuppliers(suppliers.map(s => s.id === selectedId ? { ...s, ...res.data.data } : s));
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
      setSuppliers(suppliers.map(s => s.id === supplier.id ? { ...s, isActive: newStatus } : s));
      if (selectedSupplier?.id === supplier.id) {
        setSelectedSupplier({ ...selectedSupplier, isActive: newStatus });
      }
    } catch (err) {
      alert(`Failed to ${action} supplier: ` + (err.response?.data?.message || err.message));
    }
  };

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase();
    return !q
      || (s.name || '').toLowerCase().includes(q)
      || (s.email || '').toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0 }}>Supplier Management</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage registered suppliers and their details.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={openAddModal}
          style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
        >
          + Add Supplier
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search suppliers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedSupplier ? '1fr 340px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Supplier cards */}
        <div>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}><div className="loader" style={{ margin: '0 auto' }} /></div>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No suppliers found.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {filtered.map(s => {
                const id = s.id;
                const name = s.name || `Supplier #${id}`;
                const isSelected = selectedSupplier?.id === s.id;
                return (
                  <div
                    key={id}
                    className="card"
                    style={{
                      padding: '1.25rem',
                      cursor: 'pointer',
                      borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-color)',
                      borderWidth: isSelected ? 2 : 1,
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      opacity: s.isActive === false ? 0.6 : 1
                    }}
                    onClick={() => handleSelectSupplier(s)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        backgroundColor: s.isActive === false ? '#999' : 'var(--accent-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '1rem', fontWeight: 700, flexShrink: 0
                      }}>
                        {name[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.email || '—'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ padding: '0.2rem 0.55rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, backgroundColor: 'rgba(130,142,132,0.12)', color: 'var(--accent-primary)' }}>
                        {s.type || 'Supplier'}
                      </span>
                      {s.phone && (
                        <span style={{ padding: '0.2rem 0.55rem', borderRadius: '20px', fontSize: '0.72rem', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
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

        {/* Detail Panel */}
        {selectedSupplier && (
          <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Supplier Details</h3>
              <button onClick={() => setSelectedSupplier(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>✕</button>
            </div>

            {/* Avatar */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                backgroundColor: selectedSupplier.isActive === false ? '#999' : 'var(--accent-primary)', color: '#fff',
                fontSize: '1.4rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.6rem'
              }}>
                {(selectedSupplier.name || 'S')[0].toUpperCase()}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedSupplier.name || '—'}</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{selectedSupplier.email}</div>
            </div>

            <InfoRow label="ID" val={selectedSupplier.id} />
            <InfoRow label="Phone" val={selectedSupplier.phone} />
            <InfoRow label="Type" val={selectedSupplier.type} />
            <InfoRow label="Status" val={selectedSupplier.isActive ? 'Active' : 'Inactive'} />

            {/* Actions */}
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => openEditModal(selectedSupplier)}
                style={{ width: '100%', backgroundColor: 'var(--accent-primary)', color: '#fff' }}
              >
                Edit Details
              </button>
              <button 
                className="btn btn-outline" 
                onClick={() => handleToggleStatus(selectedSupplier)}
                style={{ 
                  width: '100%', 
                  color: selectedSupplier.isActive ? 'var(--error-color)' : 'var(--success-color)', 
                  borderColor: selectedSupplier.isActive ? 'var(--error-color)' : 'var(--success-color)' 
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
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: 440, padding: '2rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
              {modalMode === 'add' ? 'Add New Supplier' : 'Edit Supplier'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Full Name *</label>
                <input required className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Email *</label>
                <input required type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Phone Number</label>
                <input className="form-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Supplier Type</label>
                <select className="form-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Wholesaler">Wholesaler</option>
                  <option value="Importer">Importer</option>
                  <option value="Supplier">Other</option>
                </select>
              </div>
              {modalMode === 'edit' && (
                <div className="form-group" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                  <label htmlFor="isActive" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>Active Status</label>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}>
                  {modalMode === 'add' ? 'Create Supplier' : 'Save Supplier'}
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
