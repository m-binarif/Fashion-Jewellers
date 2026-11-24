/**
 * AdminLayout.jsx — Dedicated Admin Portal Dashboard Layout.
 * Strictly guarded for Admin users with independent state and navigation.
 * Redesigned with Luxury Jewellery Dark Theme: Deep Charcoal, Dark Graphite,
 * Champagne Gold accents, and Warm Ivory typography.
 */

import { useEffect, useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

const ADMIN_NAV_ITEMS = [
  { path: '/admin',                   label: 'Dashboard',            icon: '▦', exact: true },
  { path: '/admin/products',          label: 'Products & Inventory', icon: '💎' },
  { path: '/admin/products-posting',  label: 'Products Posting',     icon: '📸' },
  { path: '/admin/post-confirmation', label: 'Post Confirmation',    icon: '📱' },
  { path: '/admin/competitor-trends', label: 'Competitor Analysis',  icon: '🔍' },
  { path: '/admin/sales-report',      label: 'Sales Report',         icon: '📊' },
  { path: '/admin/orders',            label: 'Order Management',     icon: '📦' },
  { path: '/admin/customers',         label: 'Customers',            icon: '👥' },
  { path: '/admin/suppliers',         label: 'Supplier Data',        icon: '🏭' },
  { path: '/admin/employees',         label: 'Employees',            icon: '💼' },
];

const AdminLayout = () => {
  const { admin, loading, logout } = useAdminAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('theme-dashboard');
    return () => {
      document.body.classList.remove('theme-dashboard');
    };
  }, []);

  const currentNav = ADMIN_NAV_ITEMS.find((item) =>
    item.exact
      ? location.pathname === item.path
      : location.pathname === item.path || location.pathname.startsWith(item.path + '/')
  );
  const pageTitle = currentNav?.label || 'Admin Portal';

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <div className="loader" />
      </div>
    );
  }

  // Route protection: strictly require authenticated admin
  if (!admin || admin.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
          }}
          className="md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: 270,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          height: '100vh',
          overflowY: 'auto',
          zIndex: 50,
          transition: 'transform 0.3s ease',
        }}
        className={sidebarOpen ? 'fixed left-0 top-0 bottom-0' : 'hidden md:flex'}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '1.5rem 1.25rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            background: 'linear-gradient(180deg, rgba(214, 180, 106, 0.06) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #D6B46A 0%, #B8964C 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.15rem',
                color: '#151719',
                boxShadow: '0 4px 12px rgba(214, 180, 106, 0.3)',
                flexShrink: 0,
              }}
            >
              💎
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: 'var(--accent-primary)',
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                FASHION JEWELLERS
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  marginTop: '0.15rem',
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
                Admin Portal
              </div>
            </div>
            {/* Mobile close toggle */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '1.25rem',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem' }}>
          <div
            style={{
              fontSize: '0.68rem',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              padding: '0 0.6rem',
              marginBottom: '0.6rem',
              fontWeight: 700,
            }}
          >
            Management
          </div>
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname === item.path || location.pathname.startsWith(item.path + '/');

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.7rem 0.85rem',
                  borderRadius: 8,
                  marginBottom: '0.25rem',
                  fontSize: '0.865rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'rgba(214, 180, 106, 0.12)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                  boxShadow: isActive ? 'inset 0 0 12px rgba(214, 180, 106, 0.05)' : 'none',
                  transition: 'all 0.18s ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-card)';
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
                <span
                  style={{
                    fontSize: '1.05rem',
                    width: 22,
                    textAlign: 'center',
                    flexShrink: 0,
                    filter: isActive ? 'drop-shadow(0 0 4px rgba(214, 180, 106, 0.6))' : 'none',
                  }}
                >
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-primary)',
                      boxShadow: '0 0 6px var(--accent-primary)',
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Card & Logout */}
        <div
          style={{
            padding: '1rem 0.85rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.25) 0%, transparent 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 0.85rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 10,
              marginBottom: '0.75rem',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
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
              {(admin.name || 'A')[0].toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {admin.name}
              </div>
              <div
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--accent-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                }}
              >
                System Administrator
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '0.65rem',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.825rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
              e.currentTarget.style.color = '#EF4444';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <span>⎋</span> Terminate Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top Header */}
        <header
          style={{
            height: 68,
            flexShrink: 0,
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1.75rem',
            justifyContent: 'space-between',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                padding: '0.4rem 0.65rem',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              ☰
            </button>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  fontFamily: 'var(--font-heading)',
                  letterSpacing: '0.04em',
                  color: 'var(--text-primary)',
                }}
              >
                {pageTitle}
              </h2>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  marginTop: '0.15rem',
                  letterSpacing: '0.02em',
                }}
              >
                {new Date().toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Live System Status Pill */}
            <div
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 20,
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10B981',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 8px #10B981',
                }}
              />
              System Live
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
