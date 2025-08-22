import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Zones enum
type Zone = 'CBD' | 'Mtaani' | 'Mashinani';
type Service = 'pickup_mtaani' | 'doorstep' | 'pickup_in_town' | 'customer_courier';

// Fallback pricing as per 2025 brochure
const FALLBACK_RATES: Record<string, number> = {
  'CBD->Mtaani_pickup_mtaani': 100,
  'Mtaani->CBD_pickup_mtaani': 100,
  'Mtaani->Mtaani_pickup_mtaani': 180,
  'CBD->Mashinani_pickup_mtaani': 200,
  'Mtaani->Mashinani_pickup_mtaani': 250,
  'CBD->Mtaani_doorstep': 100,
  'Mtaani->CBD_doorstep': 100,
  'Mtaani->Mtaani_doorstep': 180,
  'CBD->Mashinani_doorstep': 200,
  'Mtaani->Mashinani_doorstep': 250,
};

// Cache for API responses (60s TTL)
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds

async function fetchPickupMtaaniRate(origin: Zone, destination: Zone, service: Service): Promise<{
  rate_ksh: number;
  currency: 'KES';
  source: 'official_api' | 'fallback';
  updated_at: string;
}> {
  const cacheKey = `${origin}->${destination}_${service}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`Cache hit for ${cacheKey}`);
    return cached.data;
  }

  try {
    // Try official API first (mock endpoint for now - replace with actual Pickup Mtaani API)
    const apiKey = Deno.env.get('PICKUP_MTAANI_API_KEY');
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    console.log(`Attempting to fetch rate from official API for ${cacheKey}`);
    
    // Mock API call with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    try {
      // This would be the actual Pickup Mtaani API call
      // const response = await fetch(`https://api.pickupmtaani.com/v1/rates?origin=${origin}&destination=${destination}&service=${service}`, {
      //   headers: { 'Authorization': `Bearer ${apiKey}` },
      //   signal: controller.signal
      // });
      
      // For now, simulate API failure to test fallback
      throw new Error('API temporarily unavailable');
      
    } catch (apiError) {
      clearTimeout(timeoutId);
      throw apiError;
    }
    
  } catch (error) {
    console.log(`Official API failed for ${cacheKey}, using fallback: ${error.message}`);
    
    // Use fallback pricing
    const fallbackKey = `${origin}->${destination}_${service}`;
    const fallbackRate = FALLBACK_RATES[fallbackKey];
    
    if (!fallbackRate) {
      throw new Error(`No fallback rate available for ${origin} -> ${destination} via ${service}`);
    }

    const fallbackData = {
      rate_ksh: fallbackRate,
      currency: 'KES' as const,
      source: 'fallback' as const,
      updated_at: new Date().toISOString(),
    };

    // Cache fallback for shorter duration
    cache.set(cacheKey, { data: fallbackData, timestamp: Date.now() });
    
    return fallbackData;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.request.url);
    const origin = url.searchParams.get('origin_zone') as Zone;
    const destination = url.searchParams.get('dest_zone') as Zone;
    const service = url.searchParams.get('service') as Service;

    if (!origin || !destination || !service) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters: origin_zone, dest_zone, service' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate enum values
    const validZones: Zone[] = ['CBD', 'Mtaani', 'Mashinani'];
    const validServices: Service[] = ['pickup_mtaani', 'doorstep', 'pickup_in_town', 'customer_courier'];

    if (!validZones.includes(origin) || !validZones.includes(destination)) {
      return new Response(
        JSON.stringify({ error: 'Invalid zone. Must be: CBD, Mtaani, or Mashinani' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validServices.includes(service)) {
      return new Response(
        JSON.stringify({ error: 'Invalid service. Must be: pickup_mtaani, doorstep, pickup_in_town, or customer_courier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle special cases
    if (service === 'pickup_in_town') {
      return new Response(
        JSON.stringify({
          rate_ksh: 0, // Configurable admin setting, default 0
          currency: 'KES',
          source: 'system',
          updated_at: new Date().toISOString(),
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (service === 'customer_courier') {
      return new Response(
        JSON.stringify({
          rate_ksh: 0,
          currency: 'KES',
          source: 'system',
          updated_at: new Date().toISOString(),
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // For pickup_mtaani and doorstep, fetch from official API
    const rateData = await fetchPickupMtaaniRate(origin, destination, service);

    return new Response(
      JSON.stringify(rateData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error fetching delivery rate:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch delivery rate',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});