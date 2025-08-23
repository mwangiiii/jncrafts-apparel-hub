import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Eye, RefreshCw, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AuditLogEntry {
  id: string;
  admin_user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  accessed_data: any;
  ip_address: unknown;
  user_agent: unknown;
  created_at: string;
}

const SecurityAuditLog: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const fetchAuditLogs = async () => {
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      
      // Log this admin access
      await supabase.rpc('log_admin_data_access', {
        p_action: 'VIEW_AUDIT_LOG',
        p_table_name: 'admin_audit_log',
        p_accessed_data: { viewed_by: user.id }
      });

      // Fetch audit logs for this admin
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setAuditLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch audit logs. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [user, isAdmin]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'VIEW_STOCK_ALERTS':
        return 'bg-yellow-100 text-yellow-800';
      case 'VIEW_AUDIT_LOG':
        return 'bg-blue-100 text-blue-800';
      case 'ACCESS_CUSTOMER_DATA':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user || !isAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Shield className="h-8 w-8 mx-auto mb-2" />
            <p>Access denied. Admin privileges required.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p>Loading audit logs...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Audit Log
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchAuditLogs}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground mb-4">
            <p>
              <strong>Security Notice:</strong> This log tracks all admin access to sensitive customer data.
            </p>
            <p>
              Admin ID: <code className="bg-muted px-1 rounded">{user.id}</code>
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Eye className="h-8 w-8 mx-auto mb-2" />
              <p>No audit log entries found for your account.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <Card key={log.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getActionColor(log.action)}>
                            {log.action.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            on {log.table_name}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(log.created_at)}
                        </div>
                        
                        {log.ip_address && (
                          <div className="text-xs text-muted-foreground">
                            IP: {String(log.ip_address)}
                          </div>
                        )}
                        
                        {log.accessed_data && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              View Access Details
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(log.accessed_data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityAuditLog;