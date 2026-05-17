import { useState, useEffect } from 'react';
import api, { getAssetUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
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
      supplierId: product.supplierId || (suppliers.length > 0 ? suppliers[0].id : '')
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
      const payload = {
        ...formData,
        price: Number(formData.price),
        quantity: Number(formData.quantity)
      };

      if (modalMode === 'add') {
        const res = await api.post('/products', payload);
        if (res.data.success) {
          const newProduct = res.data.data;
          setProducts([newProduct, ...products]);
          showSuccess('Product added successfully!');
        }
      } else {
        const res = await api.patch(`/products/${formData.id}`, payload);
        if (res.data.success) {
          const updatedProduct = res.data.data;
          setProducts(products.map(p => p.id === formData.id ? updatedProduct : p));
          showSuccess('Product updated successfully!');
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      showError('Failed to save product: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2>Manage Products</h2>
        <button onClick={openAddModal} className="btn btn-primary" style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}>
          + Add New Product
        </button>
      </div>

      <div className="card bg-bg-secondary overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><div className="loader"></div></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <th className="p-4">ID</th>
                <th className="p-4">Product Name</th>
                <th className="p-4">Price</th>
                <th className="p-4">Quantity</th>
                <th className="p-4">Supplier</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="p-4">{product.id}</td>
                  <td className="p-4">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <img src={getAssetUrl(product.imageUrl)} alt={product.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                      <span className="font-semibold">{product.name}</span>
                    </div>
                  </td>
                  <td className="p-4">Rs. {Number(product.price).toLocaleString()}</td>
                  <td className="p-4">
                    <span style={{ color: product.quantity > 0 ? 'var(--success-color)' : 'var(--error-color)' }}>
                      {product.quantity}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-text-secondary">{product.supplierName || '—'}</td>
                  <td className="p-4">
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.8rem',
                      backgroundColor: product.isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: product.isActive ? 'var(--success-color)' : 'var(--error-color)'
                    }}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button onClick={() => openEditModal(product)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', marginRight: '0.5rem' }}>Edit</button>
                    {product.isActive ? (
                      <button onClick={() => handleDelete(product.id)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderColor: 'var(--error-color)', color: 'var(--error-color)' }}>Delete</button>
                    ) : (
                      <button onClick={() => handleToggleActive(product)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderColor: 'var(--success-color)', color: 'var(--success-color)' }}>Reactivate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && products.length === 0 && (
          <div className="p-8 text-center text-text-secondary">No products found.</div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', 
          alignItems: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>{modalMode === 'add' ? 'Add New Product' : 'Edit Product'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Product Name *</label>
                <input required type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Description</label>
                <textarea className="form-input" rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ width: '100%' }}></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Price (Rs.) *</label>
                  <input required type="number" min="0" step="0.01" className="form-input" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Quantity *</label>
                  <input required type="number" min="0" className="form-input" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} style={{ width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Category *</label>
                  <select required className="form-input" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} style={{ width: '100%' }}>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Material *</label>
                  <select required className="form-input" value={formData.materialId} onChange={e => setFormData({...formData, materialId: e.target.value})} style={{ width: '100%' }}>
                    <option value="">Select Material</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Supplier *</label>
                  <select required className="form-input" value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})} style={{ width: '100%' }}>
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Type</label>
                  <select className="form-input" value={formData.typeId} onChange={e => setFormData({...formData, typeId: e.target.value})} style={{ width: '100%' }}>
                    <option value="TYP001">Wedding</option>
                    <option value="TYP002">Party</option>
                    <option value="TYP003">Casual</option>
                    <option value="TYP004">Luxury</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Origin</label>
                  <input type="text" className="form-input" value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Weight</label>
                  <input type="text" className="form-input" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Product Image</label>
                <input type="file" accept="image/*" className="form-input" onChange={e => setSelectedImage(e.target.files[0])} style={{ width: '100%', padding: '0.4rem' }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Image will be automatically mapped to: <code>/uploads/&#123;product_name&#125;.png</code>
                </p>
                {selectedImage && <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', marginTop: '0.2rem' }}>File selected: {selectedImage.name}</div>}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}>
                  {modalMode === 'add' ? 'Create Product' : 'Save Changes'}
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
