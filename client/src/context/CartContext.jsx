import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    if (!user || user.role !== 'customer') {
      setCart(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get('/cart');
      if (res.data.success) {
        setCart(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch cart', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId, quantity = 1) => {
    if (!user) {
      showError('Please login to add items to your cart.');
      return false;
    }
    if (user.role !== 'customer') {
      showError('Only customers can add items to cart.');
      return false;
    }
    try {
      const res = await api.post('/cart/items', { productId, quantity });
      if (res.data.success) {
        setCart(res.data.data);
        showSuccess('Item added to cart successfully!');
        return true;
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to add item to cart.');
      return false;
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      const res = await api.patch(`/cart/items/${productId}`, { quantity });
      if (res.data.success) {
        setCart(res.data.data);
        return true;
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update quantity.');
      return false;
    }
  };

  const removeItem = async (productId) => {
    try {
      const res = await api.delete(`/cart/items/${productId}`);
      if (res.data.success) {
        setCart(res.data.data);
        showSuccess('Item removed from cart.');
        return true;
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to remove item.');
      return false;
    }
  };

  const clearCart = async () => {
    try {
      const res = await api.delete('/cart');
      if (res.data.success) {
        setCart(res.data.data);
        showSuccess('Cart cleared.');
        return true;
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to clear cart.');
      return false;
    }
  };

  const cartItemCount = cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      cartItemCount,
      addToCart,
      updateQuantity,
      removeItem,
      clearCart,
      refreshCart: fetchCart
    }}>
      {children}
    </CartContext.Provider>
  );
};
