-- Create products table for admin management
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  sizes TEXT[] DEFAULT '{}',
  colors TEXT[] DEFAULT '{}',
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cart_items table for persistent cart
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_image TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT cart_user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Create wishlist_items table
CREATE TABLE public.wishlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Everyone can view active products" 
ON public.products 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
USING (is_admin(auth.uid()));

-- Cart policies
CREATE POLICY "Users can view their own cart items" 
ON public.cart_items 
FOR SELECT 
USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can create cart items" 
ON public.cart_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can update their own cart items" 
ON public.cart_items 
FOR UPDATE 
USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can delete their own cart items" 
ON public.cart_items 
FOR DELETE 
USING (auth.uid() = user_id OR session_id IS NOT NULL);

-- Wishlist policies
CREATE POLICY "Users can view their own wishlist" 
ON public.wishlist_items 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wishlist items" 
ON public.wishlist_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wishlist items" 
ON public.wishlist_items 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample products
INSERT INTO public.products (name, price, description, category, images, sizes, colors, stock_quantity) VALUES
('Urban Explorer Jacket', 129.99, 'Premium streetwear jacket with urban design elements', 'outerwear', ARRAY['/lovable-uploads/03ccd29e-8d26-4668-abf7-5c007566ba43.png'], ARRAY['S', 'M', 'L', 'XL'], ARRAY['Black', 'Navy', 'Olive'], 50),
('Street Style Hoodie', 79.99, 'Comfortable hoodie perfect for street style', 'hoodies', ARRAY['/lovable-uploads/3c5c8112-9c97-4462-b4fc-e96501860ac9.png'], ARRAY['S', 'M', 'L', 'XL', 'XXL'], ARRAY['Black', 'White', 'Gray'], 75),
('Vintage Denim Jacket', 99.99, 'Classic vintage-inspired denim jacket', 'jackets', ARRAY['/lovable-uploads/a2ce0daa-c431-4475-ac89-c6733ffa83fe.png'], ARRAY['S', 'M', 'L', 'XL'], ARRAY['Blue', 'Black', 'Light Blue'], 30),
('Casual Streetwear Tee', 39.99, 'Essential streetwear t-shirt with premium cotton', 't-shirts', ARRAY['/lovable-uploads/db868647-544e-4c56-9f4e-508500776671.png'], ARRAY['XS', 'S', 'M', 'L', 'XL'], ARRAY['White', 'Black', 'Navy', 'Red'], 100),
('Designer Track Pants', 89.99, 'Premium track pants with modern fit', 'pants', ARRAY['/lovable-uploads/f2aaa537-d5a0-4855-aeff-970b2b00983b.png'], ARRAY['S', 'M', 'L', 'XL'], ARRAY['Black', 'Navy', 'Gray'], 60);