/// <reference lib="deno.ns" />
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers for handling cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Supabase Edge Function for M-Pesa Callback
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const paymentData = await req.json();

    console.log('Received M-Pesa callback:', JSON.stringify(paymentData, null, 2));

    // Handle different M-Pesa callback structures
    let transactionData;
    
    // Check if it's the stkpush callback structure
    if (paymentData.Body?.stkCallback) {
      const stkCallback = paymentData.Body.stkCallback;
      transactionData = {
        merchant_request_id: stkCallback.MerchantRequestID,
        checkout_request_id: stkCallback.CheckoutRequestID,
        result_code: stkCallback.ResultCode,
        result_desc: stkCallback.ResultDesc,
        transaction_id: null,
        phone: null,
        amount: null,
        receipt_number: null,
        transaction_date: null,
        status: stkCallback.ResultCode === 0 ? 'success' : 'failed',
        raw: paymentData,
      };

      // Extract callback metadata if payment was successful
      if (stkCallback.ResultCode === 0 && stkCallback.CallbackMetadata?.Item) {
        const items = stkCallback.CallbackMetadata.Item;
        for (const item of items) {
          switch (item.Name) {
            case 'Amount':
              transactionData.amount = item.Value;
              break;
            case 'MpesaReceiptNumber':
              transactionData.receipt_number = item.Value;
              transactionData.transaction_id = item.Value;
              break;
            case 'PhoneNumber':
              transactionData.phone = item.Value?.toString();
              break;
            case 'TransactionDate':
              transactionData.transaction_date = item.Value;
              break;
          }
        }
      }
    } else {
      // Handle other callback formats
      transactionData = {
        merchant_request_id: paymentData.MerchantRequestID || null,
        checkout_request_id: paymentData.CheckoutRequestID || null,
        transaction_id: paymentData.TransactionID || paymentData.transaction_id || null,
        phone: paymentData.PhoneNumber || paymentData.phone || null,
        amount: paymentData.Amount || paymentData.amount || null,
        result_code: paymentData.ResultCode || null,
        result_desc: paymentData.ResultDesc || paymentData.result_desc || null,
        receipt_number: paymentData.MpesaReceiptNumber || paymentData.receipt_number || null,
        transaction_date: paymentData.TransactionDate || null,
        status: (paymentData.ResultCode === 0 || paymentData.ResultCode === '0' || paymentData.status === 'success') ? 'success' : 'failed',
        raw: paymentData,
      };
    }

    // Insert payment record into 'payment_records' table
    const { data, error } = await supabase
      .from('payment_records')
      .insert([{
        merchant_request_id: transactionData.merchant_request_id,
        checkout_request_id: transactionData.checkout_request_id,
        transaction_id: transactionData.transaction_id,
        phone: transactionData.phone,
        amount: transactionData.amount,
        result_code: transactionData.result_code,
        result_desc: transactionData.result_desc,
        receipt_number: transactionData.receipt_number,
        transaction_date: transactionData.transaction_date,
        status: transactionData.status,
        raw: transactionData.raw,
        created_at: new Date().toISOString(),
      }]);

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Payment record inserted successfully:', data);

    // M-Pesa expects a specific response format
    return new Response(JSON.stringify({ 
      ResultCode: 0,
      ResultDesc: "Success" 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Callback processing error:', err);
    
    // Still return success to M-Pesa to avoid retries, but log the error
    return new Response(JSON.stringify({ 
      ResultCode: 0,
      ResultDesc: "Success" 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});