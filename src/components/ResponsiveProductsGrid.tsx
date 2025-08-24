import { cn } from "@/lib/utils";
import ProductCard from "./ProductCard";
import { Product } from '@/types/database';

interface ResponsiveProductsGridProps {
  products: Product[];
  onAddToCart: (product: Product, quantity: number, size: string, color: string) => void;
  className?: string;
}

const ResponsiveProductsGrid = ({ products, onAddToCart, className }: ResponsiveProductsGridProps) => {
  return (
    <div 
      className={cn(
        "grid gap-6",
        // Mobile: 1 column
        "grid-cols-1",
        // Small mobile landscape and small tablets: 2 columns
        "sm:grid-cols-2",
        // Medium tablets: 2 columns
        "md:grid-cols-2",
        // Large tablets and small laptops: 3 columns
        "lg:grid-cols-3",
        // Large screens: 4 columns
        "xl:grid-cols-4",
        // Extra large screens: 4 columns (maintain max width)
        "2xl:grid-cols-4",
        className
      )}
    >
      {products.map((product) => (
        <div
          key={product.id}
          className="flex justify-center"
        >
          <div className="w-full max-w-sm">
            <ProductCard
              product={product}
              onAddToCart={onAddToCart}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ResponsiveProductsGrid;