import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
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

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

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

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    return !q || (e.name || '').toLowerCase().includes(q) || (e.email || '').toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ margin: 0 }}>Employee Management</h2>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {filtered.length} registered employee{filtered.length !== 1 ? 's' : ''}
        </p>
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
    </div>
  );
};

export default AdminEmployees;
