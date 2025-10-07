/// <reference lib="deno.ns" />
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

// M-Pesa API URLs
const MPESA_BASE_URL = 'https://sandbox.safaricom.co.ke'; // Change to https://api.safaricom.co.ke for production

interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

interface MPesaAuthResponse {
  access_token: string;
  expires_in: string;
}

interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

// Generate timestamp in the format YYYYMMDDHHMMSS
function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// Generate password for STK Push
function generatePassword(businessShortcode: string, passkey: string, timestamp: string): string {
  const data = businessShortcode + passkey + timestamp;
  return btoa(data);
}

// Get M-Pesa access token
async function getAccessToken(): Promise<string> {
  const consumerKey = Deno.env.get('CONSUMER_KEY');
  const consumerSecret = Deno.env.get('CONSUMER_SECRET');
  
  if (!consumerKey || !consumerSecret) {
    throw new Error('Consumer key or secret not found in environment variables');
  }
  
  const auth = btoa(`${consumerKey}:${consumerSecret}`);
  
  try {
    const response = await fetch(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Auth error response:', errorText);
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }
    
    const data: MPesaAuthResponse = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw new Error(`Failed to get access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Format phone number to required format (254XXXXXXXXX)
function formatPhoneNumber(phone: string): string {
  // Remove any spaces, dashes, or plus signs
  let cleaned = phone.replace(/[\s\-\+]/g, '');
  
  // If it starts with 0, replace with 254
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  
  // If it doesn't start with 254, add it
  if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  
  return cleaned;
}

// Initiate STK Push
async function initiateSTKPush(accessToken: string, stkRequest: STKPushRequest): Promise<STKPushResponse> {
  const businessShortcode = Deno.env.get('BUSINESS_SHORTCODE');
  const passkey = Deno.env.get('PASSKEY');
  const callbackUrl = Deno.env.get('CALLBACK_URL');
  
  if (!businessShortcode || !passkey || !callbackUrl) {
    throw new Error('Missing required environment variables');
  }
  
  const timestamp = generateTimestamp();
  const password = generatePassword(businessShortcode, passkey, timestamp);
  const formattedPhone = formatPhoneNumber(stkRequest.phoneNumber);
  
  const stkPushPayload = {
    BusinessShortCode: businessShortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: stkRequest.amount,
    PartyA: formattedPhone,
    PartyB: businessShortcode,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl,
    AccountReference: stkRequest.accountReference,
    TransactionDesc: stkRequest.transactionDesc
  };
  
  try {
    const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stkPushPayload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('STK Push error response:', errorText);
      throw new Error(`STK Push failed: ${response.status} ${response.statusText}`);
    }
    
    const data: STKPushResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error initiating STK Push:', error);
    throw new Error(`Failed to initiate STK Push: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  // Environment check for GET requests
  if (req.method === 'GET') {
    try {
      const envCheck = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        environment: Deno.env.get('ENVIRONMENT') || 'not set',
        hasConsumerKey: !!Deno.env.get('CONSUMER_KEY'),
        hasConsumerSecret: !!Deno.env.get('CONSUMER_SECRET'),
        hasBusinessShortcode: !!Deno.env.get('BUSINESS_SHORTCODE'),
        hasPasskey: !!Deno.env.get('PASSKEY'),
        hasCallbackUrl: !!Deno.env.get('CALLBACK_URL'),
        consumerKeyLength: Deno.env.get('CONSUMER_KEY')?.length || 0,
        consumerSecretLength: Deno.env.get('CONSUMER_SECRET')?.length || 0,
        baseUrl: MPESA_BASE_URL,
        status: 'Environment check successful'
      };
      
      return new Response(JSON.stringify(envCheck, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Environment check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, null, 2), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
  }
  
  // Handle STK Push requests
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      
      // Validate required fields
      if (!body.phoneNumber || !body.amount || !body.accountReference) {
        return new Response(JSON.stringify({
          error: 'Missing required fields',
          required: ['phoneNumber', 'amount', 'accountReference'],
          timestamp: new Date().toISOString()
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      const stkRequest: STKPushRequest = {
        phoneNumber: body.phoneNumber,
        amount: body.amount,
        accountReference: body.accountReference,
        transactionDesc: body.transactionDesc || 'Payment'
      };
      
      console.log('STK Push request:', stkRequest);
      
      // Get access token
      const accessToken = await getAccessToken();
      console.log('Access token obtained successfully');
      
      // Initiate STK Push
      const result = await initiateSTKPush(accessToken, stkRequest);
      console.log('STK Push result:', result);
      
      return new Response(JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
      
    } catch (error) {
      console.error('STK Push error:', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
  }
  
  return new Response(JSON.stringify({
    error: 'Method not allowed',
    allowedMethods: ['GET', 'POST', 'OPTIONS']
  }), {
    status: 405,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
});