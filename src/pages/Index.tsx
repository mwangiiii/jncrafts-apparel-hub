import { useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ProductsSection from "@/components/ProductsSection";
import DiscountsSection from "@/components/DiscountsSection";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import Cart, { CartItem } from "@/components/Cart";
import { Product } from "@/components/ProductCard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleAddToCart = (product: Product, quantity: number, size: string, color: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please log in to add items to your cart",
      });
      return;
    }

    const cartItem: CartItem = {
      id: `${product.id}-${size}-${color}`,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity,
      size,
      color,
    };

    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === cartItem.id);
      if (existingItem) {
        return prev.map(item =>
          item.id === cartItem.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, cartItem];
    });

    toast({
      title: "Added to Cart",
      description: `${product.name} (${size}, ${color}) added to your cart`,
    });
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity === 0) {
      handleRemoveItem(id);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
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
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
      />
    </div>
  );
};

export default Index;
