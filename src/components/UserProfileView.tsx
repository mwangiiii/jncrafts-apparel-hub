import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Conversation } from "@/types/database";

interface UserProfile {
  id: string;
  full_name?: string;
  phone?: string;
  address?: string;
  created_at: string;
}

interface UserProfileViewProps {
  userId: string;
  conversations: Conversation[];
  onBack: () => void;
}

export const UserProfileView = ({ userId, conversations, onBack }: UserProfileViewProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, phone, address, created_at, updated_at')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        setProfile(data || {
          id: userId,
          full_name: `User ${userId.slice(0, 8)}`,
          created_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error loading user profile:', error);
        setProfile({
          id: userId,
          full_name: `User ${userId.slice(0, 8)}`,
          created_at: new Date().toISOString()
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, [userId]);

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const getStatusCounts = () => {
    const active = conversations.filter(c => c.status === 'active').length;
    const pending = conversations.filter(c => c.status === 'pending').length;
    const closed = conversations.filter(c => c.status === 'closed').length;
    return { active, pending, closed };
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold">Contact Info</h2>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-6">
        {/* Profile Header */}
        <div className="text-center space-y-4">
          <Avatar className="w-24 h-24 mx-auto">
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {getInitials(profile?.full_name || '')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">{profile?.full_name || 'Unknown User'}</h3>
            <p className="text-sm text-muted-foreground">Customer</p>
          </div>
        </div>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4" />
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{userId.slice(0, 8)}@example.com</span>
            </div>
            {profile?.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{profile.phone}</span>
              </div>
            )}
            {profile?.address && (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{profile.address}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                Member since {new Date(profile?.created_at || '').toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Conversation Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Conversation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-green-600">{statusCounts.active}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-yellow-600">{statusCounts.pending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-600">{statusCounts.closed}</div>
                <div className="text-xs text-muted-foreground">Resolved</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Topics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {conversations.slice(0, 5).map((conv) => (
              <div key={conv.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.subject}</p>
                  {conv.product && (
                    <p className="text-xs text-muted-foreground truncate">
                      Product: {conv.product.name}
                    </p>
                  )}
                </div>
                <Badge variant={conv.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                  {conv.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};