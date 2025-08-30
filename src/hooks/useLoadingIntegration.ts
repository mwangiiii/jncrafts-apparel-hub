import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoading } from '@/contexts/LoadingContext';

// Hook to integrate loading states across the app
export const useLoadingIntegration = () => {
  const { loading: authLoading } = useAuth();
  const { setLoadingState } = useLoading();

  useEffect(() => {
    if (authLoading) {
      setLoadingState(true, "Authenticating...");
    } else {
      setLoadingState(false);
    }
  }, [authLoading, setLoadingState]);
};

// Hook for query loading states
export const useQueryLoading = (isLoading: boolean, message?: string) => {
  const { setLoadingState } = useLoading();

  useEffect(() => {
    setLoadingState(isLoading, message);
  }, [isLoading, message, setLoadingState]);
};