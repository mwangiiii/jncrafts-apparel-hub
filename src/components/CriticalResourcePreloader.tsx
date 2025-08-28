import { useEffect } from 'react';

// Critical resource preloader to reduce network dependency chains
const CriticalResourcePreloader = () => {
  useEffect(() => {
    // Preload critical fonts
    const fontPreloads = [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ];

    // Preload critical images
    const imagePreloads = [
      '/lovable-uploads/7957bb4c-c1c7-4adb-9854-974dfbd9f332.webp',
      '/lovable-uploads/db868647-544e-4c56-9f4e-508500776671.png',
    ];

    // Create link elements for preloading
    fontPreloads.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = href;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    imagePreloads.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });

    // Preload critical JavaScript modules
    if ('modulepreload' in HTMLLinkElement.prototype) {
      const modulePreloads = [
        '/src/components/OptimizedImage.tsx',
        '/src/hooks/useImageOptimization.ts',
      ];

      modulePreloads.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'modulepreload';
        link.href = href;
        document.head.appendChild(link);
      });
    }

    // DNS prefetch for external resources
    const dnsPrefetch = [
      '//fonts.googleapis.com',
      '//fonts.gstatic.com',
    ];

    dnsPrefetch.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = href;
      document.head.appendChild(link);
    });

  }, []);

  return null; // This component doesn't render anything
};

export default CriticalResourcePreloader;