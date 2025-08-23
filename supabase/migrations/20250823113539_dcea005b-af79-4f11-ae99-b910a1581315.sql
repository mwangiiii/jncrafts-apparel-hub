-- Create categories table for proper category management
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view active categories" 
ON public.categories 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage categories" 
ON public.categories 
FOR ALL 
USING (is_admin(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default categories based on existing product data
INSERT INTO public.categories (name, description, display_order) VALUES
('Clothing', 'Fashion and apparel items', 1),
('Accessories', 'Fashion accessories and jewelry', 2),
('Home & Living', 'Home decor and living essentials', 3),
('Crafts', 'Handmade crafts and artisan items', 4),
('Electronics', 'Electronic devices and gadgets', 5);