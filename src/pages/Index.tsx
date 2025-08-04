import React, { useState, useContext, useEffect } from 'react';
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ProductsSection from "@/components/ProductsSection";
import DiscountsSection from "@/components/DiscountsSection";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import Cart from "@/components/Cart";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePersistentCart } from '@/hooks/usePersistentCart';
import { Product } from '@/types/database';

const Index = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { cartItems, addToCart, updateQuantity, removeItem, clearCart, migrateGuestCart } = usePersistentCart();

  useEffect(() => {
    if (user && user.id) {
      migrateGuestCart(user.id);
    }
  }, [user]);

  const handleAddToCart = async (product: Product, quantity: number, size: string, color: string) => {
    await addToCart(product, quantity, size, color);
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header 
        cartItems={totalItems} 
        onCartClick={() => setIsCartOpen(true)} 
      />
      <Hero />
      <DiscountsSection />
      <ProductsSection onAddToCart={handleAddToCart} />
      <AboutSection />
      <ContactSection />
      <Footer />
      
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
      />
    </div>
  );
};

export default Index;