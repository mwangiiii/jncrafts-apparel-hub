-- Add 3XL size to the sizes table
INSERT INTO public.sizes (name, category, display_order, is_active)
VALUES ('3XL', 'clothing', 6, true)
ON CONFLICT (name) DO NOTHING;