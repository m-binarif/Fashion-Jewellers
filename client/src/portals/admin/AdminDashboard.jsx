import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const StatCard = ({ icon, label, value, sub, accentColor, glowColor }) => (
  <div
    className="card"
    style={{
      padding: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1.25rem',
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderLeft: `4px solid ${accentColor}`,
      borderRadius: 12,
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    {/* Subtle Ambient Radial Highlight */}
    <div
      style={{
        position: 'absolute',
        top: '-20%',
        right: '-10%',
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${glowColor || 'rgba(214, 180, 106, 0.12)'} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }}
    />

    <div
      style={{
        width: 54,
        height: 54,
        borderRadius: 12,
        background: glowColor || `${accentColor}18`,
        border: `1px solid ${accentColor}33`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.6rem',
        flexShrink: 0,
        boxShadow: `0 4px 14px ${accentColor}20`,
      }}
    >
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-secondary)',
          fontWeight: 600,
          marginBottom: '0.35rem',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1.1,
          fontFamily: 'var(--font-body)',
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
          {sub}
        </div>
      )}
    </div>
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, ordersRes] = await Promise.allSettled([
          api.get('/admin/stats'),
          api.get('/admin/orders?pageSize=5'),
        ]);

        if (statsRes.status === 'fulfilled' && statsRes.value.data.success) {
          setStats(statsRes.value.data.data);
        }

        if (ordersRes.status === 'fulfilled' && ordersRes.value.data.success) {
          setRecentOrders(ordersRes.value.data.data.orders || []);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const STATUS_STYLES = {
    Pending: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
    Processing: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' },
    Shipped: { bg: 'rgba(168, 85, 247, 0.15)', text: '#A855F7', border: 'rgba(168, 85, 247, 0.3)' },
    Delivered: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' },
    Cancelled: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' },
    'Payment Failed': { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' },
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div className="loader" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '1rem',
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
            Executive Overview
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
            Management Dashboard
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Live performance metrics, inventory health, and recent operations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            to="/admin/products"
            className="btn btn-outline"
            style={{ padding: '0.6rem 1.1rem', fontSize: '0.825rem' }}
          >
            Manage Products
          </Link>
          <Link
            to="/admin/sales-report"
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.1rem', fontSize: '0.825rem' }}
          >
            View Sales Analytics
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <StatCard
          icon="📦"
          label="Total Orders (24h)"
          value={stats?.orders24h ?? '0'}
          sub="Recent transaction velocity"
          accentColor="#D6B46A"
          glowColor="rgba(214, 180, 106, 0.15)"
        />
        <StatCard
          icon="👥"
          label="Registered Customers"
          value={stats?.totalCustomers ?? '0'}
          sub="Active boutique clientele"
          accentColor="#3B82F6"
          glowColor="rgba(59, 130, 246, 0.15)"
        />
        <StatCard
          icon="💎"
          label="Active Jewellery Catalog"
          value={stats?.totalProducts ?? '0'}
          sub="Live products in vault"
          accentColor="#E8CC8A"
          glowColor="rgba(232, 204, 138, 0.15)"
        />
        <StatCard
          icon="💰"
          label="Monthly Revenue"
          value={`PKR ${Number(stats?.monthRevenue || 0).toLocaleString()}`}
          sub="Gross sales past 30 days"
          accentColor="#10B981"
          glowColor="rgba(16, 185, 129, 0.15)"
        />
      </div>

      {/* Recent Orders Section */}
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
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ color: 'var(--accent-primary)', fontSize: '1.1rem' }}>📦</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                Recent Client Orders
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Latest purchase orders requiring fulfillment
              </span>
            </div>
          </div>
          <Link
            to="/admin/orders"
            style={{
              fontSize: '0.85rem',
              color: 'var(--accent-primary)',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>View All Orders</span>
            <span>→</span>
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📦</div>
            <div>No orders recorded in the system yet.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  {['Order ID', 'Customer', 'Total Amount', 'Status', 'Date'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '0.85rem 1.25rem',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, i) => {
                  const s = STATUS_STYLES[order.status] || {
                    bg: 'rgba(165, 168, 168, 0.12)',
                    text: '#A5A8A8',
                    border: 'rgba(165, 168, 168, 0.25)',
                  };

                  return (
                    <tr
                      key={order.id || i}
                      style={{
                        borderTop: '1px solid var(--border-color)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '0.95rem 1.25rem', fontWeight: 600, fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--accent-primary)' }}>#</span>
                        <span style={{ color: 'var(--text-primary)' }}>{order.orderNumber || order.id}</span>
                      </td>
                      <td style={{ padding: '0.95rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        <div style={{ fontWeight: 500 }}>{order.customerName || order.customerId || '—'}</div>
                      </td>
                      <td style={{ padding: '0.95rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        PKR {Number(order.totalAmount || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.95rem 1.25rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.7rem',
                            borderRadius: 20,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: s.bg,
                            color: s.text,
                            border: `1px solid ${s.border}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: s.text }} />
                          {order.status || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '0.95rem 1.25rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                        {order.orderDate
                          ? new Date(order.orderDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
