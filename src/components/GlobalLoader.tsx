import React, { createContext, useContext, useState, ReactNode } from 'react';
import { JNCraftsLoader } from '@/components/ui/jncrafts-loader';

interface GlobalLoaderContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  showLoader: () => void;
  hideLoader: () => void;
}

const GlobalLoaderContext = createContext<GlobalLoaderContextType | undefined>(undefined);

export const useGlobalLoader = () => {
  const context = useContext(GlobalLoaderContext);
  if (!context) {
    throw new Error('useGlobalLoader must be used within a GlobalLoaderProvider');
  }
  return context;
};

interface GlobalLoaderProviderProps {
  children: ReactNode;
}

export const GlobalLoaderProvider: React.FC<GlobalLoaderProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const showLoader = () => setIsLoading(true);
  const hideLoader = () => setIsLoading(false);

  return (
    <GlobalLoaderContext.Provider value={{ isLoading, setLoading, showLoader, hideLoader }}>
      {children}
      
      {/* Global full-screen loader overlay */}
      {isLoading && (
        <div 
          className="fixed inset-0 z-[9999] bg-background/90 backdrop-blur-sm flex items-center justify-center"
          style={{ animationDuration: '0.3s' }}
        >
          <JNCraftsLoader scale={1.2} />
        </div>
      )}
    </GlobalLoaderContext.Provider>
  );
};

export default GlobalLoaderProvider;