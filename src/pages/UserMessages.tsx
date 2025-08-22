import { useState, useEffect } from "react";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useMessaging } from "@/hooks/useMessaging";
import { useParams, useNavigate } from "react-router-dom";
import { ConversationList } from "@/components/ConversationList";
import { MessagesList } from "@/components/MessagesList";
import ProductReferenceCard from "@/components/ProductReferenceCard";

const UserMessages = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    conversations, 
    messages, 
    activeConversation, 
    setActiveConversation, 
    sendMessage, 
    isLoading 
  } = useMessaging();

  // Auto-select conversation from URL params
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        setSelectedConversation(conversationId);
        setActiveConversation(conversationId);
      }
    }
  }, [conversationId, conversations, setActiveConversation]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    setActiveConversation(conversationId);
    navigate(`/messages/${conversationId}`);
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setActiveConversation(null);
    navigate('/messages');
  };

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

  const activeConv = conversations.find(c => c.id === selectedConversation);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Conversations List */}
      <div className="w-1/3 border-r">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Your Messages</h1>
          <p className="text-sm text-muted-foreground">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2">
            {conversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No conversations yet</h3>
                <p className="text-sm text-muted-foreground">
                  Start a conversation by clicking the chat button on any product page.
                </p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedConversation === conversation.id ? 'bg-muted' : ''
                  }`}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      A
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium truncate">{conversation.subject}</h3>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      {conversation.product ? (
                        <p className="text-sm text-muted-foreground truncate">
                          About: {conversation.product.name}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">General inquiry</p>
                      )}
                      <Badge 
                        variant={conversation.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {conversation.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedConversation && activeConv ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleBack} className="lg:hidden">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    A
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{activeConv.subject}</h3>
                  <p className="text-sm text-muted-foreground">Admin Support</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Product Reference Card */}
                {activeConv.product_id && (
                  <ProductReferenceCard productId={activeConv.product_id} />
                )}

                {/* Conversation Info */}
                <div className="text-center py-4">
                  <div className="bg-muted/50 rounded-lg p-3 inline-block">
                    <p className="text-sm font-medium">{activeConv.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      Started {formatDistanceToNow(new Date(activeConv.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* Messages using MessagesList component */}
                <MessagesList 
                  messages={messages} 
                  currentUserId={user?.id}
                />
              </div>
            </ScrollArea>

            {/* Message Input */}
            {activeConv.status !== 'closed' ? (
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
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
                <div className="flex items-center justify-between mt-2">
                  <Badge variant={activeConv.status === 'active' ? 'default' : 'secondary'}>
                    {activeConv.status}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t bg-muted/30">
                <p className="text-center text-sm text-muted-foreground">
                  This conversation has been closed by the admin.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                <p className="text-muted-foreground max-w-md">
                  Choose a conversation from the list to view your message history with our admin team.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserMessages;