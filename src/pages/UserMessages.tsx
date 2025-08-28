import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useGlobalCart } from '@/hooks/useGlobalCart';
import BackButton from '@/components/BackButton';
import Cart from '@/components/Cart';
import { StayConnectedSection } from '@/components/StayConnectedSection';

const UserMessages = () => {
  const { user, loading } = useAuth();
  const {
    cartItems,
    updateQuantity,
    removeItem,
    clearCart,
    isCartOpen,
    openCart,
    closeCart,
    totalItems
  } = useGlobalCart();

  const isLoading = loading;

  if (!user && !loading) {
    return <Navigate to="/auth" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          cartItems={totalItems} 
          onCartClick={openCart} 
        />
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your messages...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        cartItems={totalItems} 
        onCartClick={openCart} 
      />
      <div className="container mx-auto py-8 px-4">
        <BackButton className="mb-6" />
        <StayConnectedSection />
      </div>
      
      <Cart
        isOpen={isCartOpen}
        onClose={closeCart}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
      />
    </div>
  );
};

export default UserMessages;