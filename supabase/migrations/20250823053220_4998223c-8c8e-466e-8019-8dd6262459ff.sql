-- Add settings table for admin controls
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on settings table
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies for settings table
CREATE POLICY "Admins can manage settings"
ON public.settings
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Add discount product associations table
CREATE TABLE IF NOT EXISTS public.discount_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id UUID NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Either product_id or category should be set, not both
  CONSTRAINT discount_products_check CHECK (
    (product_id IS NOT NULL AND category IS NULL) OR 
    (product_id IS NULL AND category IS NOT NULL)
  )
);

-- Enable RLS on discount_products table
ALTER TABLE public.discount_products ENABLE ROW LEVEL SECURITY;

-- Create policies for discount_products table
CREATE POLICY "Admins can manage discount products"
ON public.discount_products
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Everyone can view active discount products"
ON public.discount_products
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.discounts 
    WHERE discounts.id = discount_products.discount_id 
    AND discounts.is_active = true 
    AND (discounts.start_date IS NULL OR discounts.start_date <= now()) 
    AND (discounts.end_date IS NULL OR discounts.end_date >= now())
  )
);

-- Add new columns to discounts table
ALTER TABLE public.discounts 
ADD COLUMN IF NOT EXISTS banner_message TEXT,
ADD COLUMN IF NOT EXISTS applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all', 'specific', 'category')),
ADD COLUMN IF NOT EXISTS requires_code BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS usage_limit INTEGER,
ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0;

-- Create function to check if product is eligible for discount
CREATE OR REPLACE FUNCTION public.is_product_eligible_for_discount(
  p_product_id UUID,
  p_discount_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  discount_record RECORD;
  is_eligible BOOLEAN := FALSE;
BEGIN
  -- Get discount details
  SELECT * INTO discount_record
  FROM discounts
  WHERE id = p_discount_id 
  AND is_active = true
  AND (start_date IS NULL OR start_date <= now())
  AND (end_date IS NULL OR end_date >= now());
  
  -- If discount doesn't exist or isn't active, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if discount applies to all products
  IF discount_record.applies_to = 'all' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if product is specifically included
  IF discount_record.applies_to = 'specific' THEN
    SELECT EXISTS(
      SELECT 1 FROM discount_products 
      WHERE discount_id = p_discount_id 
      AND product_id = p_product_id
    ) INTO is_eligible;
    RETURN is_eligible;
  END IF;
  
  -- Check if product category is included
  IF discount_record.applies_to = 'category' THEN
    SELECT EXISTS(
      SELECT 1 FROM discount_products dp
      JOIN products p ON p.category = dp.category
      WHERE dp.discount_id = p_discount_id 
      AND p.id = p_product_id
    ) INTO is_eligible;
    RETURN is_eligible;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Create trigger for updating updated_at on settings
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial settings
INSERT INTO public.settings (key, value, description) 
VALUES 
  ('special_offers_visible', 'true', 'Controls visibility of Special Offers section on homepage'),
  ('special_offers_title', '"🔥 Special Offers"', 'Title text for Special Offers section'),
  ('special_offers_subtitle', '"Don''t miss out on our limited-time deals and exclusive discounts"', 'Subtitle text for Special Offers section')
ON CONFLICT (key) DO NOTHING;