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