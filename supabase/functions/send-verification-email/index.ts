import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  email: string;
  token: string;
  confirmUrl: string;
  fullName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, token, confirmUrl, fullName }: VerificationEmailRequest = await req.json();

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your jnCrafts Account</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
          .logo { color: white; font-size: 32px; font-weight: bold; margin: 0; }
          .content { padding: 40px 20px; }
          .welcome { font-size: 24px; color: #333; margin-bottom: 20px; }
          .message { color: #666; line-height: 1.6; margin-bottom: 30px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          .code { background-color: #f1f3f4; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">jnCrafts</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Premium clothing for the modern lifestyle</p>
          </div>
          
          <div class="content">
            <h2 class="welcome">Welcome${fullName ? ` ${fullName}` : ''}!</h2>
            
            <p class="message">
              Thank you for joining jnCrafts! To complete your account setup and start shopping our premium collection, please verify your email address.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p class="message">
              Or copy and paste this link into your browser:
            </p>
            <div class="code">${confirmUrl}</div>
            
            <p class="message">
              This verification link will expire in 24 hours for security reasons.
            </p>
            
            <p class="message">
              If you didn't create an account with jnCrafts, you can safely ignore this email.
            </p>
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
      subject: "Verify Your jnCrafts Account",
      html: emailHtml,
    });

    console.log("Verification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
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