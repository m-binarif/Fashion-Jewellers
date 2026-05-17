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
    username: '', password: '', roleId: '', increment: 0
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
      setEmployees(prev => prev.filter(e => e.id !== id));
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
      username: '', password: '', roleId: roles[0]?.id || '', increment: 0
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
      increment: emp.increment || 0
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

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    return !q || (e.name || '').toLowerCase().includes(q) || (e.email || '').toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Employee Management</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {filtered.length} registered employee{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>+ Add Employee</span>
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}><div className="loader" style={{ margin: '0 auto' }} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No employees found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  {['Employee', 'Email', 'Phone', 'Role', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr
                    key={e.id}
                    style={{
                      borderTop: '1px solid var(--border-color)',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={ev => ev.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
                    onMouseLeave={ev => ev.currentTarget.style.backgroundColor = ''}
                  >
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          backgroundColor: 'var(--accent-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0
                        }}>
                          {(e.name || '?')[0].toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{e.name || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{e.email || '—'}</td>
                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{e.phone || '—'}</td>
                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <span style={{ padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(130,142,132,0.12)', color: 'var(--accent-primary)' }}>
                        {e.role || 'Employee'}
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '0.9rem 1rem', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-outline"
                        style={{
                          padding: '0.3rem 0.7rem', fontSize: '0.75rem',
                          marginRight: '0.5rem'
                        }}
                        onClick={() => openEditModal(e)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{
                          padding: '0.3rem 0.7rem', fontSize: '0.75rem',
                          borderColor: 'var(--error-color)',
                          color: 'var(--error-color)'
                        }}
                        onClick={() => handleDelete(e.id)}
                        disabled={deletingId === e.id}
                      >
                        {deletingId === e.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', 
          alignItems: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
              {modalMode === 'add' ? 'Add New Employee' : 'Edit Employee'}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Full Name *</label>
                  <input required type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email Address *</label>
                  <input required type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Phone Number *</label>
                  <input required type="text" className="form-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>CNIC (15 digits) *</label>
                  <input required type="text" className="form-input" placeholder="e.g. 3520112345671" value={formData.cnic} onChange={e => setFormData({...formData, cnic: e.target.value})} style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Username *</label>
                  <input required type="text" className="form-input" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    Password {modalMode === 'edit' && '(leave empty to keep)'} *
                  </label>
                  <input required={modalMode === 'add'} type="password" className="form-input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Role *</label>
                  <select required className="form-input" value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})} style={{ width: '100%' }}>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name} (Rs. {Number(r.salary).toLocaleString()})</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Salary Increment (Rs.)</label>
                  <input type="number" min="0" className="form-input" value={formData.increment} onChange={e => setFormData({...formData, increment: e.target.value})} style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline" style={{ padding: '0.6rem 1.5rem' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.5rem' }}>Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmployees;
