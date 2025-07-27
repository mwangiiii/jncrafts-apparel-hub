import { useState } from "react";
import ProductCard, { Product } from "./ProductCard";

interface ProductsSectionProps {
  onAddToCart: (product: Product, quantity: number, size: string, color: string) => void;
}

const ProductsSection = ({ onAddToCart }: ProductsSectionProps) => {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const products: Product[] = [
    {
      id: "1",
      name: "CRAFTS Tracksuit Set",
      price: 120,
      image: "/lovable-uploads/a2ce0daa-c431-4475-ac89-c6733ffa83fe.png",
      category: "Tracksuits",
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: ["beige", "black"]
    },
    {
      id: "2",
      name: "CRAFTS Black Tracksuit",
      price: 120,
      image: "/lovable-uploads/3c5c8112-9c97-4462-b4fc-e96501860ac9.png",
      category: "Tracksuits",
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: ["black"]
    },
    {
      id: "3",
      name: "CRAFTS Hoodie",
      price: 65,
      image: "/lovable-uploads/03ccd29e-8d26-4668-abf7-5c007566ba43.png",
      category: "Hoodies",
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: ["beige", "black"]
    },
    {
      id: "4",
      name: "CRAFTS Sweatpants",
      price: 55,
      image: "/lovable-uploads/f2aaa537-d5a0-4855-aeff-970b2b00983b.png",
      category: "Pants",
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: ["beige", "black"]
    }
  ];

  const categories = ["all", "Tracksuits", "Hoodies", "Pants", "Shirts"];
  
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;