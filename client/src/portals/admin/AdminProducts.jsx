import { useState, useEffect, useCallback } from 'react';
import api, { getAssetUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useRealtimeSync } from '../../services/realtime';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const { showSuccess, showError } = useToast();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedImage, setSelectedImage] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', price: 0, quantity: 0,
    categoryId: '', materialId: '', typeId: 'TYP001', origin: '', weight: '', supplierId: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, matRes, supRes] = await Promise.all([
        api.get('/products?pageSize=100'),
        api.get('/categories'),
        api.get('/materials'),
        api.get('/admin/suppliers')
      ]);
      if (prodRes.data.success) {
        setProducts(prodRes.data.data.products || prodRes.data.data || []);
      }
      if (catRes.data.success) setCategories(catRes.data.data || []);
      if (matRes.data.success) setMaterials(matRes.data.data || []);
      if (supRes.data.success) setSuppliers(supRes.data.data || []);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time synchronization
  useRealtimeSync('products:changed', useCallback(() => {
    fetchData();
  }, []));

  const openAddModal = () => {
    setModalMode('add');
    setFormData({
      name: '', description: '', price: 0, quantity: 0,
      categoryId: categories.length > 0 ? categories[0].id : '', 
      materialId: materials.length > 0 ? materials[0].id : '', 
      typeId: 'TYP001', origin: '', weight: '',
      supplierId: suppliers.length > 0 ? suppliers[0].id : ''
    });
    setSelectedImage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setModalMode('edit');
    setFormData({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: product.price || 0,
      quantity: product.quantity || 0,
      categoryId: product.categoryId || (categories.length > 0 ? categories[0].id : ''),
      materialId: product.materialId || (materials.length > 0 ? materials[0].id : ''),
      typeId: product.typeId || 'TYP001',
      origin: product.origin || '',
      weight: product.weight || '',
      supplierId: product.supplierId || (suppliers.length > 0 ? suppliers[0].id : ''),
      imageUrl: product.imageUrl || ''
    });
    setSelectedImage(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate (delete) this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts(products.map(p => p.id === id ? { ...p, isActive: false } : p));
      showSuccess('Product deactivated successfully!');
    } catch (err) {
      showError('Failed to deactivate product: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleActive = async (product) => {
    try {
      const res = await api.patch(`/products/${product.id}`, { isActive: !product.isActive });
      if (res.data.success) {
        setProducts(products.map(p => p.id === product.id ? res.data.data : p));
        showSuccess(`Product ${!product.isActive ? 'activated' : 'deactivated'} successfully!`);
      }
    } catch (err) {
      showError('Failed to change product status: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (selectedImage) {
        const formDataPayload = new FormData();
        Object.entries(formData).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            formDataPayload.append(key, val);
          }
        });
        formDataPayload.set('price', Number(formData.price));
        formDataPayload.set('quantity', Number(formData.quantity));
        formDataPayload.append('image', selectedImage);

        const config = {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        };

        if (modalMode === 'add') {
          res = await api.post('/products', formDataPayload, config);
        } else {
          res = await api.patch(`/products/${formData.id}`, formDataPayload, config);
        }
      } else {
        const payload = {
          ...formData,
          price: Number(formData.price),
          quantity: Number(formData.quantity)
        };

        if (modalMode === 'add') {
          res = await api.post('/products', payload);
        } else {
          res = await api.patch(`/products/${formData.id}`, payload);
        }
      }

      if (res.data.success) {
        const productData = res.data.data;
        if (modalMode === 'add') {
          setProducts([productData, ...products]);
          showSuccess('Product added successfully!');
        } else {
          setProducts(products.map(p => p.id === formData.id ? productData : p));
          showSuccess('Product updated successfully!');
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      showError('Failed to save product: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchTerm || 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id?.toString().includes(searchTerm);
    const matchesCat = !categoryFilter || p.categoryId === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 700,
              color: 'var(--accent-primary)',
              display: 'inline-block',
              marginBottom: '0.35rem',
            }}
          >
            Vault &amp; Inventory Management
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: '1.65rem',
              fontFamily: 'var(--font-heading)',
              color: 'var(--text-primary)',
              letterSpacing: '0.04em',
            }}
          >
            Products &amp; Inventory
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {products.length} registered item{products.length !== 1 ? 's' : ''} in the master boutique catalog
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="btn btn-primary"
          style={{
            padding: '0.7rem 1.35rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>✦</span>
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '380px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search products by title or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.4rem' }}
          />
          <span
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
            }}
          >
            🔍
          </span>
        </div>

        <select
          className="form-input"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: 'auto', minWidth: '180px' }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table Card */}
      <div
        className="card"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
        }}
      >
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div className="loader" style={{ margin: '0 auto 1rem' }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading catalogue records...</div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.5 }}>💎</div>
            <div style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>No products match your criteria.</div>
            <div style={{ fontSize: '0.85rem' }}>Try clearing the search or category filter.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.95rem 1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', fontWeight: 600 }}>ID</th>
                  <th style={{ padding: '0.95rem 1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', fontWeight: 600 }}>Jewellery Piece</th>
                  <th style={{ padding: '0.95rem 1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', fontWeight: 600 }}>Retail Price</th>
                  <th style={{ padding: '0.95rem 1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', fontWeight: 600 }}>In Vault</th>
                  <th style={{ padding: '0.95rem 1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', fontWeight: 600 }}>Supplier</th>
                  <th style={{ padding: '0.95rem 1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.95rem 1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.825rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      #{product.id}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                        <div
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 8,
                            overflow: 'hidden',
                            backgroundColor: '#1E2225',
                            border: '1px solid rgba(214, 180, 106, 0.25)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <img
                            src={getAssetUrl(product.imageUrl)}
                            alt={product.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '💎';
                            }}
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                            {product.name}
                          </div>
                          {product.categoryName && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {product.categoryName} &bull; {product.materialName || 'Fine Gold'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      PKR {Number(product.price).toLocaleString()}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 6,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          backgroundColor: product.quantity > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: product.quantity > 0 ? '#10B981' : '#EF4444',
                        }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: product.quantity > 0 ? '#10B981' : '#EF4444' }} />
                        {product.quantity} in stock
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      {product.supplierName || '—'}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: 20,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: product.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: product.isActive ? '#10B981' : '#EF4444',
                          border: product.isActive ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                        }}
                      >
                        {product.isActive ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => openEditModal(product)}
                          className="btn btn-outline"
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.78rem',
                          }}
                        >
                          Edit
                        </button>
                        {product.isActive ? (
                          <button
                            onClick={() => handleDelete(product.id)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.78rem',
                              borderRadius: 8,
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              color: '#EF4444',
                              backgroundColor: 'transparent',
                              cursor: 'pointer',
                              transition: 'all 0.18s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(product)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.78rem',
                              borderRadius: 8,
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              color: '#10B981',
                              backgroundColor: 'transparent',
                              cursor: 'pointer',
                              transition: 'all 0.18s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.12)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Luxury Add / Edit Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '680px',
              backgroundColor: '#1E2225',
              border: '1px solid #3A3D3F',
              borderTop: '3px solid var(--accent-primary)',
              borderRadius: 14,
              padding: '2.25rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(214, 180, 106, 0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-primary)', fontWeight: 700 }}>
                  Catalog Editor
                </span>
                <h3
                  style={{
                    margin: '0.2rem 0 0',
                    fontSize: '1.35rem',
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {modalMode === 'add' ? 'Add New Jewellery Piece' : 'Edit Product Specifications'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="form-label">Product Name *</label>
                <input
                  required
                  type="text"
                  className="form-input"
                  placeholder="e.g. Royal Gold Necklace Set"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="Detailed description, gemstone characteristics, and styling..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="form-label">Retail Price (PKR) *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Vault Quantity *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    className="form-input"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="form-label">Category *</label>
                  <select
                    required
                    className="form-input"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Material *</label>
                  <select
                    required
                    className="form-input"
                    value={formData.materialId}
                    onChange={(e) => setFormData({ ...formData, materialId: e.target.value })}
                  >
                    <option value="">Select Material</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Supplier *</label>
                  <select
                    required
                    className="form-input"
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="form-label">Occasion / Type</label>
                  <select
                    className="form-input"
                    value={formData.typeId}
                    onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}
                  >
                    <option value="TYP001">Wedding</option>
                    <option value="TYP002">Party</option>
                    <option value="TYP003">Casual</option>
                    <option value="TYP004">Luxury</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Origin</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Dubai, Italy"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Weight</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 24.5g"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  />
                </div>
              </div>

              <div
                style={{
                  padding: '1.25rem',
                  backgroundColor: '#252A2D',
                  border: '1px solid #3A3D3F',
                  borderRadius: 10,
                }}
              >
                <label className="form-label" style={{ marginBottom: '0.65rem' }}>
                  Cloudinary High-Res Product Image
                </label>
                {modalMode === 'edit' && formData.imageUrl && !selectedImage && (
                  <div
                    style={{
                      marginBottom: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '0.65rem 0.85rem',
                      background: '#1E2225',
                      borderRadius: 8,
                      border: '1px solid #3A3D3F',
                    }}
                  >
                    <img
                      src={getAssetUrl(formData.imageUrl)}
                      alt="Current"
                      style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(214, 180, 106, 0.3)' }}
                    />
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Current Cloudinary Image Active</div>
                      <div style={{ fontSize: '0.72rem' }}>Upload below to overwrite with a new asset</div>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="form-input"
                  onChange={(e) => setSelectedImage(e.target.files[0])}
                  style={{ padding: '0.5rem', background: '#1E2225' }}
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem', marginBottom: 0 }}>
                  Assets are synchronized with Cloudinary cloud vault (JPG, PNG, WEBP, max 5MB).
                </p>
                {selectedImage && (
                  <div style={{ fontSize: '0.8rem', color: '#10B981', marginTop: '0.4rem', fontWeight: 500 }}>
                    ✓ Selected asset: {selectedImage.name}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {modalMode === 'add' ? '✦ Create Jewellery Record' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
