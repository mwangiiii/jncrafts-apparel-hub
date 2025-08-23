-- Create table for invoice and receipt metadata
CREATE TABLE public.invoice_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'receipt')),
  document_number TEXT NOT NULL UNIQUE,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_receipts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage invoice receipts"
ON public.invoice_receipts
FOR ALL
USING (is_admin(auth.uid()));

-- Create index for better performance
CREATE INDEX idx_invoice_receipts_order_id ON public.invoice_receipts(order_id);
CREATE INDEX idx_invoice_receipts_document_type ON public.invoice_receipts(document_type);