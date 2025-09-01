import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminProductsErrorBoundaryProps {
  error: Error | null;
  onRetry: () => void;
  isRetrying?: boolean;
}

export const AdminProductsErrorBoundary: React.FC<AdminProductsErrorBoundaryProps> = ({
  error,
  onRetry,
  isRetrying = false
}) => {
  const navigate = useNavigate();

  const getErrorMessage = (error: Error | null) => {
    if (!error) return 'Unknown error occurred';
    
    if (error.message.includes('timeout')) {
      return 'Database query timed out. The server may be experiencing high load.';
    }
    
    if (error.message.includes('database')) {
      return 'Database connection issue. Please try again.';
    }
    
    if (error.message.includes('network')) {
      return 'Network connection issue. Check your internet connection.';
    }
    
    return error.message || 'An unexpected error occurred';
  };

  const getSuggestions = (error: Error | null) => {
    if (!error) return [];
    
    if (error.message.includes('timeout')) {
      return [
        'The database query is taking too long',
        'Try refreshing the page',
        'Check if the database is experiencing high load'
      ];
    }
    
    if (error.message.includes('database')) {
      return [
        'Database connection may be interrupted',
        'Check if Supabase is accessible',
        'Try again in a few moments'
      ];
    }
    
    return [
      'Try refreshing the page',
      'Check your internet connection',
      'Contact support if the issue persists'
    ];
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Products Failed to Load
            </h2>
            <p className="text-muted-foreground">
              {getErrorMessage(error)}
            </p>
          </div>

          <div className="space-y-2 text-left">
            <h3 className="font-semibold text-sm text-foreground">Suggestions:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              {getSuggestions(error).map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={onRetry} 
              disabled={isRetrying}
              className="flex-1"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin/dashboard')}
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>

          {error && (
            <details className="text-left">
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                Technical Details
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded text-xs text-muted-foreground overflow-auto">
                {error.stack || error.message}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProductsErrorBoundary;