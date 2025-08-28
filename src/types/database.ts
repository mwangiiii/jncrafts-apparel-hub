// Updated Product interface for normalized structure with backward compatibility
export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  category: string;
  stock_quantity: number;
  is_active: boolean;
  new_arrival_date?: string;
  thumbnail_index?: number;
  created_at: string;
  updated_at: string;
  // Support both old and new image formats for compatibility
  images?: (string | ProductImage)[];
  colors?: (string | ProductColorInfo)[];
  sizes?: (string | ProductSizeInfo)[];
  videos?: string[];
  // Additional flags for optimization
  has_colors?: boolean;
  has_sizes?: boolean;
}

// Simple color/size info for UI display
export interface ProductColorInfo {
  id?: string;
  name: string;
  hex?: string;
  stock?: number;
  available?: boolean;
}

export interface ProductSizeInfo {
  id?: string;
  name: string;
  category?: string;
  stock?: number;
  available?: boolean;
}

// New interfaces for normalized tables
export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text?: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Color {
  id: string;
  name: string;
  hex_code?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Size {
  id: string;
  name: string;
  category: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductColor {
  id: string;
  product_id: string;
  color_id: string;
  stock_quantity: number;
  additional_price: number;
  is_available: boolean;
  created_at: string;
  color?: Color;
}

export interface ProductSize {
  id: string;
  product_id: string;
  size_id: string;
  stock_quantity: number;
  additional_price: number;
  is_available: boolean;
  created_at: string;
  size?: Size;
}

export interface ProductInventory {
  id: string;
  product_id: string;
  color_id?: string;
  size_id?: string;
  stock_quantity: number;
  reserved_quantity: number;
  reorder_level: number;
  last_restocked?: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  user_id?: string;
  session_id?: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  quantity: number;
  size: string;
  color: string;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface Conversation {
  id: string;
  user_id: string;
  product_id?: string;
  subject: string;
  status: 'active' | 'closed' | 'pending';
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  content: string;
  message_type: 'text' | 'system';
  created_at: string;
}