import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const Profile = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [ordersRes, profileRes] = await Promise.all([
          api.get('/orders'),
          api.get('/customers/me')
        ]);
        
        if (ordersRes.data.success) {
          setOrders(ordersRes.data.data);
        }
        if (profileRes.data.success) {
          setProfile(profileRes.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loader" style={{ width: '50px', height: '50px', borderWidth: '3px', borderTopColor: 'var(--accent-primary)' }}></div>
      </div>
    );
  }

  if (!user) return null;

  const STATUS_COLORS = {
    Pending: '#f59e0b',
    Processing: '#3b82f6',
    Shipped: '#8b5cf6',
    Delivered: '#22c55e',
    Cancelled: '#ef4444',
    'Payment Failed': '#ef4444',
  };

  const displayName = profile?.name || user.name || 'User';

  return (
    <div className="container py-12 max-w-5xl" style={{ marginTop: '2rem' }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1">
          <div className="glass p-8 rounded-2xl shadow-sm text-center sticky top-24">
            <div className="w-24 h-24 bg-gradient-to-tr from-[var(--accent-primary)] to-yellow-200 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl font-bold text-white shadow-md uppercase">
              {displayName[0]}
            </div>
            
            <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
              {displayName}
            </h1>
            <p className="text-gray-500 mb-6">{profile?.email || user.email}</p>

            {profile && (
              <div 
                className="text-left bg-white/5 p-5 rounded-xl border border-white/10 shadow-sm"
                style={{ 
                  marginTop: '1.5rem', 
                  marginBottom: '1.5rem', 
                  maxWidth: '280px', 
                  marginLeft: 'auto', 
                  marginRight: 'auto', 
                  width: '100%' 
                }}
              >
                <div className="mb-4">
                  <span className="text-xs text-gray-500 uppercase font-bold tracking-wider" style={{ letterSpacing: '0.05em' }}>Phone</span>
                  <p className="text-gray-300 text-sm mt-1 font-medium">{profile.phone || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase font-bold tracking-wider" style={{ letterSpacing: '0.05em' }}>Address</span>
                  <p className="text-gray-300 text-sm mt-1 font-medium">{profile.address || 'Not provided'}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{profile.country}</p>
                </div>
              </div>
            )}

            <button 
              onClick={logout} 
              className="btn btn-outline border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 px-8 py-2 rounded-full w-full mb-4"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Right Column: Order History */}
        <div className="lg:col-span-2 lg:pl-8 mt-8 lg:mt-0" style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
            <span className="text-xl">📦</span> My Orders
          </h2>
          
          {loading ? (
            <div className="glass p-12 rounded-2xl shadow-sm flex justify-center">
              <div className="loader"></div>
            </div>
          ) : orders.length === 0 ? (
            <div 
              className="glass p-12 rounded-2xl shadow-sm text-center text-gray-500"
              style={{ paddingTop: '5rem', paddingBottom: '5rem' }}
            >
              <div className="text-4xl mb-4">🛍️</div>
              <p>You haven't placed any orders yet.</p>
              <button 
                onClick={() => navigate('/products')} 
                style={{
                  background: 'linear-gradient(135deg, var(--accent-primary) 0%, #b8860b 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                  marginTop: '1.5rem',
                  display: 'inline-block'
                }}
                onMouseOver={(e) => e.target.style.opacity = 0.9}
                onMouseOut={(e) => e.target.style.opacity = 1}
              >
                Start Shopping &rarr;
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="glass p-6 rounded-2xl shadow-sm transition-all hover:shadow-md border border-white/20">
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-[var(--text-primary)]">Order #{order.orderNumber || order.id}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(order.orderDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <span style={{
                      padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                      backgroundColor: `${STATUS_COLORS[order.status] || '#6b7280'}18`,
                      color: STATUS_COLORS[order.status] || '#6b7280'
                    }}>
                      {order.status || 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap justify-between items-center pt-4 border-t border-gray-100 gap-4">
                    <button 
                      onClick={() => {
                        const token = localStorage.getItem(user.role === 'admin' || user.role === 'employee' ? 'admin_token' : 'token');
                        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/orders/${order.id}/invoice?token=${token}`;
                        window.open(url, '_blank');
                      }}
                      className="text-xs font-bold text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      View & Print Invoice
                    </button>
                    <div className="flex flex-col items-end">
                      <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Total</span>
                      <span className="text-xl font-bold text-[var(--accent-primary)]">
                        PKR {Number(order.totalAmount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
