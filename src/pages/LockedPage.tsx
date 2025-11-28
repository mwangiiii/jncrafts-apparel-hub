import { Lock, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';

const LockedPage = () => {
  const [unlockTime, setUnlockTime] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUnlockTime = async () => {
      const { data } = await supabase
        .from('system_status')
        .select('unlock_at')
        .order('id', { ascending: false })
        .limit(1)
        .single();
      
      if (data?.unlock_at) {
        setUnlockTime(data.unlock_at);
      }
    };
    
    fetchUnlockTime();
  }, []);

  const formatUnlockTime = (time: string | null) => {
    if (!time) return null;
    try {
      const date = new Date(time);
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">New Product is coming soon</CardTitle>
          <CardDescription className="text-muted-foreground">
            We're currently performing maintenance to improve your experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {unlockTime && formatUnlockTime(unlockTime) && (
            <div className="space-y-1 p-3 bg-muted/50 rounded-md border">
              <p className="text-sm font-medium text-muted-foreground">
                Expected to be back:
              </p>
              <p className="text-base font-semibold">
                {formatUnlockTime(unlockTime)}
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground text-center">
            Thank you for your patience. Please check back soon.
          </p>
          <div className="pt-4">
            <Button
              onClick={() => navigate('/admin/login')}
              variant="outline"
              size="sm"
              className="w-full justify-center text-xs"
            >
              <Shield className="w-3 h-3 mr-2" />
              Administrator Access
            </Button>
          </div>
          <div className="text-xs text-muted-foreground text-center">
            Site ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LockedPage;