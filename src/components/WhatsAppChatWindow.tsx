import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Info } from "lucide-react";
import { Conversation, Message } from "@/types/database";
import { useMessaging } from "@/hooks/useMessaging";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface WhatsAppChatWindowProps {
  userId: string;
  userName: string;
  conversations: Conversation[];
  onBack: () => void;
  onShowProfile: () => void;
}

export const WhatsAppChatWindow = ({ 
  userId, 
  userName, 
  conversations, 
  onBack, 
  onShowProfile 
}: WhatsAppChatWindowProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<string>(
    conversations[0]?.id || ""
  );
  
  const { user } = useAuth();
  const { messages, sendMessage, updateConversationStatus } = useMessaging();

  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0].id);
    }
  }, [conversations, selectedConversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    await sendMessage(selectedConversation, newMessage.trim());
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const activeConv = conversations.find(c => c.id === selectedConversation);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">{userName}</h3>
              <p className="text-sm text-muted-foreground">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onShowProfile}>
            <Info className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Conversation Tabs */}
      {conversations.length > 1 && (
        <div className="p-2 border-b bg-muted/20">
          <ScrollArea className="w-full">
            <div className="flex gap-2">
              {conversations.map((conv) => (
                <Button
                  key={conv.id}
                  variant={selectedConversation === conv.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedConversation(conv.id)}
                  className="whitespace-nowrap"
                >
                  <span className="truncate max-w-32">{conv.subject}</span>
                  <Badge 
                    variant={conv.status === 'active' ? 'default' : 'secondary'}
                    className="ml-2 text-xs"
                  >
                    {conv.status}
                  </Badge>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {activeConv && (
          <div className="space-y-4">
            {/* Conversation Info */}
            <div className="text-center py-4">
              <div className="bg-muted/50 rounded-lg p-3 inline-block">
                <p className="text-sm font-medium">{activeConv.subject}</p>
                {activeConv.product && (
                  <p className="text-xs text-muted-foreground">
                    About: {activeConv.product.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Started {formatDistanceToNow(new Date(activeConv.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-3">
              {messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;
                const isAdmin = message.sender_type === 'admin';
                
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isOwnMessage && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {isAdmin ? 'A' : getInitials(userName)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`max-w-xs lg:max-w-md p-3 rounded-lg ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm break-words">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}
                      >
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                    </div>

                    {isOwnMessage && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                          A
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      {activeConv?.status !== 'closed' && (
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Admin Controls */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <Badge variant={activeConv?.status === 'active' ? 'default' : 'secondary'}>
                {activeConv?.status}
              </Badge>
              {activeConv?.product && (
                <Badge variant="outline" className="text-xs">
                  {activeConv.product.name}
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateConversationStatus(activeConv!.id, 'pending')}
                disabled={activeConv?.status === 'pending'}
              >
                Mark Pending
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateConversationStatus(activeConv!.id, 'closed')}
                disabled={activeConv?.status === 'closed' as any}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};