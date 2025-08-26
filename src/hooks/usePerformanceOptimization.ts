import { useEffect, useState } from 'react';

// Network-aware loading
export const useNetworkAwareness = () => {
  const [connectionType, setConnectionType] = useState<string>('4g');
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    // @ts-ignore - navigator.connection is not fully supported in TypeScript
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      const updateConnectionInfo = () => {
        setConnectionType(connection.effectiveType || '4g');
        setIsSlowConnection(['slow-2g', '2g'].includes(connection.effectiveType));
      };
      
      updateConnectionInfo();
      connection.addEventListener('change', updateConnectionInfo);
      
      return () => connection.removeEventListener('change', updateConnectionInfo);
    }
  }, []);

  return { connectionType, isSlowConnection };
};

// Adaptive image quality based on connection
export const useAdaptiveImageQuality = () => {
  const { isSlowConnection } = useNetworkAwareness();
  
  return {
    quality: isSlowConnection ? 60 : 85,
    format: isSlowConnection ? 'jpeg' : 'webp',
    maxWidth: isSlowConnection ? 600 : 1200
  };
};

// Performance monitoring hook
export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<{
    fcp?: number;
    lcp?: number;
    fid?: number;
    cls?: number;
  }>({});

  useEffect(() => {
    // First Contentful Paint
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
        }
      }
    });
    
    observer.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
    });
    
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    return () => {
      observer.disconnect();
      lcpObserver.disconnect();
    };
  }, []);

  return metrics;
};

// Preloading hook for critical resources
export const useResourcePreloader = () => {
  const preloadImage = (src: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  };

  const preloadFont = (src: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = src;
    document.head.appendChild(link);
  };

  return { preloadImage, preloadFont };
};