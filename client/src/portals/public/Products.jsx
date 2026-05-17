import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import ProductCard from '../../components/products/ProductCard';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Update local category state when URL changes
  useEffect(() => {
    let catParam = searchParams.get('category');
    if (catParam !== null) {
      const lower = catParam.trim().toLowerCase();
      if (lower === 'bracelet' || lower === 'bracelets') {
        catParam = 'Bracelets';
      }
      setCategory(catParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        if (res.data.success) {
          setCategories(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      let catQuery = category;
      if (catQuery) {
        const lower = catQuery.trim().toLowerCase();
        if (lower === 'bracelet' || lower === 'bracelets') {
          catQuery = 'Bracelets';
        }
      }
      if (catQuery) params.append('category', catQuery);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      params.append('isActive', 'true'); // Hide soft-deleted products

      const res = await api.get(`/products?${params.toString()}`);
      if (res.data.success) {
        setProducts(res.data.data.products || res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleViewAll = (catName) => {
    setCategory(catName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Group products by category
  const groupedProducts = categories.reduce((acc, cat) => {
    const catProducts = products.filter(p => p.categoryName === cat.name);
    if (catProducts.length > 0) {
      acc[cat.name] = catProducts;
    }
    return acc;
  }, {});

  const unassignedProducts = products.filter(p => !categories.find(c => c.name === p.categoryName));
  if (unassignedProducts.length > 0) {
    groupedProducts['Other'] = unassignedProducts;
  }

  return (
    <div className="container py-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="glass p-6 sticky top-24">
          <h3 className="mb-6" style={{ color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
            Filter Collection
          </h3>
          
          <form onSubmit={handleApplyFilters}>
            <div className="form-group mb-4">
              <label className="form-label">Search</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Category</label>
              <select 
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group mb-6">
              <label className="form-label">Price Range</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Min Rs." 
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  style={{ padding: '0.5rem' }}
                />
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Max Rs." 
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  style={{ padding: '0.5rem' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Apply Filters
            </button>
            { (search || category || minPrice || maxPrice) && (
              <button 
                type="button" 
                onClick={() => { setSearch(''); setCategory(''); setMinPrice(''); setMaxPrice(''); fetchProducts(); }} 
                className="btn btn-outline mt-3" 
                style={{ width: '100%' }}
              >
                Clear Filters
              </button>
            )}
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <div className="flex justify-between items-center mb-8">
          <h2 style={{ fontFamily: 'var(--font-heading)', margin: 0, fontSize: '2.5rem', letterSpacing: '0.05em' }}>The Collection</h2>
          <span style={{ color: 'var(--text-secondary)' }}>
            Showing {products.length} {products.length === 1 ? 'piece' : 'pieces'}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="loader" style={{ width: '40px', height: '40px', borderWidth: '3px', borderTopColor: 'var(--accent-primary)' }}></div>
          </div>
        ) : products.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
            {category ? (
              // Specific Category View (show all for this category)
              <section>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', fontSize: '1.5rem', margin: 0, fontWeight: 600 }}>
                    {category}
                  </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                  {products.filter(p => p.categoryName === category).map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            ) : (
              // All Categories View (group by category, show 4 max per category)
              Object.keys(groupedProducts).map(catName => {
                const catItems = groupedProducts[catName];
                const displayedItems = catItems.slice(0, 4);
                
                return (
                  <section key={catName}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem', position: 'relative' }}>
                      <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', fontSize: '1.5rem', margin: 0, fontWeight: 600 }}>
                        {catName}
                      </h3>
                      {catItems.length > 4 && (
                        <button 
                          onClick={() => handleViewAll(catName)}
                          style={{ 
                            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', 
                            fontSize: '0.85rem', textDecoration: 'underline', padding: 0
                          }}
                          onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                        >
                          View all
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                      {displayedItems.map(product => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </section>
                )
              })
            )}
          </div>
        ) : (
          <div className="glass p-16 text-center">
            <h3 style={{ color: 'var(--accent-primary)', marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>No pieces found</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your filters to discover our collection.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;
