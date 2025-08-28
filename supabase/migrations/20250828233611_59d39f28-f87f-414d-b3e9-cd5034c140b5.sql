-- Add missing t-shirt sizes if they don't exist
INSERT INTO sizes (name, category, display_order, is_active) 
SELECT 'XS', 'tshirt', 1, true
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = 'XS' AND category = 'tshirt');

INSERT INTO sizes (name, category, display_order, is_active) 
SELECT 'S', 'tshirt', 2, true
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = 'S' AND category = 'tshirt');

INSERT INTO sizes (name, category, display_order, is_active) 
SELECT 'M', 'tshirt', 3, true
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = 'M' AND category = 'tshirt');

INSERT INTO sizes (name, category, display_order, is_active) 
SELECT 'L', 'tshirt', 4, true
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = 'L' AND category = 'tshirt');

INSERT INTO sizes (name, category, display_order, is_active) 
SELECT 'XL', 'tshirt', 5, true
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = 'XL' AND category = 'tshirt');

INSERT INTO sizes (name, category, display_order, is_active) 
SELECT '2XL', 'tshirt', 6, true
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = '2XL' AND category = 'tshirt');

INSERT INTO sizes (name, category, display_order, is_active) 
SELECT '3XL', 'tshirt', 7, true
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = '3XL' AND category = 'tshirt');

INSERT INTO sizes (name, category, display_order, is_active) 
SELECT '4XL', 'tshirt', 8, true
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = '4XL' AND category = 'tshirt');

INSERT INTO sizes (name, category, display_order, is_active) 
SELECT '5XL', 'tshirt', 9, true
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE name = '5XL' AND category = 'tshirt');