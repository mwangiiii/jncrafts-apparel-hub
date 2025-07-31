import { useState, useEffect } from 'react';

// Hook to manage session ID for guest users
export const useSessionId = () => {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Get or create session ID
    let storedSessionId = localStorage.getItem('guest_session_id');
    
    if (!storedSessionId) {
      storedSessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('guest_session_id', storedSessionId);
    }
    
    setSessionId(storedSessionId);
  }, []);

  return sessionId;
};