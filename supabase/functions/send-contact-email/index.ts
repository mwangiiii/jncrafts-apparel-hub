import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  phone: string;
  subject?: string;
  inquiryType?: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      name, 
      email, 
      phone, 
      subject, 
      inquiryType, 
      message 
    }: ContactRequest = await req.json();

    // Format email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Message</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .field-group { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .field-label { font-weight: bold; color: #667eea; margin-bottom: 5px; }
          .field-value { margin-bottom: 15px; }
          .message-box { background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 New Contact Form Message</h1>
            <p>You have received a new message from your website</p>
          </div>
          <div class="content">
            <div class="field-group">
              <div class="field-label">👤 Customer Name:</div>
              <div class="field-value">${name}</div>
              
              <div class="field-label">📧 Email Address:</div>
              <div class="field-value">${email}</div>
              
              <div class="field-label">📱 Phone Number:</div>
              <div class="field-value">${phone}</div>
              
              ${inquiryType ? `
              <div class="field-label">🏷️ Inquiry Type:</div>
              <div class="field-value">${inquiryType}</div>
              ` : ''}
              
              ${subject ? `
              <div class="field-label">📋 Subject:</div>
              <div class="field-value">${subject}</div>
              ` : ''}
            </div>
            
            <div class="message-box">
              <div class="field-label">💬 Message:</div>
              <div class="field-value">${message}</div>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-radius: 8px;">
              <p><strong>💡 Response Required:</strong> Please respond to this customer inquiry promptly to provide excellent customer service.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "JN Crafts Contact <craftsjn@gmail.com>",
      to: ["craftsjn@gmail.com"],
      subject: `New Contact Form Message from ${name}${subject ? ` - ${subject}` : ''}`,
      html: emailHtml,
      replyTo: email,
    });

    console.log("Contact email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending contact email:", error);
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