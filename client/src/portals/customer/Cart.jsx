import { useEffect, useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Link, useNavigate } from 'react-router-dom';
import api, { getAssetUrl } from '../../services/api';

const Cart = () => {
  const { cart, loading, updateQuantity, removeItem, clearCart, refreshCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [showModal, setShowModal] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({ street: '', city: '', state: '', postalCode: '', country: 'Pakistan' });
  const [paymentMethodId, setPaymentMethodId] = useState('PM003');

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (checkingOut) return;
    setCheckingOut(true);
    try {
      const res = await api.post('/orders', { shippingInfo, paymentMethodId });
      if (res.data.success) {
        const order = res.data.data;
        showSuccess('Order placed successfully!');
        
        // Trigger PDF Receipt Download
        try {
          const invoiceRes = await api.get(`/orders/${order.id}/invoice`, { responseType: 'blob' });
          const blob = new Blob([invoiceRes.data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `receipt-${order.orderNumber || order.id}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        } catch (invoiceErr) {
          console.error('Failed to download invoice', invoiceErr);
          let errorMsg = 'Could not generate receipt automatically.';
          
          if (invoiceErr.response?.data instanceof Blob) {
            // Need to read blob to get the JSON error message
            const text = await invoiceErr.response.data.text();
            try {
              const json = JSON.parse(text);
              errorMsg += ' ' + json.message;
            } catch { /* ignore parse error */ }
          } else if (invoiceErr.response?.data?.message) {
            errorMsg += ' ' + invoiceErr.response.data.message;
          }
          
          alert(errorMsg + ' You can download it later from your profile.');
        }

        setShowModal(false);
        refreshCart(); // Refresh cart (will be empty)
        navigate('/me'); // Redirect to profile to see orders
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="loader" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
      </div>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="container mx-auto flex flex-col justify-center items-center" style={{ minHeight: '60vh', padding: '5rem 1rem' }}>
        <div className="glass p-16 rounded-3xl shadow-2xl relative overflow-hidden w-full max-w-2xl text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212, 175, 55, 0.2)', backdropFilter: 'blur(10px)', paddingTop: '5rem', paddingBottom: '5rem' }}>
          {/* Subtle gold glow at the top */}
          <div className="absolute top-0 left-0 w-full h-1 opacity-100" style={{ background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)' }}></div>
          
          <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-8 relative" style={{ background: 'rgba(212, 175, 55, 0.05)', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
            <svg className="w-10 h-10 text-[var(--accent-primary)] opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <div className="absolute inset-0 rounded-full pointer-events-none" style={{ boxShadow: '0 0 30px rgba(212, 175, 55, 0.2)' }}></div>
          </div>
          
          <h2 className="mb-4 text-3xl uppercase tracking-widest text-white" style={{ fontFamily: 'var(--font-heading)' }}>Your Cart is Empty</h2>
          <p className="mb-10 text-gray-400 text-lg" style={{ lineHeight: '1.8' }}>Looks like you haven't added anything to your cart yet.<br/>Discover our exclusive luxury collection and find your perfect piece.</p>
          
          <Link to="/products" className="inline-block py-4 px-10 text-sm font-bold text-white rounded-full shadow-lg transition-all transform hover:-translate-y-1 cursor-pointer tracking-wider" style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, #b8860b 100%)', textDecoration: 'none', border: 'none' }}>
            EXPLORE COLLECTION
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="container py-12 max-w-6xl">
      <h1 className="mb-8 text-4xl" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>Shopping Cart</h1>
      
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1">
          <div className="glass rounded-2xl overflow-hidden shadow-md">
            <div className="hidden md:grid grid-cols-12 gap-4 p-5 border-b border-gray-800 bg-black/40 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <div className="col-span-6">Product</div>
              <div className="col-span-2 text-center">Price</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            
            <div className="divide-y divide-gray-800 bg-black/20">
              {cart?.items?.map((item, index) => {
                if (!item) return null;
                const productId = item.productId;
                const name = item.name || 'Unnamed Product';
                const imageUrl = item.imageUrl || '';
                const unitPrice = Number(item.unitPrice || 0);
                const quantity = Number(item.quantity || 0);
                const lineTotal = Number(item.lineTotal || 0);
                const isRing = index === 3;
                
                return (
                  <div key={productId || index} className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 items-center">
                    <div className="col-span-1 md:col-span-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                      <img 
                        src={getAssetUrl(imageUrl || `/uploads/${name.toLowerCase().replace(/ /g, '_')}.png`)} 
                        alt={name}
                        className="w-28 h-28 object-cover rounded-xl shadow-lg border border-gray-800"
                      />
                      <div className="flex flex-col justify-center">
                        <Link to={`/products/${productId}`} className="font-bold text-lg hover:text-[var(--accent-primary)] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>
                          {name}
                        </Link>
                        <button 
                          onClick={() => removeItem(productId)}
                          className="mt-3 text-red-400 hover:text-red-500 text-sm font-medium flex items-center justify-center sm:justify-start gap-1 transition-all"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          Remove Item
                        </button>
                      </div>
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 text-center font-medium text-gray-400">
                      Rs. {unitPrice.toLocaleString()}
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 flex justify-center">
                      <div className="flex items-center border border-gray-700 rounded-full overflow-hidden bg-black/50">
                        <button 
                          className="px-4 py-2 hover:bg-gray-800 transition-colors text-white font-bold"
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                          onClick={() => updateQuantity(productId, Math.max(1, quantity - 1))}
                        >-</button>
                        <span className="w-10 text-center font-bold text-white">{quantity}</span>
                        <button 
                          className="px-4 py-2 hover:bg-gray-800 transition-colors text-white font-bold"
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                          onClick={() => updateQuantity(productId, quantity + 1)}
                        >+</button>
                      </div>
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 text-center md:text-right font-bold text-xl text-[var(--accent-primary)]">
                      Rs. {lineTotal.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="mt-8 flex justify-between items-center px-4">
            <Link to="/products" className="text-gray-400 hover:text-white font-medium flex items-center gap-2 transition-colors">
              &larr; Continue Shopping
            </Link>
            <button 
              onClick={clearCart}
              className="px-6 py-2 rounded-full border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition-all text-sm font-medium cursor-pointer bg-transparent"
            >
              Clear Cart
            </button>
          </div>
        </div>
 
        <div className="w-full lg:w-96 shrink-0">
          <div className="glass p-8 rounded-2xl shadow-xl sticky top-24 border border-gray-800 bg-black/40">
            <h3 className="text-2xl font-bold mb-8 text-white uppercase tracking-widest" style={{ fontFamily: 'var(--font-heading)' }}>Order Summary</h3>
            
            <div className="flex justify-between mb-4 text-gray-300">
              <span>Subtotal</span>
              <span className="font-medium text-white">Rs. {cart?.items?.reduce((acc, item) => acc + Number(item?.lineTotal || 0), 0)?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex justify-between mb-8 text-gray-400 text-sm">
              <span>Shipping</span>
              <span className="font-medium">Calculated at checkout</span>
            </div>
            
            <div className="border-t border-gray-700 pt-6 mb-8 flex justify-between items-end">
              <span className="font-bold text-lg text-white">Total</span>
              <span className="text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                Rs. {cart?.items?.reduce((acc, item) => acc + Number(item?.lineTotal || 0), 0)?.toLocaleString() || '0'}
              </span>
            </div>
            
            <button 
              onClick={() => setShowModal(true)}
              className="w-full py-4 text-lg font-bold text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, #b8860b 100%)', border: 'none' }}
            >
              PROCEED TO CHECKOUT
            </button>
          </div>
        </div>
      </div>
    </div>
      
      {/* Checkout Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all duration-300">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden" style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            
            {/* Decorative background element */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-[var(--accent-primary)] to-yellow-200 rounded-full opacity-10 blur-2xl pointer-events-none"></div>

            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 transition-colors bg-transparent border-none cursor-pointer text-2xl outline-none w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 z-10"
            >×</button>
            
            <div className="mb-8 text-center relative z-10">
              <span className="text-3xl mb-3 block">🔒</span>
              <h2 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>Secure Checkout</h2>
              <p className="text-gray-500 text-sm mt-2">Enter your shipping details to complete your order</p>
            </div>
            
            <form onSubmit={handleCheckout} className="space-y-5 relative z-10">
              <div className="form-group">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Street Address</label>
                <input required type="text" className="w-full px-5 py-4 text-gray-900 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all outline-none" value={shippingInfo.street} onChange={e => setShippingInfo({...shippingInfo, street: e.target.value})} placeholder="123 Luxury Avenue" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="form-group">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">City</label>
                  <input required type="text" className="w-full px-5 py-4 text-gray-900 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all outline-none" value={shippingInfo.city} onChange={e => setShippingInfo({...shippingInfo, city: e.target.value})} placeholder="Lahore" />
                </div>
                <div className="form-group">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">State</label>
                  <input required type="text" className="w-full px-5 py-4 text-gray-900 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all outline-none" value={shippingInfo.state} onChange={e => setShippingInfo({...shippingInfo, state: e.target.value})} placeholder="Punjab" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="form-group">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Postal Code</label>
                  <input required type="text" className="w-full px-5 py-4 text-gray-900 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all outline-none" value={shippingInfo.postalCode} onChange={e => setShippingInfo({...shippingInfo, postalCode: e.target.value})} placeholder="54000" />
                </div>
                <div className="form-group">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Country</label>
                  <input required type="text" className="w-full px-5 py-4 text-gray-900 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all outline-none" value={shippingInfo.country} onChange={e => setShippingInfo({...shippingInfo, country: e.target.value})} placeholder="Pakistan" />
                </div>
              </div>
              
              <div className="form-group pt-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Payment Method</label>
                <div className="relative">
                  <select className="w-full px-5 py-4 text-gray-900 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all outline-none appearance-none" value={paymentMethodId} onChange={e => setPaymentMethodId(e.target.value)}>
                    <option value="PM001">💳 Credit Card</option>
                    <option value="PM002">🏦 Debit Card</option>
                    <option value="PM003">💵 Cash on Delivery</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={checkingOut}
                  className="w-full py-4 text-lg font-bold text-white rounded-xl shadow-lg transition-all transform hover:-translate-y-1 hover:shadow-xl flex justify-center items-center gap-2 outline-none border-none cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, #b8860b 100%)' }}
                >
                  {checkingOut ? <span className="loader" style={{ width: 24, height: 24, borderWidth: 2 }} /> : `Pay PKR ${cart?.subtotal?.toLocaleString()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Cart;
