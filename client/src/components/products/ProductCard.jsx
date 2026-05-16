import { Link } from 'react-router-dom';

const ProductCard = ({ product }) => {
  // Use product.imageUrl from API, fallback to ring.jpg placeholder
  const imgPath = product.imageUrl || '/uploads/ring.jpg';
  const imageUrl = imgPath.startsWith('http') ? imgPath : `http://localhost:5000${imgPath}`;
  
  // Deterministic random rating/reviews for visual effect to match design
  const rating = 4 + (product.id.charCodeAt(product.id.length-1) % 2) * 0.5;
  const reviewCount = (product.id.charCodeAt(0) % 50) + 1;

  return (
    <Link to={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }} className="product-card-premium">
      <div style={{
        position: 'relative',
        width: '100%',
        paddingTop: '133%', // 3:4 portrait aspect ratio to match reference
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '0.75rem',
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
            objectFit: 'cover',
            transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          className="product-img"
        />
      </div>
      
      <div style={{ textAlign: 'left', padding: '0 0.2rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
          {product.name}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.2rem', fontSize: '0.65rem' }}>
          <span style={{ color: '#d4af37', letterSpacing: '1px', fontSize: '0.75rem' }}>
            {'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>{reviewCount} reviews</span>
        </div>
        <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          Rs. {Number(product.price).toLocaleString()}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
