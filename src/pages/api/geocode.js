// pages/api/geocode.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Handle preflight OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Or specify 'https://jncrafts.vercel.app' for production
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const { q, ...otherParams } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const params = new URLSearchParams(otherParams);
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&countrycodes=ke&extratags=1&namedetails=1&q=${encodeURIComponent(q)}&${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JnCraftsApp/1.0 (contact@jncrafts.com)' // Replace with your app name and contact email (required by OSM policy)
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*'); // Or your specific origin
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    res.status(200).json(data);
  } catch (error) {
    console.error('Geocode proxy error:', error);
    res.status(500).json({ error: error.message });
  }
}