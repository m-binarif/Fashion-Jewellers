const Footer = () => {
  return (
    <footer className="glass py-16 mt-16" style={{ borderTop: '1px solid var(--border-color)', borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }}>
      <div className="container grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 style={{ color: 'var(--accent-primary)', marginBottom: '1.5rem' }}>LUXE JEWELS</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Timeless elegance crafted for the modern individual. Discover our exclusive collection of fine jewellery.
          </p>
        </div>
        <div>
          <h4 style={{ marginBottom: '1.5rem' }}>Shop</h4>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><a href="/products?category=rings">Rings</a></li>
            <li><a href="/products?category=necklaces">Necklaces</a></li>
            <li><a href="/products?category=bracelets">Bracelets</a></li>
            <li><a href="/products?category=earrings">Earrings</a></li>
          </ul>
        </div>
        <div>
          <h4 style={{ marginBottom: '1.5rem' }}>Company</h4>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><a href="#">About Us</a></li>
            <li><a href="#">Contact</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Terms & Conditions</a></li>
          </ul>
        </div>
        <div>
          <h4 style={{ marginBottom: '1.5rem' }}>Stay Connected</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Subscribe to our newsletter for exclusive offers.
          </p>
          <div className="flex">
            <input type="email" placeholder="Email Address" className="form-input" style={{ borderRadius: '2px 0 0 2px' }} />
            <button className="btn btn-primary" style={{ borderRadius: '0 2px 2px 0' }}>Join</button>
          </div>
        </div>
      </div>
      <div className="container mt-16 pt-8 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
        &copy; {new Date().getFullYear()} Luxe Jewels. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
