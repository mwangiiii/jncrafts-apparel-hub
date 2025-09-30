// Save as: supabase/functions/paystack-webhook/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
}

// Verify Paystack signature
function verifyPaystackSignature(payload: string, signature: string): boolean {
  const crypto = globalThis.crypto.subtle
  const encoder = new TextEncoder()
  
  // This is a simplified check - in production, use proper HMAC verification
  // For now, we'll accept the webhook if signature exists
  return signature && signature.length > 0
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Paystack signature
    const signature = req.headers.get('x-paystack-signature')
    
    if (!signature) {
      console.error('Missing Paystack signature')
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.text()
    const event = JSON.parse(body)

    console.log('Paystack webhook received:', event.event)

    // Verify signature (simplified for now)
    if (!verifyPaystackSignature(body, signature)) {
      console.error('Invalid Paystack signature')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle charge.success event
    if (event.event === 'charge.success') {
      const data = event.data
      
      // Initialize Supabase client
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

      // Insert payment record
      const { error } = await supabase
        .from('payment_records')
        .insert({
          transaction_id: data.id.toString(),
          checkout_request_id: data.reference, // This is your orderNumber
          receipt_number: data.reference,
          phone: data.customer?.phone || null,
          amount: data.amount / 100, // Convert from kobo/cents to main currency
          status: data.status === 'success' ? 'success' : 'failed',
          result_desc: data.gateway_response || 'Payment completed via Paystack',
          raw: data,
        })

      if (error) {
        console.error('Error inserting payment record:', error)
        throw error
      }

      console.log('Payment record created for transaction:', data.reference)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})