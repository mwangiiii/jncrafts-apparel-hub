// Service Worker for aggressive caching and performance optimization
const CACHE_NAME = 'jncrafts-v2';
const STATIC_CACHE = 'jncrafts-static-v2';
const DYNAMIC_CACHE = 'jncrafts-dynamic-v2';
const IMAGE_CACHE = 'jncrafts-images-v2';

// Assets to cache immediately with proper versioning
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/lovable-uploads/7957bb4c-c1c7-4adb-9854-974dfbd9f332.webp',
  '/lovable-uploads/db868647-544e-4c56-9f4e-508500776671.png'
];

// Cache strategies for different resource types with better optimization
const CACHE_STRATEGIES = {
  // Cache first for static assets with long expiry
  static: [
    /\.(css|js|woff|woff2|ttf|eot)$/,
    /\/assets\//,
    /\/_app\//
  ],
  // Network first for API calls with fallback
  networkFirst: [
    /\/rest\/v1\//,
    /supabase\.co.*\/rest\/v1\//,
    /\/functions\/v1\//
  ],
  // Cache first for images with network fallback and compression
  imageCache: [
    /\.(jpg|jpeg|png|gif|webp|avif|svg)$/,
    /supabase\.co.*\/storage\//,
    /\/lovable-uploads\//
  ],
  // Stale while revalidate for API data
  staleWhileRevalidate: [
    /\/api\//
  ]
};

// Helper function to check if URL is cacheable
function isCacheableUrl(url) {
  // Skip chrome-extension, moz-extension, safari-extension URLs
  if (url.protocol === 'chrome-extension:' || 
      url.protocol === 'moz-extension:' || 
      url.protocol === 'safari-extension:') {
    return false;
  }
  
  // Only cache http and https URLs
  return url.protocol === 'http:' || url.protocol === 'https:';
}

// Helper functions to determine resource types
function isStaticAsset(request) {
  const url = new URL(request.url);
  if (!isCacheableUrl(url)) return false;
  return CACHE_STRATEGIES.static.some(pattern => pattern.test(url.pathname));
}

function isImageRequest(request) {
  const url = new URL(request.url);
  if (!isCacheableUrl(url)) return false;
  return CACHE_STRATEGIES.imageCache.some(pattern => pattern.test(url.pathname)) ||
         request.destination === 'image';
}

function isApiRequest(request) {
  const url = new URL(request.url);
  if (!isCacheableUrl(url)) return false;
  return CACHE_STRATEGIES.networkFirst.some(pattern => pattern.test(url.href)) ||
         CACHE_STRATEGIES.staleWhileRevalidate.some(pattern => pattern.test(url.pathname));
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== IMAGE_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and non-cacheable URLs
  if (request.method !== 'GET' || !isCacheableUrl(url)) {
    return;
  }

  // Handle different resource types
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isImageRequest(request)) {
    event.respondWith(cacheFirstWithExpiry(request, IMAGE_CACHE, 7 * 24 * 60 * 60 * 1000)); // 1 week
  } else if (isApiRequest(request)) {
    event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE));
  } else {
    event.respondWith(networkFirstWithFallback(request));
  }
});

// Cache-first strategy for static assets
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      // Only cache if URL is cacheable
      const url = new URL(request.url);
      if (isCacheableUrl(url)) {
        cache.put(request, response.clone());
      }
    }
    return response;
  } catch (error) {
    console.error('Cache-first fetch failed:', error);
    return new Response('Network error', { status: 408 });
  }
}

// Cache-first with expiry for images
async function cacheFirstWithExpiry(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    const cachedDate = new Date(cached.headers.get('sw-cache-date') || 0);
    const now = new Date();
    
    if (now - cachedDate < maxAge) {
      return cached;
    }
  }
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const url = new URL(request.url);
      if (isCacheableUrl(url)) {
        const responseToCache = response.clone();
        responseToCache.headers.set('sw-cache-date', new Date().toISOString());
        cache.put(request, responseToCache);
      }
    }
    return response;
  } catch (error) {
    if (cached) return cached; // Return stale cache if network fails
    return new Response('Network error', { status: 408 });
  }
}

// Network-first with cache fallback for API calls
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      // Cache successful responses with timestamp
      const url = new URL(request.url);
      if (isCacheableUrl(url)) {
        const responseToCache = response.clone();
        responseToCache.headers.set('sw-cache-date', new Date().toISOString());
        cache.put(request, responseToCache);
      }
    }
    
    return response;
  } catch (error) {
    // Try cache fallback
    const cached = await cache.match(request);
    if (cached) {
      // Add header to indicate this is from cache
      const response = cached.clone();
      response.headers.set('x-from-cache', 'true');
      return response;
    }
    
    throw error;
  }
}

// Network-first with offline fallback
async function networkFirstWithFallback(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // For navigation requests, return offline page
    if (request.mode === 'navigate') {
      const cache = await caches.open(STATIC_CACHE);
      return cache.match('/offline.html');
    }
    
    throw error;
  }
}