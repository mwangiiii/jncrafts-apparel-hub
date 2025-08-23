-- Add transaction_code field to orders table for M-Pesa payment tracking
ALTER TABLE public.orders 
ADD COLUMN transaction_code TEXT;

-- Add index for transaction code lookups
CREATE INDEX idx_orders_transaction_code ON public.orders(transaction_code);

-- Add comment for documentation
COMMENT ON COLUMN public.orders.transaction_code IS 'M-Pesa transaction ID provided by customer as payment confirmation';