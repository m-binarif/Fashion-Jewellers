import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cartItemCount } = useCart();

  return (
    <nav className="glass" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="container flex justify-between items-center py-4">
        <Link to="/" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
          LUXE JEWELS
        </Link>
        <ul className="flex gap-8 items-center">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/products">Catalogue</Link></li>
          {user ? (
            <>
              <li style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', marginRight: '0.5rem', fontWeight: 600 }}>
                Welcome, {user.name}
              </li>
              <li><Link to="/me">Profile</Link></li>
              <li><button onClick={logout} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Logout</button></li>
            </>
          ) : (
            <li><Link to="/login" className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Login</Link></li>
          )}
          <li>
            <Link to="/cart" className="flex items-center gap-2">
              <span>Cart</span>
              <span style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', borderRadius: '50%', padding: '0.1rem 0.5rem', fontSize: '0.8rem', fontWeight: 'bold' }}>{cartItemCount}</span>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
