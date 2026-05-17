import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getAssetUrl } from '../../services/api';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await api.get('/products/featured');
        if (res.data.success) {
          setFeaturedProducts(res.data.data.slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to fetch featured products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="home-container overflow-hidden bg-black">
      {/* Dynamic Inline Styles for Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slowZoom {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
        }
        .animate-fade-in {
          animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in-delayed {
          animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
          opacity: 0;
        }
        .hero-bg {
          animation: slowZoom 20s infinite alternate linear;
        }
        .glass-card {
          background: rgba(20, 20, 20, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 215, 0, 0.15);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .glass-card:hover {
          transform: translateY(-8px);
          border-color: rgba(255, 215, 0, 0.5);
          box-shadow: 0 16px 48px rgba(212, 175, 55, 0.2);
        }
        .category-link {
          position: relative;
          overflow: hidden;
          border-radius: 1.5rem;
          background-color: #111;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .category-link img, .category-link .bg-div {
          transition: transform 0.8s ease;
        }
        .category-link .bg-div {
          background-position: center !important;
          background-size: cover !important;
          background-repeat: no-repeat !important;
        }
        .category-link:hover img, .category-link:hover .bg-div {
          transform: scale(1.08);
        }
        .category-link .overlay {
          background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.2) 60%, transparent);
          transition: background 0.4s ease;
        }
        .category-link:hover .overlay {
          background: linear-gradient(to top, rgba(212,175,55,0.6), rgba(0,0,0,0.4) 60%, transparent);
        }
        .section-divider {
          width: 1px;
          height: 40px;
          background: linear-gradient(to bottom, transparent, var(--accent-primary), transparent);
          margin: 0 auto;
        }
        .featured-masterpieces-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 2.5rem;
        }
        @media (min-width: 768px) {
          .featured-masterpieces-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .ring-featured-card {
            grid-column-start: 1;
          }
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 hero-bg"
          style={{ 
            backgroundImage: 'url(/luxury_hero_bg_1778154920065.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%'
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
        
        <div className="container relative z-10 px-6 sm:px-12 flex justify-center text-center">
          <div className="max-w-4xl animate-fade-in flex flex-col items-center" style={{ paddingTop: '3.5rem' }}>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 text-white leading-tight drop-shadow-2xl text-center" style={{ fontFamily: 'var(--font-heading)', whiteSpace: 'nowrap' }}>
              A Legacy of <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[#fffacd]">Brilliance</span>
            </h1>
            <p className="text-lg text-gray-300 mb-10 leading-relaxed max-w-2xl animate-fade-in-delayed drop-shadow-md text-center">
              Immerse yourself in our curated collection of fine jewellery. 
              Masterpieces crafted with unparalleled precision to celebrate your most precious moments.
            </p>
            <div className="flex gap-4 justify-center animate-fade-in-delayed" style={{ animationDelay: '0.6s' }}>
              <Link to="/products" className="px-8 py-4 bg-gradient-to-r from-[var(--accent-primary)] to-[#b8860b] text-black font-bold uppercase tracking-wider text-sm rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                Explore Collection
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider my-4" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}></div>

      {/* Featured Products Section */}
      <section className="pt-4 pb-8">
        <div className="container px-6 sm:px-12">
          <div className="text-center mb-10 animate-fade-in">
            <span className="text-[var(--accent-primary)] text-xs font-bold tracking-[0.2em] uppercase">Handpicked For You</span>
            <h2 className="text-4xl font-bold mt-3 text-white" style={{ fontFamily: 'var(--font-heading)' }}>Featured Masterpieces</h2>
            <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent mx-auto mt-6"></div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="loader" style={{ width: 40, height: 40, borderWidth: 3, borderColor: 'var(--accent-primary) transparent var(--accent-primary) transparent' }}></div>
            </div>
          ) : (
            <div className="featured-masterpieces-grid">
              {featuredProducts.length > 0 ? featuredProducts.map((product, index) => {
                const isRing = index === 3;
                return (
                  <Link 
                    to={`/products/${product.id}`} 
                    key={product.id} 
                    className={`glass-card rounded-2xl overflow-hidden block group ${isRing ? 'ring-featured-card' : ''}`}
                  >
                     <div className="relative h-72 overflow-hidden bg-[#0d0d0d]">
                      <img 
                        src={getAssetUrl(product.imageUrl || '/uploads/ring.jpg')}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md px-4 py-1 rounded-full text-xs font-bold tracking-wider text-[var(--accent-primary)] border border-[var(--accent-primary)]/40 shadow-lg">
                        Featured
                      </div>
                    </div>
                    <div className="p-8">
                      <p className="text-xs text-gray-500 uppercase tracking-[0.2em] mb-3">{product.categoryName}</p>
                      <h3 className="text-xl font-bold text-white mb-4 line-clamp-2" style={{ fontFamily: 'var(--font-heading)' }}>{product.name}</h3>
                      <p className="text-[var(--accent-primary)] font-bold text-xl drop-shadow-md">Rs. {Number(product.price).toLocaleString()}</p>
                    </div>
                  </Link>
                );
              }) : (
                <div style={{ gridColumn: '1 / -1' }} className="text-center text-gray-500 py-12">No featured products currently available.</div>
              )}
            </div>
          )}
          
          <div className="text-center mt-10">
            <Link to="/products" className="inline-flex items-center gap-3 text-white hover:text-[var(--accent-primary)] transition-colors border-b-2 border-transparent hover:border-[var(--accent-primary)] pb-2 font-bold tracking-[0.1em] uppercase text-sm">
              View All Products <span className="text-xl">→</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="section-divider my-4" style={{ marginTop: '1.5rem', marginBottom: '1rem' }}></div>

      {/* Shop by Category */}
      <section className="relative" style={{ paddingTop: '2.5rem', paddingBottom: '6rem' }}>
        <div className="container px-6 sm:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Curated Collections</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Find the perfect piece to complement your unique style from our dedicated categories.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
            <Link to="/products?category=Sets" className="category-link block group" style={{ height: '400px' }}>
              <div 
                className="bg-div absolute inset-0 bg-cover bg-center" 
                style={{ backgroundImage: `url(${getAssetUrl('/uploads/the_laurel_collection_set.png')})` }}
              ></div>
              <div className="absolute inset-0 overlay"></div>
              <div className="absolute bottom-10 left-10 z-10">
                <h3 className="text-4xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Sets</h3>
                <span className="text-[var(--accent-primary)] text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                   Explore <span className="transition-transform group-hover:translate-x-3">→</span>
                </span>
              </div>
            </Link>
            
            <Link to="/products?category=Earrings" className="category-link block group" style={{ height: '400px' }}>
              <div 
                className="bg-div absolute inset-0 bg-cover bg-center" 
                style={{ backgroundImage: `url(${getAssetUrl('/uploads/pastel_pink_statement_earrings.png')})` }}
              ></div>
              <div className="absolute inset-0 overlay"></div>
              <div className="absolute bottom-10 left-10 z-10">
                <h3 className="text-4xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Earrings</h3>
                <span className="text-[var(--accent-primary)] text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                   Explore <span className="transition-transform group-hover:translate-x-3">→</span>
                </span>
              </div>
            </Link>
 
            <Link to="/products?category=Bracelets" className="category-link block group" style={{ height: '400px' }}>
              <div 
                className="bg-div absolute inset-0 bg-cover bg-center" 
                style={{ backgroundImage: `url(${getAssetUrl('/uploads/midnight_flora_lattice_bangle.png')})` }}
              ></div>
              <div className="absolute inset-0 overlay"></div>
              <div className="absolute bottom-10 left-10 z-10">
                <h3 className="text-4xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Bracelets</h3>
                <span className="text-[var(--accent-primary)] text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                   Explore <span className="transition-transform group-hover:translate-x-3">→</span>
                </span>
              </div>
            </Link>

            <Link to="/products?category=Rings" className="category-link block group" style={{ height: '400px' }}>
              <div 
                className="bg-div absolute inset-0 bg-cover bg-center" 
                style={{ backgroundImage: `url(${getAssetUrl('/uploads/meenakari_ring.png')})` }}
              ></div>
              <div className="absolute inset-0 overlay"></div>
              <div className="absolute bottom-10 left-10 z-10">
                <h3 className="text-4xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Rings</h3>
                <span className="text-[var(--accent-primary)] text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                   Explore <span className="transition-transform group-hover:translate-x-3">→</span>
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Brand Values */}
      <section className="relative" style={{ paddingTop: '4rem', paddingBottom: '4rem', marginBottom: '2rem' }}>
        <div className="container relative z-10 px-6 sm:px-12" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '3rem', textAlign: 'center' }}>
          <div className="glass-card p-12 rounded-3xl group hover:bg-[#111] transition-colors">
            <div className="w-24 h-24 mx-auto rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(212,175,55,0.15)] group-hover:scale-110 transition-transform duration-500">
              <span className="text-4xl text-[var(--accent-primary)] drop-shadow-md">✦</span>
            </div>
            <h4 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Ethical Sourcing</h4>
            <p className="text-gray-400 leading-relaxed text-base">Every diamond and gemstone is meticulously traced, ensuring 100% conflict-free and sustainable origins.</p>
          </div>
          
          <div className="glass-card p-12 rounded-3xl group hover:bg-[#111] transition-colors">
            <div className="w-24 h-24 mx-auto rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(212,175,55,0.15)] group-hover:scale-110 transition-transform duration-500">
              <span className="text-4xl text-[var(--accent-primary)] drop-shadow-md">♕</span>
            </div>
            <h4 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Master Craftsmanship</h4>
            <p className="text-gray-400 leading-relaxed text-base">Our artisans dedicate hundreds of hours to handcrafting each piece with uncompromising precision.</p>
          </div>
          
          <div className="glass-card p-12 rounded-3xl group hover:bg-[#111] transition-colors">
            <div className="w-24 h-24 mx-auto rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(212,175,55,0.15)] group-hover:scale-110 transition-transform duration-500">
              <span className="text-4xl text-[var(--accent-primary)] drop-shadow-md">∞</span>
            </div>
            <h4 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Lifetime Warranty</h4>
            <p className="text-gray-400 leading-relaxed text-base">We proudly stand behind our unparalleled quality, offering complimentary maintenance for a lifetime.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
