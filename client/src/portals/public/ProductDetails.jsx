import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';

const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const { addToCart } = useCart();
  const [activeTab, setActiveTab] = useState('description');

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/products/${id}`);
        if (res.data.success) {
          setProduct(res.data.data);
        }
      } catch (err) {
        setError('Failed to load product details.');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loader" style={{ width: '50px', height: '50px', borderWidth: '3px', borderTopColor: 'var(--accent-primary)' }}></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <h2 style={{ color: 'var(--error-color)', fontFamily: 'var(--font-heading)' }}>{error || 'Piece not found'}</h2>
        <Link to="/products" className="btn btn-primary mt-8" style={{ textDecoration: 'none' }}>Return to Collection</Link>
      </div>
    );
  }

  const imgPath = product.imageUrl || '/uploads/ring.jpg';
  const imageUrl = imgPath.startsWith('http') ? imgPath : `http://localhost:5000${imgPath}`;
  const inStock = product.stockQuantity > 0;
  const rating = 4 + (product.id.charCodeAt(product.id.length-1) % 2) * 0.5;
  const reviewCount = (product.id.charCodeAt(0) % 50) + 1;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem' }}>
      <Link to="/products" style={{ color: 'var(--text-secondary)', marginBottom: '2rem', display: 'inline-block', textDecoration: 'none', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = 'white'} onMouseOut={(e) => e.target.style.color = 'var(--text-secondary)'}>
        &larr; Back to Collection
      </Link>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4rem', marginTop: '1rem' }}>
        
        {/* Left: Product Image */}
        <div style={{ flex: '1 1 400px', maxWidth: '600px' }}>
          <div style={{
            width: '100%',
            paddingTop: '125%', // 4:5 portrait aspect ratio
            position: 'relative',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: 'rgba(255,255,255,0.02)',
          }}>
            <img 
              src={imageUrl} 
              alt={product.name} 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }} 
            />
          </div>
        </div>

        {/* Right: Product Details */}
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2rem', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'white', fontFamily: 'var(--font-heading)', fontWeight: 500, lineHeight: 1.2 }}>
              {product.name}
            </h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              <span style={{ color: '#d4af37', letterSpacing: '2px', fontSize: '1.1rem' }}>
                {'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{reviewCount} Reviews</span>
            </div>

            <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--accent-primary)', letterSpacing: '1px' }}>
              Rs. {Number(product.price).toLocaleString()}
            </div>
            
            <div style={{ marginTop: '1rem', color: inStock ? 'var(--success-color)' : 'var(--error-color)', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
              {inStock ? 'In Stock / Ready to Ship' : 'Out of Stock'}
            </div>
          </div>

          {/* Add to Cart Section */}
          {inStock && (
            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Quantity</label>
                  <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      style={{ background: 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.8rem 1.2rem', cursor: 'pointer', fontSize: '1.2rem', transition: 'background 0.2s' }}
                      onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                      onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                    >-</button>
                    <input 
                      type="number" 
                      value={quantity}
                      readOnly
                      style={{ background: 'transparent', border: 'none', color: 'white', width: '50px', textAlign: 'center', fontSize: '1rem' }}
                    />
                    <button 
                      onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                      style={{ background: 'transparent', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.8rem 1.2rem', cursor: 'pointer', fontSize: '1.2rem', transition: 'background 0.2s' }}
                      onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                      onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                    >+</button>
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    setAddingToCart(true);
                    await addToCart(product.id, parseInt(quantity));
                    setAddingToCart(false);
                  }}
                  disabled={addingToCart}
                  style={{ 
                    flex: '1 1 200px', 
                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, #b8860b 100%)', 
                    color: 'white', 
                    border: 'none', 
                    padding: '1.1rem', 
                    borderRadius: '4px', 
                    fontSize: '1rem', 
                    fontWeight: 'bold', 
                    letterSpacing: '2px', 
                    textTransform: 'uppercase', 
                    cursor: addingToCart ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.3s, transform 0.2s',
                    opacity: addingToCart ? 0.7 : 1,
                    height: '51px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => { if(!addingToCart) e.target.style.transform = 'translateY(-2px)'; }}
                  onMouseOut={(e) => { if(!addingToCart) e.target.style.transform = 'translateY(0)'; }}
                >
                  {addingToCart ? 'Adding...' : 'Add to Cart'}
                </button>
              </div>
            </div>
          )}

          {/* Details Accordion Tabs */}
          <div>
            <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {['description', 'details', 'shipping'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                    padding: '0.5rem 0',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <div style={{ minHeight: '150px', color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem' }}>
              {activeTab === 'description' && (
                <p>{product.description || 'An exquisite piece of fine jewellery, masterfully crafted to reflect timeless elegance and unyielding perfection.'}</p>
              )}
              {activeTab === 'details' && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <li><strong style={{ color: 'white' }}>Category:</strong> {product.categoryName}</li>
                  <li><strong style={{ color: 'white' }}>Material:</strong> {product.materialName}</li>
                  <li><strong style={{ color: 'white' }}>Weight:</strong> {product.weight ? `${product.weight}g` : 'N/A'}</li>
                  <li><strong style={{ color: 'white' }}>Origin:</strong> {product.origin || 'N/A'}</li>
                </ul>
              )}
              {activeTab === 'shipping' && (
                <div>
                  <p style={{ marginBottom: '1rem' }}>We offer complimentary insured express shipping on all orders. Your luxury piece will arrive in secure, unmarked packaging to ensure complete privacy and safety during transit.</p>
                  <p>Enjoy a 30-day complimentary return policy on all unworn items returned in their original condition.</p>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
