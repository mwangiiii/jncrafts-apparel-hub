// Save this as: supabase/functions/paystack-initialize/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, email, orderNumber } = await req.json()

    if (!amount || !email || !orderNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, email, orderNumber' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!PAYSTACK_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Paystack secret key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Paystack transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to kobo/cents
        email,
        reference: orderNumber,
        callback_url: `${req.headers.get('origin')}/payment-success?reference=${orderNumber}`,
      }),
    })

    const paystackData = await paystackResponse.json()

    if (!paystackResponse.ok) {
      console.error('Paystack error:', paystackData)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to initialize Paystack payment',
          message: paystackData.message 
        }),
        { 
          status: paystackResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        authorizationUrl: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Paystack initialization error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})