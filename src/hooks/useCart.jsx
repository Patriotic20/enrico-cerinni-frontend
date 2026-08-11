import { useState, useCallback } from 'react';

export const useCart = () => {
  const [cart, setCart] = useState([]);

  // Merge one product into a cart snapshot: bump the quantity if it is already
  // there, otherwise append it with a numeric price.
  const mergeItem = (items, product) => {
    const existingItem = items.find(item => item.id === product.id);

    if (existingItem) {
      return items.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    }

    return [...items, { ...product, price: parseFloat(product.price) || 0, quantity: 1 }];
  };

  // Functional updates are required here: adding several products in one go
  // queues several setCart calls, and a snapshot captured from the closure
  // would be stale for every call after the first — only the last would land.
  const addToCart = useCallback((product) => {
    if (!product) return;
    setCart(items => mergeItem(items, product));
  }, []);

  const addManyToCart = useCallback((products) => {
    if (!Array.isArray(products) || products.length === 0) return;
    setCart(items => products.reduce(mergeItem, items));
  }, []);

  const updateQuantity = useCallback((productId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.id !== productId));
    } else {
      setCart(cart.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  }, [cart]);

  const updatePrice = useCallback((productId, newPrice) => {
    setCart(cart.map(item =>
      item.id === productId
        ? { ...item, price: parseFloat(newPrice) || 0 }
        : item
    ));
  }, [cart]);

  const removeFromCart = useCallback((productId) => {
    setCart(cart.filter(item => item.id !== productId));
  }, [cart]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => {
    const itemPrice = parseFloat(item.price || 0);
    return sum + (itemPrice * item.quantity);
  }, 0);

  const total = subtotal;

  return {
    cart,
    subtotal,
    total,
    addToCart,
    addManyToCart,
    updateQuantity,
    updatePrice,
    removeFromCart,
    clearCart,
    setCart,
  };
}; 