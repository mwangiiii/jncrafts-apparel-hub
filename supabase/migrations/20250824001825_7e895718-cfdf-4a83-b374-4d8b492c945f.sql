-- Add new arrival timestamp to products for automatic badge management
ALTER TABLE public.products 
ADD COLUMN new_arrival_date TIMESTAMP WITH TIME ZONE;

-- Add about section media management
CREATE TABLE public.about_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  media_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on about_media
ALTER TABLE public.about_media ENABLE ROW LEVEL SECURITY;

-- Create policies for about_media
CREATE POLICY "Everyone can view active about media" 
ON public.about_media 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage about media" 
ON public.about_media 
FOR ALL 
USING (is_admin(auth.uid()));

-- Add homepage featured products for animations
CREATE TABLE public.homepage_featured (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on homepage_featured
ALTER TABLE public.homepage_featured ENABLE ROW LEVEL SECURITY;

-- Create policies for homepage_featured
CREATE POLICY "Everyone can view active featured products" 
ON public.homepage_featured 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage featured products" 
ON public.homepage_featured 
FOR ALL 
USING (is_admin(auth.uid()));

-- Create storage buckets for local videos and media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-videos', 'product-videos', true, 52428800, ARRAY['video/mp4', 'video/mov', 'video/avi', 'video/webm']),
  ('about-media', 'about-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/mov', 'video/webm']);

-- Create storage policies for product videos
CREATE POLICY "Product videos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-videos');

CREATE POLICY "Admins can upload product videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'product-videos' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update product videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'product-videos' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete product videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'product-videos' AND is_admin(auth.uid()));

-- Create storage policies for about media
CREATE POLICY "About media is publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'about-media');

CREATE POLICY "Admins can upload about media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'about-media' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update about media" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'about-media' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete about media" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'about-media' AND is_admin(auth.uid()));

-- Function to check if product is new arrival (within 10 days)
CREATE OR REPLACE FUNCTION public.is_new_arrival(product_new_arrival_date TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT product_new_arrival_date IS NOT NULL 
  AND product_new_arrival_date > (now() - interval '10 days');
$$;

-- Add trigger to update timestamps
CREATE TRIGGER update_about_media_updated_at
BEFORE UPDATE ON public.about_media
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();