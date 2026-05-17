import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password, 'customer');
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-16 flex justify-center items-center min-h-[70vh]">
      <div className="glass p-8" style={{ width: '100%', maxWidth: '450px', borderRadius: '4px' }}>
        <h2 className="text-center mb-2" style={{ color: 'var(--accent-primary)' }}>Welcome Back</h2>
        <p className="text-center mb-8" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Sign in to your FASHION JEWELLERS account
        </p>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--error-color)', padding: '1rem', marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
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
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={isLoading}
          >
            {isLoading ? <span className="loader" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span> : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-6" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Don't have an account? <Link to="/register" style={{ fontWeight: '600' }}>Register here</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
