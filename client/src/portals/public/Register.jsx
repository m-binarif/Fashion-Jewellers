import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: '',
    address: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/register', {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        country: formData.country,
        address: formData.address,
        password: formData.password
      });

      if (response.data.success) {
        navigate('/login', { state: { message: 'Registration successful! Please login.' } });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-16 flex justify-center items-center">
      <div className="glass p-8" style={{ width: '100%', maxWidth: '600px', borderRadius: '4px' }}>
        <h2 className="text-center mb-2" style={{ color: 'var(--accent-primary)' }}>Create Account</h2>
        <p className="text-center mb-8" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Join Luxe Jewels to start your timeless journey
        </p>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--error-color)', padding: '1rem', marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <div className="form-group md:col-span-2">
            <label className="form-label">Full Name</label>
            <input type="text" name="fullName" className="form-input" value={formData.fullName} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" name="email" className="form-input" value={formData.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input type="tel" name="phone" className="form-input" value={formData.phone} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Country</label>
            <input type="text" name="country" className="form-input" value={formData.country} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Full Address</label>
            <input type="text" name="address" className="form-input" value={formData.address} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" name="password" className="form-input" value={formData.password} onChange={handleChange} required minLength="6" />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input type="password" name="confirmPassword" className="form-input" value={formData.confirmPassword} onChange={handleChange} required />
          </div>

          <div className="md:col-span-2">
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Register'}
            </button>
          </div>
        </form>

        <div className="text-center mt-6" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" style={{ fontWeight: '600' }}>Sign in here</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
