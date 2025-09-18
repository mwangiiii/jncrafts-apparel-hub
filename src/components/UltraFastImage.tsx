import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Skeleton } from './ui/skeleton';

interface UltraFastImageProps {
  src: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const UltraFastImage: React.FC<UltraFastImageProps> = ({
  src,
  alt,
  className = '',
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) return; // Skip observer for priority images

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before entering viewport
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // Convert to WebP if supported
  const getOptimizedSrc = (originalSrc: string) => {
    if (!originalSrc) return originalSrc;
    
    // Check if browser supports WebP
    const supportsWebP = document.createElement('canvas')
      .toDataURL('image/webp')
      .indexOf('data:image/webp') === 0;
    
    if (supportsWebP && originalSrc.includes('supabase')) {
      // For Supabase storage, we can add WebP transformation
      return originalSrc.includes('?') 
        ? `${originalSrc}&format=webp&quality=85`
        : `${originalSrc}?format=webp&quality=85`;
    }
    
    return originalSrc;
  };

  if (!src || hasError) {
    return (
      <div 
        ref={imgRef}
        className={`bg-muted flex items-center justify-center ${className}`}
      >
        <span className="text-muted-foreground text-sm">No image</span>
      </div>
    );
  }

  if (!isInView) {
    return (
      <div ref={imgRef} className={className}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && (
        <Skeleton className="absolute inset-0 z-10" />
      )}
      <img
        ref={imgRef}
        src={getOptimizedSrc(src)}
        alt={alt}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`
          w-full h-full object-cover transition-opacity duration-300
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          contentVisibility: 'auto',
          containIntrinsicSize: '300px 300px',
        }}
      />
    </div>
  );
};