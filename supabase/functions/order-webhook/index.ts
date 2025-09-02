import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, newStatus, adminId } = await req.json();

    console.log('Order webhook triggered:', { orderId, newStatus, adminId });

    // Get the order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Failed to fetch order: ${orderError?.message}`);
    }

    // Send comprehensive status update email to both customer and admin
    const emailResponse = await supabase.functions.invoke('send-order-status-update', {
      body: {
        customerEmail: order.customer_info.email,
        adminEmail: "craftsjn@gmail.com",
        orderNumber: order.order_number,
        customerName: order.customer_info.fullName || order.customer_info.full_name,
        orderStatus: newStatus,
        items: order.order_items.map((item: any) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          price: item.price
        })),
        totalAmount: order.total_amount,
        discountAmount: order.discount_amount || 0,
        shippingAddress: order.shipping_address,
        currency: {
          code: 'KES',
          symbol: 'KSh'
        }
      }
    });

    if (emailResponse.error) {
      console.error('Email sending failed:', emailResponse.error);
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }

    console.log('Order status update emails sent successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Order status updated and emails sent',
      emailResponse: emailResponse.data
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in order webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);