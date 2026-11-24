import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', cnic: '',
    username: '', password: '', roleId: '', increment: 0,
  });

  const { showSuccess, showError } = useToast();

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/employees`);
      if (res.data.success) {
        setEmployees(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load employees', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.get('/admin/employees/roles');
      if (res.data.success) {
        setRoles(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load roles', err);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, [fetchEmployees, fetchRoles]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/employees/${id}`);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      showSuccess(`Employee deleted successfully!`);
    } catch (err) {
      showError('Failed to delete employee: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeletingId(null);
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setSelectedId(null);
    setFormData({
      name: '', email: '', phone: '', cnic: '',
      username: '', password: '', roleId: roles[0]?.id || '', increment: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (emp) => {
    setModalMode('edit');
    setSelectedId(emp.id);
    setFormData({
      name: emp.name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      cnic: emp.cnic || '',
      username: emp.username || '',
      password: '', // leave empty to not change password
      roleId: emp.roleId || '',
      increment: emp.increment || 0,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        const res = await api.post('/admin/employees', formData);
        if (res.data.success) {
          showSuccess('Employee added successfully!');
          fetchEmployees();
          setIsModalOpen(false);
        }
      } else {
        const res = await api.patch(`/admin/employees/${selectedId}`, formData);
        if (res.data.success) {
          showSuccess('Employee updated successfully!');
          fetchEmployees();
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      showError('Operation failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return !q || (e.name || '').toLowerCase().includes(q) || (e.email || '').toLowerCase().includes(q);
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
            Human Capital &amp; Credentials
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
            Staff &amp; Employee Management
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {filtered.length} authorized staff account{filtered.length !== 1 ? 's' : ''} across boutique departments
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="btn btn-primary"
          style={{
            padding: '0.7rem 1.35rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>✦</span>
          <span>Add Employee</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '380px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search employees by name or email…"
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
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading staff records...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>💼</div>
            <div style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>No employees found.</div>
            <div style={{ fontSize: '0.85rem' }}>Adjust your search query.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  {['Employee', 'Email Address', 'Contact Phone', 'Department Role', 'Joined', 'Actions'].map((h) => (
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
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background-color 0.15s ease',
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
                          {(e.name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                            {e.name || '—'}
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            @{e.username || `emp_${e.id}`}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {e.email || '—'}
                    </td>

                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {e.phone || '—'}
                    </td>

                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: 20,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: 'rgba(214, 180, 106, 0.12)',
                          color: 'var(--accent-primary)',
                          border: '1px solid rgba(214, 180, 106, 0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
                        {e.role || 'Employee'}
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.825rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {e.createdAt
                        ? new Date(e.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>

                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-outline"
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.78rem',
                          }}
                          onClick={() => openEditModal(e)}
                        >
                          Edit
                        </button>
                        <button
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.78rem',
                            borderRadius: 8,
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#EF4444',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                          }}
                          onClick={() => handleDelete(e.id)}
                          disabled={deletingId === e.id}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {deletingId === e.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Luxury Add / Edit Employee Modal */}
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
              maxWidth: '640px',
              backgroundColor: '#1E2225',
              border: '1px solid #3A3D3F',
              borderTop: '3px solid var(--accent-primary)',
              borderRadius: 14,
              padding: '2.25rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(214, 180, 106, 0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-primary)', fontWeight: 700 }}>
                  Staff Registry
                </span>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.3rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                  {modalMode === 'add' ? 'Enroll New Employee' : 'Edit Employee Dossier'}
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

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="form-label">Full Legal Name *</label>
                  <input
                    required
                    type="text"
                    className="form-input"
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Corporate Email Address *</label>
                  <input
                    required
                    type="email"
                    className="form-input"
                    placeholder="e.g. john@fashionjewellers.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="form-label">Mobile Phone *</label>
                  <input
                    required
                    type="text"
                    className="form-input"
                    placeholder="e.g. +92 300 1234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">CNIC Identity *</label>
                  <input
                    required
                    type="text"
                    className="form-input"
                    placeholder="e.g. 42101-1234567-1"
                    value={formData.cnic}
                    onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="form-label">Unique Portal Username *</label>
                  <input
                    required
                    type="text"
                    className="form-input"
                    placeholder="e.g. jdoe"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">
                    Portal Password {modalMode === 'edit' && '(leave blank to keep current)'} *
                  </label>
                  <input
                    required={modalMode === 'add'}
                    type="password"
                    className="form-input"
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="form-label">Assigned Role Designation *</label>
                  <select
                    required
                    className="form-input"
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (PKR {Number(r.salary).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Salary Increment (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formData.increment}
                    onChange={(e) => setFormData({ ...formData, increment: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'add' ? '✦ Register Employee' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmployees;
