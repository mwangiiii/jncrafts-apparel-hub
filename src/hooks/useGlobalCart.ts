import { useState, useEffect } from 'react';
import { usePersistentCart } from './usePersistentCart';

// Global cart hook that can be used across all pages
export const useGlobalCart = () => {
  const {
    cartItems,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    migrateGuestCart,
    refreshCart,
    isLoading
  } = usePersistentCart();

  const [isCartOpen, setIsCartOpen] = useState(false);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  return {
    cartItems,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    migrateGuestCart,
    refreshCart,
    isLoading,
    totalItems,
    isCartOpen,
    openCart,
    closeCart,
    setIsCartOpen
  };
};