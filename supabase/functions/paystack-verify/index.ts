import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method Not Allowed'
    }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const { reference } = await req.json();

    if (!reference) {
      return new Response(JSON.stringify({
        error: 'Missing reference'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Verify transaction with Paystack
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({
        success: false,
        message: data.message || 'Verification failed'
      }), {
        status: response.status,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({
      success: data.status,
      status: data.data?.status,
      amount: data.data?.amount / 100,
      transactionId: data.data?.id,
      reference: data.data?.reference,
      paidAt: data.data?.paid_at,
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Verification error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});