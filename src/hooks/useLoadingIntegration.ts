import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoading } from '@/contexts/LoadingContext';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

// Hook to forcefully integrate all loading states across the app
export const useLoadingIntegration = () => {
  const { loading: authLoading } = useAuth();
  const { setLoadingState } = useLoading();
  
  // Force capture all React Query operations
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();

  useEffect(() => {
    // Forcefully show loader for any database operation
    const isAnyLoading = authLoading || isFetching > 0 || isMutating > 0;
    
    if (isAnyLoading) {
      let message = "Loading...";
      if (authLoading) message = "Authenticating...";
      else if (isFetching > 0) message = "Fetching data...";
      else if (isMutating > 0) message = "Processing...";
      
      setLoadingState(true, message);
    } else {
      setLoadingState(false);
    }
  }, [authLoading, isFetching, isMutating, setLoadingState]);
};

// Enhanced hook for specific query loading states
export const useQueryLoading = (isLoading: boolean, message?: string) => {
  const { setLoadingState } = useLoading();

  useEffect(() => {
    if (isLoading) {
      setLoadingState(true, message || "Loading...");
    }
    // Don't automatically hide here - let the global integration handle it
  }, [isLoading, message, setLoadingState]);
};

// Hook to force show loader for specific operations
export const useForceLoading = () => {
  const { setLoadingState } = useLoading();
  
  return {
    showLoader: (message?: string) => setLoadingState(true, message),
    hideLoader: () => setLoadingState(false)
  };
};