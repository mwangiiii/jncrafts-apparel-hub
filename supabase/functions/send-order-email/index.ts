import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrderEmailRequest {
  email: string;
  orderNumber: string;
  customerName: string;
  orderStatus: string;
  items: Array<{
    product_name: string;
    quantity: number;
    size: string;
    color: string;
    price: number;
  }>;
  totalAmount: number;
  discountAmount?: number;
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
  };
}

const getStatusMessage = (status: string) => {
  switch (status) {
    case 'pending':
      return {
        subject: 'Order Confirmation - Your jnCrafts Order',
        title: 'Thank you for your order!',
        message: 'We have received your order and it is being processed. You will receive updates as your order progresses.',
        color: '#f59e0b'
      };
    case 'confirmed':
      return {
        subject: 'Order Confirmed - jnCrafts Order',
        title: 'Your order has been confirmed!',
        message: 'Great news! Your order has been confirmed and will be prepared for processing shortly.',
        color: '#3b82f6'
      };
    case 'processing':
      return {
        subject: 'Order Processing - jnCrafts Order',
        title: 'Your order is being processed!',
        message: 'Your order is currently being prepared for shipment. We\'ll notify you once it ships.',
        color: '#f97316'
      };
    case 'shipped':
      return {
        subject: 'Order Shipped - jnCrafts Order',
        title: 'Your order has shipped!',
        message: 'Exciting news! Your order is on its way to you. You should receive it within 3-5 business days.',
        color: '#8b5cf6'
      };
    case 'delivered':
      return {
        subject: 'Order Delivered - jnCrafts Order',
        title: 'Your order has been delivered!',
        message: 'Your order has been successfully delivered. We hope you love your new jnCrafts items!',
        color: '#10b981'
      };
    case 'cancelled':
      return {
        subject: 'Order Cancelled - jnCrafts Order',
        title: 'Your order has been cancelled',
        message: 'Your order has been cancelled. If you have any questions, please contact our support team.',
        color: '#ef4444'
      };
    default:
      return {
        subject: 'Order Update - jnCrafts Order',
        title: 'Order Update',
        message: 'There has been an update to your order status.',
        color: '#6b7280'
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      email,
      orderNumber,
      customerName,
      orderStatus,
      items,
      totalAmount,
      discountAmount = 0,
      shippingAddress
    }: OrderEmailRequest = await req.json();

    const statusInfo = getStatusMessage(orderStatus);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${statusInfo.subject}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
          .logo { color: white; font-size: 32px; font-weight: bold; margin: 0; }
          .content { padding: 40px 20px; }
          .status-badge { display: inline-block; background: ${statusInfo.color}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
          .order-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .item { border-bottom: 1px solid #e9ecef; padding: 15px 0; display: flex; justify-content: space-between; }
          .item:last-child { border-bottom: none; }
          .total { background-color: #667eea; color: white; padding: 15px; border-radius: 8px; margin-top: 20px; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">jnCrafts</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Premium clothing for the modern lifestyle</p>
          </div>
          
          <div class="content">
            <h2>${statusInfo.title}</h2>
            <div class="status-badge">${orderStatus.toUpperCase()}</div>
            
            <p>${statusInfo.message}</p>
            
            <div class="order-details">
              <h3>Order Details</h3>
              <p><strong>Order Number:</strong> ${orderNumber}</p>
              <p><strong>Customer:</strong> ${customerName}</p>
              
              <h4>Items Ordered:</h4>
              ${items.map(item => `
                <div class="item">
                  <div>
                    <strong>${item.product_name}</strong><br>
                    Size: ${item.size} | Color: ${item.color}<br>
                    Quantity: ${item.quantity}
                  </div>
                  <div>$${item.price.toFixed(2)}</div>
                </div>
              `).join('')}
              
              <div class="total">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span><strong>Subtotal:</strong></span>
                  <span>$${(totalAmount + discountAmount).toFixed(2)}</span>
                </div>
                ${discountAmount > 0 ? `
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <span><strong>Discount:</strong></span>
                    <span>-$${discountAmount.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.3);">
                  <span><strong>Total:</strong></span>
                  <span><strong>$${totalAmount.toFixed(2)}</strong></span>
                </div>
              </div>
              
              <h4>Shipping Address:</h4>
              <p>
                ${shippingAddress.address}<br>
                ${shippingAddress.city}, ${shippingAddress.postalCode}
              </p>
            </div>
            
            <p>If you have any questions about your order, please contact our customer service team.</p>
          </div>
          
          <div class="footer">
            <p><strong>jnCrafts</strong> - Premium Clothing</p>
            <p>© 2024 jnCrafts. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "jnCrafts <noreply@jncrafts.com>",
      to: [email],
      subject: `${statusInfo.subject} #${orderNumber}`,
      html: emailHtml,
    });

    console.log("Order email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending order email:", error);
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