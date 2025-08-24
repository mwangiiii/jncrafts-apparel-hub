export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  category: string;
  images: string[];
  videos?: string[];
  thumbnail_index?: number;
  sizes: string[];
  colors: string[];
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  new_arrival_date?: string;
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