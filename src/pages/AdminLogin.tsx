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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">

        {/* Login Card */}
        <Card className="shadow-xl border border-primary/20 bg-white/90 dark:bg-slate-900/90 rounded-2xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/80 to-indigo-700/80 rounded-full flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-white drop-shadow-md" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-primary drop-shadow-sm">Administrator Access</CardTitle>
              <CardDescription className="text-base mt-2 text-gray-600 dark:text-gray-300">
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
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 bg-white/90 dark:bg-slate-800/80 border border-primary/20 focus:ring-2 focus:ring-primary focus:border-primary/40 placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 bg-white/90 dark:bg-slate-800/80 border border-primary/20 focus:ring-2 focus:ring-primary focus:border-primary/40 placeholder:text-gray-400"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold bg-gradient-to-r from-primary/90 to-indigo-700/90 hover:from-indigo-700 hover:to-primary/90 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all duration-300"
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

              {/* <div className="pt-4 border-t border-primary/10">
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  This is a secure admin-only area. Unauthorized access attempts are logged.
                </p>
              </div> */}
            </form>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-sm text-gray-400 dark:text-gray-300">
            Not an administrator?{' '}
            <button
              onClick={() => navigate('/')}
              className="text-primary hover:text-indigo-700 underline font-semibold transition-colors duration-200"
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