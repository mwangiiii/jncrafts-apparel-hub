import { useState, useEffect } from "react";
import ResponsiveProductsGrid from "./ResponsiveProductsGrid";
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';

interface ProductsSectionProps {
  onAddToCart: (product: Product, quantity: number, size: string, color: string) => void;
}

const ProductsSection = ({ onAddToCart }: ProductsSectionProps) => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ["all", ...Array.from(new Set(products.map(product => product.category)))];
  
  const filteredProducts = selectedCategory === "all" 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  return (
    <section id="products" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Our <span className="text-brand-beige">Collection</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover our premium streetwear pieces, crafted with attention to detail 
            and designed for comfort and style.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex justify-center mb-12">
          <div className="flex flex-wrap gap-2 bg-background rounded-lg p-2 shadow-lg">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-md transition-all duration-300 capitalize ${
                  selectedCategory === category
                    ? "bg-brand-beige text-brand-beige-foreground shadow-md"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-8">Loading products...</div>
        ) : (
          <ResponsiveProductsGrid 
            products={filteredProducts} 
            onAddToCart={onAddToCart}
          />
        )}
      </div>
    </section>
  );
};

export default ProductsSection;