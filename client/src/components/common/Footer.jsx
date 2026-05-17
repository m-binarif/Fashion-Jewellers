const Footer = () => {
  return (
    <footer className="glass mt-16" style={{ borderTop: '1px solid var(--border-color)', borderBottom: 'none', borderLeft: 'none', borderRight: 'none', paddingTop: '4rem', paddingBottom: '0.5rem' }}>
      <div className="container grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 style={{ color: 'var(--accent-primary)', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>FASHION JEWELLERS</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Timeless elegance crafted for the modern individual. Discover our exclusive collection of fine jewellery.
          </p>
        </div>
        <div>
          <h4 style={{ marginBottom: '1.5rem' }}>Shop</h4>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><a href="/products?category=Sets">Sets</a></li>
            <li><a href="/products?category=Earrings">Earrings</a></li>
            <li><a href="/products?category=Bracelets">Bracelets</a></li>
            <li><a href="/products?category=Rings">Rings</a></li>
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
      <div className="container text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2.5rem', paddingTop: '1.5rem', paddingBottom: '1rem' }}>
        &copy; {new Date().getFullYear()} FASHION JEWELLERS. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
