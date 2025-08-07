import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StockAlertRequest {
  email: string;
  productId: string;
  productName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    if (req.method === "POST") {
      const { email, productId, productName }: StockAlertRequest = await req.json();

      if (!email || !productId) {
        return new Response(
          JSON.stringify({ error: "Email and product ID are required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get the user if authenticated
      const authHeader = req.headers.get('Authorization');
      let userId = null;
      if (authHeader) {
        const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
        userId = user?.id;
      }

      // Insert or update stock alert
      const { error } = await supabaseClient
        .from('stock_alerts')
        .upsert({
          email,
          product_id: productId,
          user_id: userId,
          notified: false
        });

      if (error) {
        console.error('Database error:', error);
        return new Response(
          JSON.stringify({ error: "Failed to create stock alert" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ message: "Stock alert created successfully" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Handle sending notifications (called by webhook or scheduled function)
    if (req.method === "GET") {
      // Get all pending stock alerts for products that are now in stock
      const { data: alerts, error: alertsError } = await supabaseClient
        .from('stock_alerts')
        .select(`
          *,
          products (
            name,
            price,
            stock_quantity,
            images
          )
        `)
        .eq('notified', false)
        .gt('products.stock_quantity', 0);

      if (alertsError) {
        console.error('Error fetching alerts:', alertsError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch alerts" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      let sentCount = 0;

      for (const alert of alerts || []) {
        try {
          await resend.emails.send({
            from: "jnCrafts <notifications@jncrafts.com>",
            to: [alert.email],
            subject: `${alert.products.name} is back in stock!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Good news! Your item is back in stock</h2>
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  ${alert.products.images?.[0] ? `<img src="${alert.products.images[0]}" alt="${alert.products.name}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px;">` : ''}
                  <h3>${alert.products.name}</h3>
                  <p style="font-size: 18px; color: #2563eb; font-weight: bold;">$${alert.products.price}</p>
                  <p style="color: #16a34a; font-weight: bold;">✓ Now available - ${alert.products.stock_quantity} in stock</p>
                </div>
                <a href="${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/product/${alert.product_id}" 
                   style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Shop Now
                </a>
                <p style="margin-top: 20px; color: #666; font-size: 14px;">
                  You're receiving this email because you signed up for stock alerts for this product.
                </p>
              </div>
            `,
          });

          // Mark as notified
          await supabaseClient
            .from('stock_alerts')
            .update({ notified: true })
            .eq('id', alert.id);

          sentCount++;
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }

      return new Response(
        JSON.stringify({ message: `Sent ${sentCount} stock alert emails` }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in stock-alerts function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);