import { useEffect, useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { path: '/admin',           label: 'Dashboard',         icon: '▦', exact: true },
  { path: '/admin/products',  label: 'Products & Inventory', icon: '💎' },
  { path: '/admin/orders',    label: 'Order Management',  icon: '📦' },
  { path: '/admin/customers', label: 'Customers',         icon: '👥' },
  { path: '/admin/suppliers', label: 'Supplier Data',     icon: '🏭' },
  { path: '/admin/employees', label: 'Employees',         icon: '💼' },
];

const DashboardLayout = ({ allowedRoles }) => {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('theme-dashboard');
    return () => { document.body.classList.remove('theme-dashboard'); };
  }, []);

  const currentNav = NAV_ITEMS.find(item =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  );
  const pageTitle = currentNav?.label || (user?.role === 'employee' ? 'Employee Portal' : 'Admin Portal');

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-tertiary)' }}>
        <div className="loader" />
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    const lastRole = sessionStorage.getItem('last_role');
    if (lastRole === 'employee') {
      return <Navigate to="/employee/login" replace />;
    }
    return <Navigate to="/admin/login" replace />;
  }

  if (user?.role === 'employee' && location.pathname === '/admin') {
    return <Navigate to="/admin/products" replace />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 40, display: 'none' }}
          className="mobile-overlay"
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 260,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        height: '100vh',
        overflowY: 'auto',
      }}>
        {/* Brand */}
        <div style={{ padding: '1.5rem 1.25rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              backgroundColor: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', color: '#fff', fontWeight: 700, flexShrink: 0
            }}>💎</div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--accent-primary)' }}>Luxe Jewels</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {user?.role === 'employee' ? 'Employee Portal' : 'Admin Portal'}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem' }}>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-secondary)', padding: '0 0.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>
            Navigation
          </div>
          {NAV_ITEMS.filter(item => {
            if (user?.role === 'employee' && (item.path === '/admin/customers' || item.path === '/admin/employees' || item.path === '/admin')) {
              return false;
            }
            return true;
          }).map(item => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 8,
                  marginBottom: '0.25rem',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'rgba(130,142,132,0.12)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                  transition: 'all 0.15s',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
              >
                <span style={{ fontSize: '1rem', width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '1rem 0.75rem 1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: '0.75rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              backgroundColor: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0
            }}>
              {(user.name || 'A')[0].toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'capitalize' }}>{user.role}</div>
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid var(--border-color)',
              backgroundColor: 'transparent', color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
          >
            <span>⎋</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          height: 64, flexShrink: 0,
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', padding: '0 2rem',
          justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{pageTitle}</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              padding: '0.35rem 0.75rem', borderRadius: 20,
              backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e',
              fontSize: '0.75rem', fontWeight: 600
            }}>
              ● Live
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
