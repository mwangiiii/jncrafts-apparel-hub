import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'No authorization header'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Invalid token'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Check admin status
    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!adminCheck) {
      return new Response(JSON.stringify({
        error: 'Forbidden',
        message: 'Admin access required'
      }), {
        status: 403,
        headers: corsHeaders
      });
    }

    const body = await req.json();
    const {
      orderId,
      statusId,
      statusName,
      statusDisplayName,
      customerEmail,
      orderNumber,
      customerName,
      orderItems,
      totalAmount,
      discountAmount,
      shippingAddress
    } = body;

    if (!orderId || !statusId) {
      return new Response(JSON.stringify({
        error: 'Bad Request',
        message: 'orderId and statusId are required'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Update order status using service role (bypasses RLS)
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status_id: statusId,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    // Send email notification (fire and forget)
    if (customerEmail) {
      supabase.functions.invoke('send-order-status-update', {
        body: {
          customerEmail,
          adminEmail: 'craftsjn@gmail.com',
          orderNumber,
          customerName: customerName || 'Customer',
          orderStatus: statusName,
          items: orderItems || [],
          totalAmount,
          discountAmount,
          shippingAddress,
          currency: { code: 'KES', symbol: 'KSh' }
        }
      }).catch((emailError) => {
        console.error('Email failed (non-critical):', emailError);
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Order status updated to ${statusDisplayName}`,
      orderId,
      statusId
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});