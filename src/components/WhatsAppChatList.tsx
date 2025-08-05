import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { Conversation } from "@/types/database";

interface UserConversation {
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'active' | 'closed' | 'pending';
  conversations: Conversation[];
}

interface WhatsAppChatListProps {
  conversations: Conversation[];
  onSelectUser: (userId: string, conversations: Conversation[]) => void;
  selectedUserId?: string;
}

export const WhatsAppChatList = ({ 
  conversations, 
  onSelectUser, 
  selectedUserId 
}: WhatsAppChatListProps) => {
  // Group conversations by user
  const userConversations: UserConversation[] = Object.values(
    conversations.reduce((acc, conv) => {
      const userId = conv.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          userName: `User ${userId.slice(0, 8)}`, // We'll improve this when we get profiles
          lastMessage: '',
          lastMessageTime: conv.updated_at,
          unreadCount: 0,
          status: conv.status,
          conversations: []
        };
      }
      acc[userId].conversations.push(conv);
      
      // Update with latest conversation data
      if (new Date(conv.updated_at) > new Date(acc[userId].lastMessageTime)) {
        acc[userId].lastMessageTime = conv.updated_at;
        acc[userId].lastMessage = conv.subject;
        acc[userId].status = conv.status;
      }
      
      return acc;
    }, {} as Record<string, UserConversation>)
  ).sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Messages</h2>
        <p className="text-sm text-muted-foreground">
          {userConversations.length} conversation{userConversations.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          {userConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No conversations yet</p>
            </div>
          ) : (
            userConversations.map((userConv) => (
              <div
                key={userConv.userId}
                onClick={() => onSelectUser(userConv.userId, userConv.conversations)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedUserId === userConv.userId ? 'bg-muted' : ''
                }`}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(userConv.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${getStatusColor(userConv.status)}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium truncate">{userConv.userName}</h3>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(userConv.lastMessageTime), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground truncate">
                      {userConv.lastMessage}
                    </p>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {userConv.conversations.length}
                      </Badge>
                      {userConv.status === 'pending' && (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};