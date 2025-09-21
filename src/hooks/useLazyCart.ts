import { useState, useCallback } from 'react';
import { usePersistentCart } from './usePersistentCart';

// Lazy cart hook that only initializes when needed
export const useLazyCart = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const {
    cartItems,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    migrateGuestCart,
    refreshCart,
    isLoading
  } = usePersistentCart(isInitialized);

  const totalItems = isInitialized ? cartItems.reduce((sum, item) => sum + item.quantity, 0) : 0;

  const initializeCart = useCallback(() => {
    if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const openCart = useCallback(() => {
    initializeCart();
    setIsCartOpen(true);
  }, [initializeCart]);

  const closeCart = useCallback(() => {
    setIsCartOpen(false);
  }, []);

  const lazyAddToCart = useCallback(async (product: any, quantity: number, size: string, color: string) => {
    initializeCart();
    return addToCart(product, quantity, size, color);
  }, [initializeCart, addToCart]);

  const lazyMigrateGuestCart = useCallback(async (userId: string) => {
    initializeCart();
    return migrateGuestCart(userId);
  }, [initializeCart, migrateGuestCart]);

  return {
    cartItems: isInitialized ? cartItems : [],
    addToCart: lazyAddToCart,
    updateQuantity,
    removeItem,
    clearCart,
    migrateGuestCart: lazyMigrateGuestCart,
    refreshCart,
    isLoading: isInitialized ? isLoading : false,
    totalItems,
    isCartOpen,
    openCart,
    closeCart,
    setIsCartOpen,
    isInitialized,
    initializeCart
  };
};