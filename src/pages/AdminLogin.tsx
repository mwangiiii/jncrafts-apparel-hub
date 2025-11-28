import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  // Check if site is locked (for display purposes)
  useEffect(() => {
    const checkLockStatus = async () => {
      const { data } = await supabase
        .from('system_status')
        .select('status')
        .order('id', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        setIsLocked(data.status);
      }
    };
    
    checkLockStatus();
  }, []);

  // Redirect if already logged in as admin
  useEffect(() => {
    if (user && isAdmin) {
      navigate('/admin');
    }
  }, [user, isAdmin, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Attempt to sign in
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (!authData.user) {
        throw new Error('Login failed - no user returned');
      }

      // Check if user is admin
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .single();

      if (roleError || !roleData) {
        // Not an admin, sign them out
        await supabase.auth.signOut();
        throw new Error('Access denied. This page is for administrators only.');
      }

      if (roleData.role !== 'admin') {
        // Not an admin, sign them out
        await supabase.auth.signOut();
        throw new Error('Access denied. This page is for administrators only.');
      }

      // Success! Admin verified
      toast({
        title: 'Welcome back!',
        description: 'Successfully logged in as administrator.',
      });

      // Navigate to admin dashboard
      navigate('/admin');
      
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in');
      toast({
        title: 'Login Failed',
        description: err.message || 'Failed to sign in',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Site Lock Warning */}
        {isLocked && (
          <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
            <Lock className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              <strong>Site is currently locked.</strong> Regular users cannot access the site.
            </AlertDescription>
          </Alert>
        )}

        {/* Login Card */}
        <Card className="shadow-2xl border-slate-700">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Administrator Access</CardTitle>
              <CardDescription className="text-base mt-2">
                Secure login for site administrators
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>

              <div className="pt-4 border-t">
                <p className="text-xs text-center text-muted-foreground">
                  This is a secure admin-only area. Unauthorized access attempts are logged.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-sm text-slate-400">
            Not an administrator?{' '}
            <button
              onClick={() => navigate('/')}
              className="text-blue-400 hover:text-blue-300 underline"
              disabled={isLocked}
            >
              {isLocked ? 'Site is locked' : 'Go to homepage'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;