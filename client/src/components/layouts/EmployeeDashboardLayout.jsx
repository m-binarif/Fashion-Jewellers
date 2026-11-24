/**
 * EmployeeDashboardLayout.jsx — Dedicated Employee Portal Dashboard Layout.
 * Dynamic username-based routing (/employee/:username/*) with strict ownership checks,
 * role-based navigation filtering, and dynamic employee name & designation display.
 */

import { useEffect, useState } from 'react';
import { Outlet, Navigate, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';

// Permitted navigation items for each employee role
const ROLE_NAV_PERMISSIONS = {
  'Inventory Manager':    ['products', 'sales-report', 'suppliers', 'competitor-trends'],
  'Sales Executive':      ['orders', 'customers'],
  'Social Media Manager': ['products', 'post-confirmation', 'competitor-trends'],
};

const EmployeeDashboardLayout = () => {
  const { employee, loading, logout } = useEmployeeAuth();
  const { username } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('theme-dashboard');
    return () => {
      document.body.classList.remove('theme-dashboard');
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-tertiary)',
        }}
      >
        <div className="loader" />
      </div>
    );
  }

  // 1. Authentication Check: Must be an authenticated employee
  if (!employee || employee.role !== 'employee') {
    return <Navigate to="/employee/login" replace />;
  }

  // 2. Route Ownership Check: Employee can ONLY access their own username-based route
  if (employee.username !== username) {
    return <Navigate to={`/employee/${employee.username}/dashboard`} replace />;
  }

  const roleName = employee.roleName || 'Employee';
  const allowedSections = ROLE_NAV_PERMISSIONS[roleName] || ['products'];
  const isSocialMedia = roleName === 'Social Media Manager';

  // All possible navigation items for employees
  const ALL_ITEMS = [
    {
      key: 'products',
      path: `/employee/${username}/products`,
      label: isSocialMedia ? 'Products' : 'Products & Inventory',
      icon: '💎',
    },
    {
      key: 'sales-report',
      path: `/employee/${username}/sales-report`,
      label: 'Sales Report',
      icon: '📊',
    },
    {
      key: 'post-confirmation',
      path: `/employee/${username}/post-confirmation`,
      label: 'Post Confirmation',
      icon: '📱',
    },
    {
      key: 'competitor-trends',
      path: `/employee/${username}/competitor-trends`,
      label: 'Competitor Analysis',
      icon: '🔍',
    },
    {
      key: 'orders',
      path: `/employee/${username}/orders`,
      label: 'Order Management',
      icon: '📦',
    },
    {
      key: 'suppliers',
      path: `/employee/${username}/suppliers`,
      label: 'Supplier Data',
      icon: '🏭',
    },
    {
      key: 'customers',
      path: `/employee/${username}/customers`,
      label: 'Customers',
      icon: '👥',
    },
  ];

  // Filter navigation items strictly permitted for this employee's role
  const visibleNavItems = ALL_ITEMS.filter((item) => allowedSections.includes(item.key));

  // Determine active section from URL
  const currentPath = location.pathname;
  const isDashboardRoute = currentPath === `/employee/${username}/dashboard` || currentPath === `/employee/${username}`;

  // 3. Sub-route authorization check
  if (!isDashboardRoute) {
    const isAllowed = visibleNavItems.some((item) => currentPath.startsWith(item.path));
    if (!isAllowed) {
      // Direct URL access to unauthorized section blocked — redirect to employee's dashboard
      return <Navigate to={`/employee/${username}/dashboard`} replace />;
    }
  }

  // Compute page title
  let pageTitle = 'Employee Dashboard';
  if (isDashboardRoute) {
    if (roleName === 'Sales Executive') pageTitle = 'Order Management';
    else if (roleName === 'Social Media Manager') pageTitle = 'Products';
    else if (roleName === 'Inventory Manager') pageTitle = 'Products & Inventory';
  } else {
    const currentItem = visibleNavItems.find((item) => currentPath.startsWith(item.path));
    if (currentItem) pageTitle = currentItem.label;
  }

  const handleLogout = () => {
    logout(employee.username);
    navigate('/employee/login');
  };

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
      <aside
        style={{
          width: 260,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        {/* Brand */}
        <div style={{ padding: '1.5rem 1.25rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                color: '#fff',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              💎
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: 'var(--accent-primary)',
                  letterSpacing: '0.05em',
                }}
              >
                FASHION JEWELLERS
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Employee Portal
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem' }}>
          <div
            style={{
              fontSize: '0.68rem',
              textTransform: 'uppercase',
              letterSpacing: '0.09em',
              color: 'var(--text-secondary)',
              padding: '0 0.5rem',
              marginBottom: '0.5rem',
              fontWeight: 600,
            }}
          >
            Navigation
          </div>
          {visibleNavItems.map((item) => {
            // Check if active: either exact path match OR on dashboard route matching primary role view
            const isPathActive = currentPath.startsWith(item.path);
            const isDashboardDefault =
              isDashboardRoute &&
              ((roleName === 'Sales Executive' && item.key === 'orders') ||
               (roleName !== 'Sales Executive' && item.key === 'products'));

            const isActive = isPathActive || isDashboardDefault;

            return (
              <Link
                key={item.key}
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
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <span style={{ fontSize: '1rem', width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div style={{ padding: '1rem 0.75rem 1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.65rem 0.75rem',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 8,
              marginBottom: '0.75rem',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {(employee.name || 'E')[0].toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {employee.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'capitalize' }}>
                {roleName}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <span>⎋</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header
          style={{
            height: 64,
            flexShrink: 0,
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 2rem',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{pageTitle}</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 20,
                backgroundColor: 'rgba(34,197,94,0.1)',
                color: '#22c55e',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              ● Employee Live
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboardLayout;
