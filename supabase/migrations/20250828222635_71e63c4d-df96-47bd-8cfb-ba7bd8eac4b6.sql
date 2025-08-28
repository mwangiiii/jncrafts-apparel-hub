-- =====================================================
-- PRODUCT TABLE NORMALIZATION MIGRATION (PART 1)
-- =====================================================
-- Creating normalized tables without conflicting views

-- =====================================================
-- 1. CREATE PRODUCT_IMAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON public.product_images(product_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_product_images_order ON public.product_images(product_id, display_order);

-- =====================================================
-- 2. CREATE COLORS MASTER TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.colors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    hex_code VARCHAR(7), -- For color display (#FFFFFF)
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert standard colors
INSERT INTO public.colors (name, hex_code, display_order) VALUES
('Black', '#000000', 1),
('White', '#FFFFFF', 2),
('Red', '#FF0000', 3),
('Blue', '#0000FF', 4),
('Green', '#008000', 5),
('Yellow', '#FFFF00', 6),
('Orange', '#FFA500', 7),
('Purple', '#800080', 8),
('Pink', '#FFC0CB', 9),
('Brown', '#A52A2A', 10),
('Gray', '#808080', 11),
('Navy', '#000080', 12),
('Beige', '#F5F5DC', 13),
('Maroon', '#800000', 14),
('Teal', '#008080', 15)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 3. CREATE PRODUCT_COLORS JUNCTION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.product_colors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    color_id UUID NOT NULL REFERENCES public.colors(id) ON DELETE CASCADE,
    stock_quantity INTEGER DEFAULT 0,
    additional_price DECIMAL(10,2) DEFAULT 0.00,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, color_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_colors_product_id ON public.product_colors(product_id);
CREATE INDEX IF NOT EXISTS idx_product_colors_color_id ON public.product_colors(color_id);
CREATE INDEX IF NOT EXISTS idx_product_colors_available ON public.product_colors(product_id, is_available) WHERE is_available = true;

-- =====================================================
-- 4. CREATE SIZES MASTER TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sizes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(10) NOT NULL UNIQUE,
    category VARCHAR(20) DEFAULT 'clothing', -- clothing, shoes, etc.
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert standard clothing sizes
INSERT INTO public.sizes (name, category, display_order) VALUES
('XS', 'clothing', 1),
('S', 'clothing', 2),
('M', 'clothing', 3),
('L', 'clothing', 4),
('XL', 'clothing', 5),
('XXL', 'clothing', 6),
('XXXL', 'clothing', 7),
('4XL', 'clothing', 8),
('5XL', 'clothing', 9),
('6', 'shoes', 10),
('7', 'shoes', 11),
('8', 'shoes', 12),
('9', 'shoes', 13),
('10', 'shoes', 14),
('11', 'shoes', 15),
('12', 'shoes', 16),
('One Size', 'generic', 20)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 5. CREATE PRODUCT_SIZES JUNCTION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.product_sizes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size_id UUID NOT NULL REFERENCES public.sizes(id) ON DELETE CASCADE,
    stock_quantity INTEGER DEFAULT 0,
    additional_price DECIMAL(10,2) DEFAULT 0.00,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, size_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON public.product_sizes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_size_id ON public.product_sizes(size_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_available ON public.product_sizes(product_id, is_available) WHERE is_available = true;

-- =====================================================
-- 6. CREATE INVENTORY TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.product_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    color_id UUID REFERENCES public.colors(id),
    size_id UUID REFERENCES public.sizes(id),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 5,
    last_restocked TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, color_id, size_id)
);

-- Create indexes for inventory
CREATE INDEX IF NOT EXISTS idx_inventory_product ON public.product_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON public.product_inventory(product_id) 
    WHERE stock_quantity <= reorder_level;
CREATE INDEX IF NOT EXISTS idx_inventory_combo ON public.product_inventory(product_id, color_id, size_id);

-- =====================================================
-- 7. UPDATE TRIGGERS FOR TIMESTAMPS
-- =====================================================
CREATE TRIGGER update_product_images_updated_at 
    BEFORE UPDATE ON public.product_images
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_inventory_updated_at 
    BEFORE UPDATE ON public.product_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. ROW LEVEL SECURITY POLICIES
-- =====================================================
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Colors are publicly readable" ON public.colors FOR SELECT USING (true);
CREATE POLICY "Sizes are publicly readable" ON public.sizes FOR SELECT USING (true);
CREATE POLICY "Product images are publicly readable" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Product colors are publicly readable" ON public.product_colors FOR SELECT USING (true);
CREATE POLICY "Product sizes are publicly readable" ON public.product_sizes FOR SELECT USING (true);
CREATE POLICY "Inventory is publicly readable" ON public.product_inventory FOR SELECT USING (true);

-- Admin policies
CREATE POLICY "Admins can manage product images" ON public.product_images
FOR ALL USING ((select auth.jwt()) ->> 'role' = 'admin');

CREATE POLICY "Admins can manage colors" ON public.colors
FOR ALL USING ((select auth.jwt()) ->> 'role' = 'admin');

CREATE POLICY "Admins can manage product colors" ON public.product_colors
FOR ALL USING ((select auth.jwt()) ->> 'role' = 'admin');

CREATE POLICY "Admins can manage sizes" ON public.sizes
FOR ALL USING ((select auth.jwt()) ->> 'role' = 'admin');

CREATE POLICY "Admins can manage product sizes" ON public.product_sizes
FOR ALL USING ((select auth.jwt()) ->> 'role' = 'admin');

CREATE POLICY "Admins can manage inventory" ON public.product_inventory
FOR ALL USING ((select auth.jwt()) ->> 'role' = 'admin');