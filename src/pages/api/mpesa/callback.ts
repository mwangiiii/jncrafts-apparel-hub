
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const paymentData = req.body;

  // Insert payment record into 'payment_records' table
  const { data, error } = await supabase
    .from('payment_records')
    .insert([{
      transaction_id: paymentData?.TransactionID || paymentData?.transaction_id,
      phone: paymentData?.PhoneNumber || paymentData?.phone,
      amount: paymentData?.Amount || paymentData?.amount,
      status: paymentData?.ResultCode === '0' || paymentData?.status === 'success' ? 'success' : 'failed',
      raw: paymentData,
      created_at: new Date().toISOString(),
    }]);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, data });
}