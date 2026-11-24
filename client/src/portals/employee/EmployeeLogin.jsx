import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';

const EmployeeLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useEmployeeAuth();
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

    if (result.success && result.username) {
      // Redirect dynamically to this employee's unique dashboard route
      navigate(`/employee/${result.username}/dashboard`);
    } else {
      setError(result.message || 'Login failed');
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#151719',
        backgroundImage: 'radial-gradient(ellipse at 20% 80%, rgba(214, 180, 106, 0.08) 0%, transparent 60%)',
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
        {/* Left Column: Brand & Role Guidance */}
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
          {/* Ambient Gold Glow */}
          <div
            style={{
              position: 'absolute',
              bottom: '-15%',
              right: '-15%',
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
              Staff &amp; Operations Terminal
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1.5rem' }}>
              <div
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: 'rgba(37, 42, 45, 0.7)',
                  border: '1px solid #3A3D3F',
                  borderRadius: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ color: '#D6B46A' }}>📦</span>
                  <span style={{ color: '#F5F0E6', fontSize: '0.85rem', fontWeight: 600 }}>Inventory Manager</span>
                </div>
                <div style={{ color: '#A5A8A8', fontSize: '0.75rem' }}>
                  Catalog management, stock levels &amp; sales analytics
                </div>
              </div>

              <div
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: 'rgba(37, 42, 45, 0.7)',
                  border: '1px solid #3A3D3F',
                  borderRadius: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ color: '#3B82F6' }}>💼</span>
                  <span style={{ color: '#F5F0E6', fontSize: '0.85rem', fontWeight: 600 }}>Sales Executive</span>
                </div>
                <div style={{ color: '#A5A8A8', fontSize: '0.75rem' }}>
                  Order fulfillment, customer records &amp; transaction status
                </div>
              </div>

              <div
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: 'rgba(37, 42, 45, 0.7)',
                  border: '1px solid #3A3D3F',
                  borderRadius: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ color: '#EC4899' }}>📸</span>
                  <span style={{ color: '#F5F0E6', fontSize: '0.85rem', fontWeight: 600 }}>Social Media Manager</span>
                </div>
                <div style={{ color: '#A5A8A8', fontSize: '0.75rem' }}>
                  n8n Instagram publishing, AI captions &amp; approval tracking
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #2C3034' }}>
            <div style={{ fontSize: '0.75rem', color: '#737779' }}>
              Internal Staff Portal &bull; Role-Based Dynamic Workspaces
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
              Employee Access
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
              Welcome Back
            </h2>
            <p style={{ color: '#A5A8A8', fontSize: '0.85rem', margin: 0 }}>
              Please enter your employee credentials to access your workspace.
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
                Employee Email
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="employee@fashionjewellers.com"
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
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
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
            <Link to="/admin/login" style={{ color: '#D6B46A', textDecoration: 'none', fontWeight: 500 }}>
              Admin Portal →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLogin;
