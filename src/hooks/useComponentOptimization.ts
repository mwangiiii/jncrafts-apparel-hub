import { useCallback, useMemo, useRef } from 'react';

// Hook for optimizing expensive calculations and preventing unnecessary re-renders
export const useMemoizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return useCallback(callback, deps) as T;
};

// Hook for debouncing expensive operations
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
};

// Hook for optimizing large lists with virtual scrolling indicators
export const useVirtualScrollMetrics = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number
) => {
  return useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const bufferSize = Math.min(5, Math.floor(visibleCount * 0.5));
    
    return {
      visibleCount,
      bufferSize,
      totalHeight: itemCount * itemHeight,
      overscan: bufferSize * 2,
    };
  }, [itemCount, itemHeight, containerHeight]);
};

// Hook for preventing layout thrashing
export const useLayoutOptimized = () => {
  const rafRef = useRef<number>();

  const scheduleUpdate = useCallback((callback: () => void) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      callback();
    });
  }, []);

  return { scheduleUpdate };
};

// Hook for intersection observer optimization
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const observerRef = useRef<IntersectionObserver>();
  const elementsRef = useRef<Map<Element, (entry: IntersectionObserverEntry) => void>>(new Map());

  const observe = useCallback((element: Element, callback: (entry: IntersectionObserverEntry) => void) => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const callback = elementsRef.current.get(entry.target);
          if (callback) {
            callback(entry);
          }
        });
      }, {
        rootMargin: '50px',
        threshold: [0, 0.1, 0.5, 1],
        ...options,
      });
    }

    elementsRef.current.set(element, callback);
    observerRef.current.observe(element);
  }, [options]);

  const unobserve = useCallback((element: Element) => {
    if (observerRef.current) {
      observerRef.current.unobserve(element);
      elementsRef.current.delete(element);
    }
  }, []);

  return { observe, unobserve };
};