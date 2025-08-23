import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppNotificationRequest {
  type: 'international_order';
  orderDetails: {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
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
    deliveryMethod: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, orderDetails }: WhatsAppNotificationRequest = await req.json();

    if (type !== 'international_order') {
      throw new Error('Invalid notification type');
    }

    // Format the message for WhatsApp
    const itemsList = orderDetails.items.map(item => 
      `• ${item.product_name} (${item.size}, ${item.color}) x${item.quantity} - KES ${item.price.toFixed(2)}`
    ).join('\n');

    const whatsappMessage = encodeURIComponent(`
🌍 *INTERNATIONAL ORDER ALERT* 🌍

📦 *Order #${orderDetails.orderNumber}*

👤 *Customer Information:*
Name: ${orderDetails.customerName}
Email: ${orderDetails.customerEmail}

📍 *Shipping Address:*
${orderDetails.shippingAddress.address}
${orderDetails.shippingAddress.city}, ${orderDetails.shippingAddress.postalCode}

🛍️ *Order Items:*
${itemsList}

💰 *Total Amount: KES ${orderDetails.totalAmount.toFixed(2)}*

📋 *Delivery Method:* ${orderDetails.deliveryMethod}

⚡ *ACTION REQUIRED:*
Please coordinate international shipping arrangements and pricing with this customer.
    `.trim());

    // WhatsApp Business API endpoint (you'll need to set this up)
    const adminWhatsAppNumber = '254710573084'; // Admin WhatsApp number
    const whatsappUrl = `https://wa.me/${adminWhatsAppNumber}?text=${whatsappMessage}`;

    console.log('International order WhatsApp notification prepared:', {
      orderNumber: orderDetails.orderNumber,
      customerName: orderDetails.customerName,
      whatsappUrl: whatsappUrl.substring(0, 100) + '...' // Log truncated URL for privacy
    });

    // Return the WhatsApp URL for the client to open
    return new Response(JSON.stringify({ 
      success: true, 
      whatsappUrl: whatsappUrl,
      message: 'WhatsApp notification prepared successfully'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error preparing WhatsApp notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);