// types/database.ts
export type Product = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  category_name: string;
  stock_quantity: number;
  is_active: boolean;
  new_arrival_date: string | null;
  thumbnail_index: number;
  created_at: string;
  updated_at: string;
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
  }>;
  sizes: Array<{
    id: string;
    name: string;
    category: string;
    is_active: boolean;
    display_order: number;
  }>;
};