import React, { useState, useContext, useEffect } from 'react';
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ProductsSection from "@/components/ProductsSection";
import DiscountsSection from "@/components/DiscountsSection";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import Cart from "@/components/Cart";
import { Button } from "@/components/ui/button";
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
      
      {/* Quick Access to Messages */}
      {user && (
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-end">
            <Link to="/messages">
              <Button variant="outline" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                My Conversations
              </Button>
            </Link>
          </div>
        </div>
      )}
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