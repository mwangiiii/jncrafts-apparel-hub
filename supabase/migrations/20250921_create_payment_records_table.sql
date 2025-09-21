CREATE TABLE IF NOT EXISTS payment_records (
    id SERIAL PRIMARY KEY,
    merchant_request_id VARCHAR(255),
    checkout_request_id VARCHAR(255),
    transaction_id VARCHAR(255),
    phone VARCHAR(20),
    amount DECIMAL(10, 2),
    result_code INTEGER,
    result_desc TEXT,
    receipt_number VARCHAR(255),
    transaction_date BIGINT,
    status VARCHAR(20) CHECK (status IN ('success', 'failed', 'pending')),
    raw JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_records_transaction_id ON payment_records(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_phone ON payment_records(phone);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status);
CREATE INDEX IF NOT EXISTS idx_payment_records_checkout_request_id ON payment_records(checkout_request_id);