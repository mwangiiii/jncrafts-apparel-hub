/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Performance optimization types
interface Navigator {
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
}

// Service Worker types
interface ServiceWorkerGlobalScope {
  skipWaiting(): Promise<void>;
}