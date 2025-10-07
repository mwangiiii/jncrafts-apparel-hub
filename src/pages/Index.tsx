import React, { useState, useContext, useEffect } from 'react';
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ProductsSection from "@/components/ProductsSection";
import DiscountsSection from "@/components/DiscountsSection";
import DynamicAboutSection from "@/components/DynamicAboutSection";
import EnhancedContactSection from "@/components/EnhancedContactSection";
import Footer from "@/components/Footer";
import Cart from "@/components/Cart";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLazyCart } from '@/hooks/useLazyCart';
import { Product } from '@/types/database';
import ContactDeveloperButton from "@/components/ContactDeveloperButton";

const Index = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    cartItems,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    migrateGuestCart,
    isCartOpen,
    openCart,
    closeCart,
    totalItems,
    isLoading: cartLoading,
    isInitialized
  } = useLazyCart();

  // Only migrate cart when user logs in AND cart is already initialized
  useEffect(() => {
    if (user && user.id && isInitialized) {
      migrateGuestCart(user.id);
    }
  }, [user, isInitialized]);

  const handleAddToCart = async (product: Product, quantity: number, size: string, color: string) => {
    await addToCart(product, quantity, size, color);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        cartItems={totalItems} 
        onCartClick={openCart} 
      />
      <Hero />
      
      
      {/* Prominent Conversations Access */}
      {user && (
        <div className="container mx-auto px-4 py-6">
          <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Stay Connected</h3>
                  <p className="text-muted-foreground text-sm">
                    View your product enquiries, track orders, and chat with support
                  </p>
                </div>
              </div>
              <Link to="/messages">
                <Button className="flex items-center gap-2 px-6">
                  <MessageCircle className="h-4 w-4" />
                  My Conversations
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
      <DiscountsSection />
      <ProductsSection onAddToCart={handleAddToCart} />
      <DynamicAboutSection />
      <EnhancedContactSection />
      <Footer />
      
      <Cart
        isOpen={isCartOpen}
        onClose={closeCart}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
        isLoading={cartLoading}
      />
      
      <ContactDeveloperButton />
    </div>
  );
};

export default Index;