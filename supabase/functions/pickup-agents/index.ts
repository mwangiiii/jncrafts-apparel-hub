import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Zone = 'CBD' | 'Mtaani';

// Mock agent data - in production, this would come from official Pickup Mtaani API or database
const PICKUP_AGENTS = {
  CBD: [
    { id: 'cbd_001', name: 'CBD Main Branch', road: 'Kenyatta Avenue', estate: 'CBD', code: 'CBD001' },
    { id: 'cbd_002', name: 'Nation Centre', road: 'Kimathi Street', estate: 'CBD', code: 'CBD002' },
    { id: 'cbd_003', name: 'Teleposta Towers', road: 'Koinange Street', estate: 'CBD', code: 'CBD003' },
  ],
  Mtaani: [
    // Thika Road
    { id: 'mt_001', name: 'Thika Road Mall', road: 'Thika Road', estate: 'Kasarani', code: 'TH001' },
    { id: 'mt_002', name: 'Garden City Mall', road: 'Thika Road', estate: 'Kasarani', code: 'TH002' },
    { id: 'mt_003', name: 'Roysambu Shopping Center', road: 'Thika Road', estate: 'Roysambu', code: 'TH003' },
    
    // Jogoo Road
    { id: 'mt_004', name: 'Jogoo Road Plaza', road: 'Jogoo Road', estate: 'Makadara', code: 'JG001' },
    { id: 'mt_005', name: 'Nyayo Stadium Area', road: 'Jogoo Road', estate: 'Embakasi', code: 'JG002' },
    
    // Ngong Road
    { id: 'mt_006', name: 'Prestige Plaza', road: 'Ngong Road', estate: 'Kilimani', code: 'NG001' },
    { id: 'mt_007', name: 'Junction Mall', road: 'Ngong Road', estate: 'Dagoretti', code: 'NG002' },
    { id: 'mt_008', name: 'Karen Shopping Centre', road: 'Ngong Road', estate: 'Karen', code: 'NG003' },
    
    // Waiyaki Way
    { id: 'mt_009', name: 'Westgate Shopping Mall', road: 'Waiyaki Way', estate: 'Westlands', code: 'WY001' },
    { id: 'mt_010', name: 'ABC Place', road: 'Waiyaki Way', estate: 'Westlands', code: 'WY002' },
    { id: 'mt_011', name: 'Kangemi Shopping Center', road: 'Waiyaki Way', estate: 'Kangemi', code: 'WY003' },
    
    // Lang'ata Road
    { id: 'mt_012', name: 'Lang\'ata Link', road: 'Lang\'ata Road', estate: 'Lang\'ata', code: 'LG001' },
    { id: 'mt_013', name: 'Oshwal Centre', road: 'Lang\'ata Road', estate: 'South C', code: 'LG002' },
    
    // Kiambu Road
    { id: 'mt_014', name: 'Village Market', road: 'Kiambu Road', estate: 'Gigiri', code: 'KB001' },
    { id: 'mt_015', name: 'Ridgeways Mall', road: 'Kiambu Road', estate: 'Ridgeways', code: 'KB002' },
    
    // Mombasa Road
    { id: 'mt_016', name: 'Gateway Mall', road: 'Mombasa Road', estate: 'Syokimau', code: 'MB001' },
    { id: 'mt_017', name: 'Capital Centre', road: 'Mombasa Road', estate: 'Mlolongo', code: 'MB002' },
    { id: 'mt_018', name: 'Imara Daima Shopping Centre', road: 'Mombasa Road', estate: 'Imara Daima', code: 'MB003' },
    
    // Outer Ring Road
    { id: 'mt_019', name: 'Greenspan Mall', road: 'Outer Ring Road', estate: 'Donholm', code: 'OR001' },
    { id: 'mt_020', name: 'Nextgen Mall', road: 'Outer Ring Road', estate: 'Donholm', code: 'OR002' },
    
    // Eastlands
    { id: 'mt_021', name: 'Eastleigh Shopping Centre', road: 'General Waruinge Street', estate: 'Eastleigh', code: 'EL001' },
    { id: 'mt_022', name: 'Kariokor Market', road: 'Landhies Road', estate: 'Kariokor', code: 'EL002' },
    { id: 'mt_023', name: 'Umoja Shopping Center', road: 'Outer Ring Road', estate: 'Umoja', code: 'EL003' },
  ]
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.request.url);
    const zone = url.searchParams.get('zone') as Zone;
    const search = url.searchParams.get('search')?.toLowerCase() || '';

    if (!zone) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameter: zone' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate zone
    const validZones: Zone[] = ['CBD', 'Mtaani'];
    if (!validZones.includes(zone)) {
      return new Response(
        JSON.stringify({ error: 'Invalid zone. Must be: CBD or Mtaani' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let agents = PICKUP_AGENTS[zone] || [];

    // Apply search filter if provided
    if (search) {
      agents = agents.filter(agent => 
        agent.name.toLowerCase().includes(search) ||
        agent.road.toLowerCase().includes(search) ||
        agent.estate.toLowerCase().includes(search) ||
        agent.code.toLowerCase().includes(search)
      );
    }

    return new Response(
      JSON.stringify({
        agents,
        total: agents.length,
        zone,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error fetching pickup agents:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch pickup agents',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});