-- Remove public access to discounts table and create secure validation function

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Everyone can view active discounts" ON public.discounts;
DROP POLICY IF EXISTS "Admins can manage discounts" ON public.discounts;

-- Create a secure function to validate discount codes
CREATE OR REPLACE FUNCTION public.validate_discount_code(
  p_code text,
  p_order_total numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  discount_record RECORD;
BEGIN
  -- Normalize the code to uppercase
  p_code := UPPER(TRIM(p_code));
  
  -- Check if code exists and is valid
  SELECT * INTO discount_record
  FROM discounts
  WHERE code = p_code
    AND is_active = true
    AND requires_code = true
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now());
  
  -- If discount doesn't exist or isn't valid
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'invalid_code',
      'message', 'This promo code is not valid or has expired'
    );
  END IF;
  
  -- Check usage limits
  IF discount_record.usage_limit IS NOT NULL AND discount_record.used_count >= discount_record.usage_limit THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'usage_limit_exceeded',
      'message', 'This promo code has reached its usage limit'
    );
  END IF;
  
  -- Check minimum order amount
  IF discount_record.min_order_amount IS NOT NULL AND p_order_total < discount_record.min_order_amount THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'min_order_not_met',
      'message', 'Minimum order of $' || discount_record.min_order_amount || ' required for this code'
    );
  END IF;
  
  -- Return valid discount (only safe fields)
  RETURN jsonb_build_object(
    'valid', true,
    'discount', jsonb_build_object(
      'id', discount_record.id,
      'name', discount_record.name,
      'description', discount_record.description,
      'discount_type', discount_record.discount_type,
      'discount_value', discount_record.discount_value,
      'code', discount_record.code
    )
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_discount_code(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_discount_code(text, numeric) TO anon;

-- Recreate secure policies
CREATE POLICY "Admins can manage discounts" 
ON public.discounts 
FOR ALL 
USING (is_admin(auth.uid()));

-- Allow public access only to banner messages (not codes)
CREATE POLICY "Public can view discount banners" 
ON public.discounts 
FOR SELECT 
USING (
  is_active = true 
  AND banner_message IS NOT NULL
  AND (start_date IS NULL OR start_date <= now())
  AND (end_date IS NULL OR end_date >= now())
);