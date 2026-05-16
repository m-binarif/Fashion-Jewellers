import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
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

    const result = await login(email, password, 'admin');
    
    if (result.success) {
      navigate('/admin');
    } else {
      setError(result.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-bg-tertiary">
      <div className="card p-8 shadow-lg" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-secondary)' }}>
        <h2 className="text-center mb-2" style={{ color: 'var(--text-primary)' }}>Admin Portal</h2>
        <p className="text-center mb-8" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Restricted access for authorized personnel.
        </p>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--error-color)', padding: '1rem', marginBottom: '1.5rem', color: 'var(--error-color)', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Employee Email</label>
            <input 
              type="email" 
              className="form-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Password</label>
            <input 
              type="password" 
              className="form-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem', backgroundColor: 'var(--accent-primary)', color: '#fff' }}
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
