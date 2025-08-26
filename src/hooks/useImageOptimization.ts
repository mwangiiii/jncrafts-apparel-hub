import { useState, useEffect, useCallback } from 'react';

interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  lazy?: boolean;
}

export const useImageOptimization = (src: string, options: ImageOptimizationOptions = {}) => {
  const [optimizedSrc, setOptimizedSrc] = useState<string>(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    width = 800,
    height = 600,
    quality = 85,
    format = 'webp',
    lazy = true
  } = options;

  const generateOptimizedUrl = useCallback((originalSrc: string) => {
    // Check if it's a Supabase storage URL
    if (originalSrc.includes('supabase.co/storage')) {
      // Add transformation parameters for Supabase storage
      const url = new URL(originalSrc);
      url.searchParams.set('width', width.toString());
      url.searchParams.set('height', height.toString());
      url.searchParams.set('quality', quality.toString());
      url.searchParams.set('format', format);
      return url.toString();
    }
    
    // For other URLs, return as-is (could integrate with other image services)
    return originalSrc;
  }, [width, height, quality, format]);

  useEffect(() => {
    if (!src) return;

    const optimizedUrl = generateOptimizedUrl(src);
    
    // Preload the image
    const img = new Image();
    img.onload = () => {
      setOptimizedSrc(optimizedUrl);
      setIsLoaded(true);
      setError(null);
    };
    img.onerror = () => {
      setError('Failed to load image');
      setOptimizedSrc(src); // Fallback to original
      setIsLoaded(true);
    };
    
    img.src = optimizedUrl;
  }, [src, generateOptimizedUrl]);

  return { 
    src: optimizedSrc, 
    isLoaded, 
    error,
    isOptimized: optimizedSrc !== src
  };
};

// Progressive image loading hook
export const useProgressiveImage = (lowQualitySrc: string, highQualitySrc: string) => {
  const [src, setSrc] = useState(lowQualitySrc);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setSrc(highQualitySrc);
      setIsLoaded(true);
    };
    img.src = highQualitySrc;
  }, [highQualitySrc]);

  return { src, isLoaded };
};