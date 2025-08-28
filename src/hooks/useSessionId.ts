import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Hook to manage session ID for guest users with proper security
export const useSessionId = () => {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    const initializeSession = async () => {
      // Get stored session ID
      let storedSessionId = localStorage.getItem('guest_session_id');
      
      if (!storedSessionId) {
        // Generate a cryptographically stronger session ID
        const timestamp = Date.now();
        const randomPart = crypto.getRandomValues(new Uint32Array(3))
          .reduce((acc, val) => acc + val.toString(36), '');
        storedSessionId = `guest_${timestamp}_${randomPart}`;
        localStorage.setItem('guest_session_id', storedSessionId);
      }

      // Register/validate session in database
      try {
        // Check if session exists
        const { data: existingSession } = await supabase
          .from('guest_sessions')
          .select('session_id')
          .eq('session_id', storedSessionId)
          .maybeSingle();

        if (!existingSession) {
          // Create new session record
          const { error } = await supabase
            .from('guest_sessions')
            .insert({
              session_id: storedSessionId,
              user_agent: navigator.userAgent,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
            });

          if (error) {
            console.error('Failed to register guest session:', error);
            // Continue with session even if DB registration fails
          }
        } else {
          // Update last accessed time
          await supabase
            .from('guest_sessions')
            .update({ last_accessed: new Date().toISOString() })
            .eq('session_id', storedSessionId);
        }
      } catch (error) {
        console.error('Session management error:', error);
        // Continue with session even if DB operations fail
      }
      
      setSessionId(storedSessionId);
    };

    initializeSession();
  }, []);

  return sessionId;
};