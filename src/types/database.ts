// types/database.ts
export type Product = {
  id: string; // UUID
  name: string;
  price: number;
  description: string | null;
  category_name: string; // From categories.name
  stock_quantity: number; // Aggregated from product_variants
  is_active: boolean;
  new_arrival_date: string | null; // TIMESTAMP
  thumbnail_index: number;
  created_at: string; // TIMESTAMP
  updated_at: string; // TIMESTAMP
  show_jacket_size_chart: boolean;
  show_pants_size_chart: boolean;
  images: Array<{
    id: string;
    image_url: string;
    alt_text: string | null;
    display_order: number;
    is_primary: boolean;
    is_active: boolean;
  }>;
  colors: Array<{
    id: string;
    name: string;
    hex_code: string;
    is_active: boolean;
    display_order: number;
    available?: boolean; // Added by ProductDisplayHelper
  }>;
  sizes: Array<{
    id: string;
    name: string;
    category: string;
    is_active: boolean;
    display_order: number;
    available?: boolean; // Added by ProductDisplayHelper
  }>;
};