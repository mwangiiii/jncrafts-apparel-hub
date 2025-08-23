import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AdminNotificationRequest {
  type: 'cart_addition' | 'new_order';
  customerEmail: string;
  customerName: string;
  productDetails?: {
    name: string;
    size: string;
    color: string;
    price: number;
    quantity: number;
  };
  orderDetails?: {
    orderNumber: string;
    items: Array<{
      product_name: string;
      quantity: number;
      size: string;
      color: string;
      price: number;
    }>;
    totalAmount: number;
    shippingAddress: {
      address: string;
      city: string;
      postalCode: string;
    };
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      type, 
      customerEmail, 
      customerName, 
      productDetails, 
      orderDetails 
    }: AdminNotificationRequest = await req.json();

    let subject: string;
    let emailHtml: string;

    if (type === 'cart_addition' && productDetails) {
      subject = `🛒 Customer Added Item to Cart - ${customerName}`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Cart Addition Notification</title>
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .product-info { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .customer-info { background: #e3f2fd; padding: 15px; margin: 15px 0; border-radius: 8px; }
            .price { font-size: 24px; font-weight: bold; color: #667eea; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛒 New Cart Addition</h1>
              <p>A customer just added an item to their cart!</p>
            </div>
            <div class="content">
              <div class="customer-info">
                <h3>👤 Customer Information</h3>
                <p><strong>Name:</strong> ${customerName}</p>
                <p><strong>Email:</strong> ${customerEmail}</p>
              </div>
              
              <div class="product-info">
                <h3>🛍️ Product Added</h3>
                <p><strong>Product:</strong> ${productDetails.name}</p>
                <p><strong>Size:</strong> ${productDetails.size}</p>
                <p><strong>Color:</strong> ${productDetails.color}</p>
                <p><strong>Quantity:</strong> ${productDetails.quantity}</p>
                <p class="price">Price: $${productDetails.price.toFixed(2)}</p>
              </div>
              
              <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-radius: 8px;">
                <p><strong>💡 Action Suggestion:</strong> Consider following up with this customer to help them complete their purchase!</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'new_order' && orderDetails) {
      subject = `🎉 New Order Received - ${orderDetails.orderNumber}`;
      
      const itemsHtml = orderDetails.items.map(item => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px;">${item.product_name}</td>
          <td style="padding: 10px; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px;">${item.size}</td>
          <td style="padding: 10px;">${item.color}</td>
          <td style="padding: 10px; text-align: right;">$${item.price.toFixed(2)}</td>
        </tr>
      `).join('');

      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Order Notification</title>
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-info { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .customer-info { background: #e8f5e8; padding: 15px; margin: 15px 0; border-radius: 8px; }
            .total { font-size: 24px; font-weight: bold; color: #28a745; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th { background: #f8f9fa; padding: 12px; text-align: left; font-weight: bold; }
            .urgent { background: #dc3545; color: white; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 New Order Received!</h1>
              <p>Order #${orderDetails.orderNumber}</p>
            </div>
            <div class="content">
              <div class="urgent">
                <h3>⚡ URGENT: New order requires processing!</h3>
              </div>
              
              <div class="customer-info">
                <h3>👤 Customer Information</h3>
                <p><strong>Name:</strong> ${customerName}</p>
                <p><strong>Email:</strong> ${customerEmail}</p>
                <p><strong>Shipping Address:</strong><br>
                   ${orderDetails.shippingAddress.address}<br>
                   ${orderDetails.shippingAddress.city}, ${orderDetails.shippingAddress.postalCode}
                </p>
              </div>
              
              <div class="order-info">
                <h3>📦 Order Items</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style="text-align: center;">Qty</th>
                      <th>Size</th>
                      <th>Color</th>
                      <th style="text-align: right;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
                <div class="total">
                  Total: $${orderDetails.totalAmount.toFixed(2)}
                </div>
              </div>
              
              <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-radius: 8px;">
                <p><strong>📋 Next Steps:</strong></p>
                <ul>
                  <li>Process the order in your admin dashboard</li>
                  <li>Prepare items for shipping</li>
                  <li>Update order status once shipped</li>
                  <li>Send tracking information to customer</li>
                </ul>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      throw new Error('Invalid notification type or missing details');
    }

    const emailResponse = await resend.emails.send({
      from: "jnCrafts Admin <craftsjn@gmail.com>",
      to: ["craftsjn@gmail.com"], // Admin email - updated to new address
      subject: subject,
      html: emailHtml,
    });

    console.log("Admin notification sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending admin notification:", error);
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