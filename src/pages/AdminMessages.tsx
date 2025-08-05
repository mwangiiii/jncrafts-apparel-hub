import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Users, Clock, CheckCircle } from "lucide-react";
import { useMessaging } from "@/hooks/useMessaging";
import { WhatsAppChatList } from "@/components/WhatsAppChatList";
import { WhatsAppChatWindow } from "@/components/WhatsAppChatWindow";
import { UserProfileView } from "@/components/UserProfileView";
import { Conversation } from "@/types/database";

const AdminMessages = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserConversations, setSelectedUserConversations] = useState<Conversation[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const {
    conversations,
    isLoading,
  } = useMessaging();

  const activeConversations = conversations.filter(c => c.status === 'active');
  const pendingConversations = conversations.filter(c => c.status === 'pending');
  const closedConversations = conversations.filter(c => c.status === 'closed');

  // Get unique users count
  const uniqueUsers = new Set(conversations.map(c => c.user_id)).size;

  const handleSelectUser = (userId: string, userConversations: Conversation[]) => {
    setSelectedUserId(userId);
    setSelectedUserConversations(userConversations);
    setShowProfile(false);
  };

  const handleBack = () => {
    setSelectedUserId(null);
    setSelectedUserConversations([]);
    setShowProfile(false);
  };

  const handleShowProfile = () => {
    setShowProfile(true);
  };

  const handleBackFromProfile = () => {
    setShowProfile(false);
  };

  const getUserName = (userId: string) => {
    return `User ${userId.slice(0, 8)}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar with chat list or back button when showing profile */}
      <div className="w-1/3 border-r">
        {selectedUserId && !showProfile ? (
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <button 
                onClick={handleBack}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                ←
              </button>
              <h2 className="text-lg font-semibold">Back to Chats</h2>
            </div>
          </div>
        ) : !showProfile ? (
          <>
            {/* Stats Header */}
            <div className="p-4 border-b space-y-4">
              <div>
                <h1 className="text-2xl font-bold">Messages</h1>
                <p className="text-muted-foreground">
                  WhatsApp-style admin chat
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{activeConversations.length}</div>
                  <div className="text-xs text-muted-foreground">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">{pendingConversations.length}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-600">{uniqueUsers}</div>
                  <div className="text-xs text-muted-foreground">Users</div>
                </div>
              </div>
            </div>

            <WhatsAppChatList
              conversations={conversations}
              onSelectUser={handleSelectUser}
              selectedUserId={selectedUserId}
            />
          </>
        ) : null}
      </div>

      {/* Main content area */}
      <div className="flex-1">
        {selectedUserId && showProfile ? (
          <UserProfileView
            userId={selectedUserId}
            conversations={selectedUserConversations}
            onBack={handleBackFromProfile}
          />
        ) : selectedUserId ? (
          <WhatsAppChatWindow
            userId={selectedUserId}
            userName={getUserName(selectedUserId)}
            conversations={selectedUserConversations}
            onBack={handleBack}
            onShowProfile={handleShowProfile}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                <p className="text-muted-foreground max-w-md">
                  Choose a customer from the list to start viewing and managing their messages in WhatsApp-style interface.
                </p>
              </div>
              {conversations.length === 0 && (
                <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    No customer conversations yet. Messages will appear here when customers start chatting about products.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMessages;