import { useState, useRef, useEffect } from 'react';
import { useImageOptimization, useProgressiveImage } from '@/hooks/useImageOptimization';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  quality?: number;
  lazy?: boolean;
  progressive?: boolean;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage = ({
  src,
  alt,
  className,
  width = 800,
  height = 600,
  quality = 85,
  lazy = true,
  progressive = true,
  fallbackSrc,
  onLoad,
  onError,
}: OptimizedImageProps) => {
  const [isVisible, setIsVisible] = useState(!lazy);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Generate low-quality placeholder for progressive loading
  const lowQualitySrc = progressive ? 
    src.replace(/\.(jpg|jpeg|png|webp)(\?.*)?$/i, '_thumb.$1$2') : 
    src;

  const { src: optimizedSrc, isLoaded, error } = useImageOptimization(
    isVisible ? src : '', 
    { width, height, quality, format: 'webp', lazy }
  );

  const { src: progressiveSrc, isLoaded: progressiveLoaded } = useProgressiveImage(
    lowQualitySrc,
    optimizedSrc
  );

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isVisible]);

  const handleLoad = () => {
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const displaySrc = hasError ? (fallbackSrc || src) : (progressive ? progressiveSrc : optimizedSrc);

  // Generate WebP URL for static files
  const webpSrc = src.includes('/lovable-uploads/') ? 
    src.replace(/\.(png|jpg|jpeg)$/i, '.webp') : null;

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {/* Loading placeholder */}
      {!isLoaded && isVisible && (
        <div 
          className="absolute inset-0 bg-muted animate-pulse" 
          style={{ aspectRatio: `${width}/${height}` }}
        />
      )}
      
      {/* Main image with WebP support for static files */}
      {isVisible && (
        <>
          {webpSrc ? (
            <picture>
              <source srcSet={webpSrc} type="image/webp" />
              <img
                src={displaySrc}
                alt={alt}
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-300",
                  isLoaded ? "opacity-100" : "opacity-0"
                )}
                loading={lazy ? "lazy" : "eager"}
                decoding="async"
                onLoad={handleLoad}
                onError={handleError}
                width={width}
                height={height}
              />
            </picture>
          ) : (
            <img
              src={displaySrc}
              alt={alt}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                isLoaded ? "opacity-100" : "opacity-0"
              )}
              loading={lazy ? "lazy" : "eager"}
              decoding="async"
              onLoad={handleLoad}
              onError={handleError}
              width={width}
              height={height}
            />
          )}
        </>
      )}

      {/* Progressive loading blur effect */}
      {progressive && !progressiveLoaded && isLoaded && (
        <div 
          className="absolute inset-0 bg-muted/50 backdrop-blur-sm transition-opacity duration-500"
          style={{ opacity: progressiveLoaded ? 0 : 1 }}
        />
      )}

      {/* Error state */}
      {error && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <span className="text-sm">Failed to load image</span>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;