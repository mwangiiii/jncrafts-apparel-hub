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
  thumbnail_image: string;
  images: Array<{
    id: string;
    image_url: string;
    alt_text: string | null;
    display_order: number;
    is_primary: boolean;
    is_active: boolean;
    variant_id: string | null;
  }>;
  colors: Array<{
    id: string;
    name: string;
    hex_code: string | null;
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
  variants: Array<{
    id: string;
    color_id: string | null;
    size_id: string | null;
    stock_quantity: number;
    additional_price: number;
    is_available: boolean;
  }>;
};

export type CartItem = {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  price: number;
  quantity: number;
  size_name: string;
  color_name: string;
};