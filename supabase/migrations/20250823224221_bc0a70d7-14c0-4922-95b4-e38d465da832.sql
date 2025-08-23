-- Add video support to products table
ALTER TABLE public.products 
ADD COLUMN videos text[] DEFAULT '{}';

-- Add comment to explain video field
COMMENT ON COLUMN public.products.videos IS 'Array of video URLs or file paths for product videos';

-- Add thumbnail_index to specify which image is the primary/featured image
ALTER TABLE public.products 
ADD COLUMN thumbnail_index integer DEFAULT 0;

-- Add comment to explain thumbnail_index field
COMMENT ON COLUMN public.products.thumbnail_index IS 'Index of the primary/featured image in the images array (0-based)';

-- Create index for better performance on video searches
CREATE INDEX idx_products_videos ON public.products USING GIN(videos) WHERE videos IS NOT NULL AND array_length(videos, 1) > 0;