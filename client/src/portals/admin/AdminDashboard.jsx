import { useState, useEffect } from 'react';
import api from '../../services/api';

const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: `4px solid ${color}` }}>
    <div style={{
      width: 52, height: 52, borderRadius: '12px',
      background: `${color}18`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.5rem', flexShrink: 0
    }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{sub}</div>}
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

  const STATUS_COLORS = {
    Pending: '#f59e0b',
    Processing: '#3b82f6',
    Shipped: '#8b5cf6',
    Delivered: '#22c55e',
    Cancelled: '#ef4444',
    'Payment Failed': '#ef4444',
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
      <div className="loader" />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.6rem' }}>Dashboard Overview</h2>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Welcome back — here's what's happening at FASHION JEWELLERS.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard icon="📦" label="Total Orders (24h)" value={stats?.orders24h ?? '—'} color="#828E84" />
        <StatCard icon="👥" label="Customers" value={stats?.totalCustomers ?? '—'} color="#3b82f6" />
        <StatCard icon="💎" label="Products" value={stats?.totalProducts ?? '—'} color="#d4af37" />
        <StatCard icon="💰" label="Revenue (1 Month)" value={`PKR ${Number(stats?.monthRevenue || 0).toLocaleString()}`} color="#22c55e" />
      </div>

      {/* Recent Orders Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Recent Orders</h3>
          <a href="/admin/orders" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>View all →</a>
        </div>
        {recentOrders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No recent orders.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                {['Order ID', 'Customer', 'Total', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order, i) => (
                <tr key={order.id || i} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, fontSize: '0.85rem' }}>#{order.orderNumber || order.id}</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}>{order.customerName || order.customerId || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}>PKR {Number(order.totalAmount || 0).toLocaleString()}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                      backgroundColor: `${STATUS_COLORS[order.status] || '#6b7280'}18`,
                      color: STATUS_COLORS[order.status] || '#6b7280'
                    }}>
                      {order.status || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
