import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Stock alert notification function called");

    // Get all pending stock alerts for products that are back in stock
    const { data: alertsData, error: alertsError } = await supabase
      .from('stock_alerts')
      .select(`
        *,
        products:product_id (
          id,
          name,
          price,
          stock_quantity,
          images
        )
      `)
      .eq('notified', false);

    if (alertsError) {
      console.error("Error fetching stock alerts:", alertsError);
      throw alertsError;
    }

    if (!alertsData || alertsData.length === 0) {
      console.log("No pending stock alerts found");
      return new Response(
        JSON.stringify({ message: "No pending alerts" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Found ${alertsData.length} pending stock alerts`);

    // Filter alerts for products that are actually back in stock
    const validAlerts = alertsData.filter(alert => 
      alert.products && alert.products.stock_quantity > 0
    );

    if (validAlerts.length === 0) {
      console.log("No valid alerts for products back in stock");
      return new Response(
        JSON.stringify({ message: "No valid alerts" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send email notifications
    const emailPromises = validAlerts.map(async (alert) => {
      try {
        const product = alert.products;
        const emailResponse = await resend.emails.send({
          from: "jnCrafts <noreply@jncrafts.com>",
          to: [alert.email],
          subject: `${product.name} is back in stock!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Great news!</h1>
              <p>The product you requested an alert for is now back in stock:</p>
              
              <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 8px;">
                ${product.images && product.images[0] ? 
                  `<img src="${product.images[0]}" alt="${product.name}" style="width: 200px; height: 200px; object-fit: cover; border-radius: 4px;" />` 
                  : ''
                }
                <h2 style="color: #333; margin: 10px 0;">${product.name}</h2>
                <p style="font-size: 24px; font-weight: bold; color: #e67e22;">$${product.price}</p>
                <p style="color: #666;">Currently in stock: ${product.stock_quantity} items</p>
              </div>
              
              <p>
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('https://', 'https://')}/product/${product.id}" 
                   style="background-color: #e67e22; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                  View Product
                </a>
              </p>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                This is an automated notification. You received this email because you signed up for stock alerts on jnCrafts.
              </p>
            </div>
          `,
        });

        console.log(`Email sent to ${alert.email} for product ${product.name}`);
        return { alertId: alert.id, success: true, emailResponse };
      } catch (error) {
        console.error(`Failed to send email to ${alert.email}:`, error);
        return { alertId: alert.id, success: false, error };
      }
    });

    const emailResults = await Promise.all(emailPromises);
    
    // Mark successful alerts as notified
    const successfulAlertIds = emailResults
      .filter(result => result.success)
      .map(result => result.alertId);

    if (successfulAlertIds.length > 0) {
      const { error: updateError } = await supabase
        .from('stock_alerts')
        .update({ notified: true })
        .in('id', successfulAlertIds);

      if (updateError) {
        console.error("Error updating alert status:", updateError);
      } else {
        console.log(`Marked ${successfulAlertIds.length} alerts as notified`);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Stock alert notifications processed",
        totalAlerts: validAlerts.length,
        successfulEmails: successfulAlertIds.length,
        failedEmails: emailResults.length - successfulAlertIds.length
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in stock-alert-notifications function:", error);
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