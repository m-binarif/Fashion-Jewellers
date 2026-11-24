import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('theme-dashboard');
    return () => {
      document.body.classList.remove('theme-dashboard');
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/admin');
    } else {
      setError(result.message);
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#151719',
        backgroundImage: 'radial-gradient(ellipse at 80% 20%, rgba(214, 180, 106, 0.08) 0%, transparent 60%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '920px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          backgroundColor: '#1E2225',
          border: '1px solid #3A3D3F',
          borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(214, 180, 106, 0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Left Column: Brand Showcase */}
        <div
          style={{
            padding: '3rem 2.5rem',
            background: 'linear-gradient(145deg, #1A1D20 0%, #151719 100%)',
            borderRight: '1px solid #3A3D3F',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          {/* Subtle Ambient Gold Glow */}
          <div
            style={{
              position: 'absolute',
              top: '-15%',
              left: '-15%',
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(214, 180, 106, 0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #D6B46A 0%, #B8964C 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                color: '#151719',
                boxShadow: '0 8px 20px rgba(214, 180, 106, 0.35)',
                marginBottom: '1.75rem',
              }}
            >
              💎
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.75rem',
                fontWeight: 700,
                color: '#D6B46A',
                letterSpacing: '0.06em',
                lineHeight: 1.2,
                marginBottom: '0.5rem',
              }}
            >
              FASHION JEWELLERS
            </h1>
            <p
              style={{
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#A5A8A8',
                marginBottom: '2rem',
              }}
            >
              Haute Joaillerie &bull; Admin Portal
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ color: '#D6B46A', fontSize: '1rem' }}>✦</span>
                <div>
                  <div style={{ color: '#F5F0E6', fontSize: '0.85rem', fontWeight: 600 }}>Master Inventory Controls</div>
                  <div style={{ color: '#A5A8A8', fontSize: '0.75rem' }}>Full product lifecycle & Cloudinary asset sync</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ color: '#D6B46A', fontSize: '1rem' }}>✦</span>
                <div>
                  <div style={{ color: '#F5F0E6', fontSize: '0.85rem', fontWeight: 600 }}>Financial & Sales Analytics</div>
                  <div style={{ color: '#A5A8A8', fontSize: '0.75rem' }}>Database-driven revenue trends & reporting</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ color: '#D6B46A', fontSize: '1rem' }}>✦</span>
                <div>
                  <div style={{ color: '#F5F0E6', fontSize: '0.85rem', fontWeight: 600 }}>Social Automation Orchestration</div>
                  <div style={{ color: '#A5A8A8', fontSize: '0.75rem' }}>Local n8n webhook publishing & approval tracking</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #2C3034' }}>
            <div style={{ fontSize: '0.75rem', color: '#737779' }}>
              Authorized Administrative Access Only &bull; TLS Secured
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Form */}
        <div style={{ padding: '3rem 2.5rem', backgroundColor: '#252A2D', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '2rem' }}>
            <span
              style={{
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontWeight: 700,
                color: '#D6B46A',
                backgroundColor: 'rgba(214, 180, 106, 0.12)',
                padding: '0.3rem 0.65rem',
                borderRadius: 20,
                border: '1px solid rgba(214, 180, 106, 0.25)',
              }}
            >
              System Administrator
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.5rem',
                color: '#F5F0E6',
                marginTop: '0.85rem',
                marginBottom: '0.35rem',
              }}
            >
              Sign In to Console
            </h2>
            <p style={{ color: '#A5A8A8', fontSize: '0.85rem', margin: 0 }}>
              Enter your master administrative credentials to proceed.
            </p>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderLeft: '4px solid #EF4444',
                padding: '0.85rem 1rem',
                marginBottom: '1.5rem',
                color: '#EF4444',
                fontSize: '0.85rem',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ color: '#A5A8A8', marginBottom: '0.4rem' }}>
                Admin Email Address
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="admin@fashionjewellers.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  padding: '0.85rem 1rem',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label" style={{ color: '#A5A8A8', marginBottom: '0.4rem' }}>
                Password
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  padding: '0.85rem 1rem',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loader" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Authenticate & Enter</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: '2rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid #3A3D3F',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.8rem',
            }}
          >
            <Link to="/" style={{ color: '#A5A8A8', textDecoration: 'none' }}>
              ← Public Boutique
            </Link>
            <Link to="/employee/login" style={{ color: '#D6B46A', textDecoration: 'none', fontWeight: 500 }}>
              Employee Portal →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
