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

    // UZS has no usable fractions; whole numbers keep the cart and keypad clean.
    // basePrice lets the cashier see and restore the list price after a discount.
    const price = Math.round(parseFloat(product.price) || 0);
    return [...items, { ...product, price, basePrice: price, quantity: 1 }];
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
    setCart(items => newQuantity <= 0
      ? items.filter(item => item.id !== productId)
      : items.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item));
  }, []);

  const updatePrice = useCallback((productId, newPrice) => {
    setCart(items => items.map(item =>
      item.id === productId
        ? { ...item, price: Math.max(0, Math.round(parseFloat(newPrice) || 0)) }
        : item
    ));
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart(items => items.filter(item => item.id !== productId));
  }, []);

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