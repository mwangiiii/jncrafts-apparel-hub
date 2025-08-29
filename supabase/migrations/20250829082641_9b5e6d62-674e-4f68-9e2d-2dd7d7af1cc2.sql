-- Check if products still have old images array format and create proper normalized records
-- First, let's see what the current product structure looks like
DO $$
DECLARE
    product_rec RECORD;
    image_url TEXT;
    image_idx INTEGER;
BEGIN
    -- Loop through products that still have the old images array format
    FOR product_rec IN 
        SELECT id, name, images
        FROM products 
        WHERE images IS NOT NULL 
        AND array_length(images, 1) > 0
        AND NOT EXISTS (SELECT 1 FROM product_images WHERE product_id = products.id)
    LOOP
        -- Extract each image URL from the array and create normalized records
        FOR image_idx IN 1..array_length(product_rec.images, 1)
        LOOP
            image_url := product_rec.images[image_idx];
            
            -- Skip base64 encoded images and only process actual URLs
            IF image_url NOT LIKE 'data:image/%' THEN
                INSERT INTO product_images (product_id, image_url, display_order, is_primary, alt_text)
                VALUES (
                    product_rec.id,
                    image_url,
                    image_idx - 1, -- 0-based ordering
                    image_idx = 1, -- First image is primary
                    product_rec.name || ' - Image ' || image_idx
                );
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Migration completed for products with image arrays';
END
$$;