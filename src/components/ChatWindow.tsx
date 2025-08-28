import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, Send, MessageCircle } from "lucide-react";
import { useMessaging } from "@/hooks/useMessaging";
import { useAuth } from "@/contexts/AuthContext";
import { ConversationList } from "./ConversationList";
import { MessagesList } from "./MessagesList";
import { ComingSoonOverlay } from "@/components/ComingSoonOverlay";

interface ChatWindowProps {
  onClose: () => void;
  productId?: string;
  productName?: string;
}

export const ChatWindow = ({ onClose, productId, productName }: ChatWindowProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [showConversations, setShowConversations] = useState(true);
  const [newConversationSubject, setNewConversationSubject] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user, isAdmin } = useAuth();
  const {
    conversations,
    messages,
    activeConversation,
    setActiveConversation,
    createConversation,
    sendMessage,
    updateConversationStatus,
  } = useMessaging();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;
    
    await sendMessage(activeConversation, newMessage.trim());
    setNewMessage("");
  };

  const handleCreateConversation = async () => {
    if (!newConversationSubject.trim()) return;
    
    const conversationId = await createConversation(
      newConversationSubject.trim(),
      productId,
      `Hi! I'm interested in ${productName || 'this product'}. Could you help me with some information?`
    );
    
    if (conversationId) {
      setActiveConversation(conversationId);
      setShowConversations(false);
      setNewConversationSubject("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showConversations && newConversationSubject.trim()) {
        handleCreateConversation();
      } else if (!showConversations && newMessage.trim()) {
        handleSendMessage();
      }
    }
  };

  const activeConv = conversations.find(c => c.id === activeConversation);

  return (
    <ComingSoonOverlay 
      title="Chat System Coming Soon"
      description="We're building a powerful messaging system to connect you with our support team!"
    >
      <Card className="w-80 h-96 flex flex-col shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} />
          <span className="font-medium text-sm">
            {showConversations ? "Messages" : activeConv?.subject || "Chat"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!showConversations && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowConversations(true);
                setActiveConversation(null);
              }}
              className="text-primary-foreground hover:bg-primary-foreground/20 h-6 w-6 p-0"
            >
              ←
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-primary-foreground hover:bg-primary-foreground/20 h-6 w-6 p-0"
          >
            <X size={14} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {showConversations ? (
          <div className="flex flex-col h-full">
            {/* New conversation form */}
            <div className="p-3 border-b">
              <div className="flex gap-2">
                <Input
                  placeholder={productName ? `Ask about ${productName}` : "What do you need help with?"}
                  value={newConversationSubject}
                  onChange={(e) => setNewConversationSubject(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-xs"
                />
                <Button 
                  size="sm" 
                  onClick={handleCreateConversation}
                  disabled={!newConversationSubject.trim()}
                >
                  Start
                </Button>
              </div>
            </div>

            {/* Conversations list */}
            <ConversationList
              conversations={conversations}
              onSelectConversation={(id) => {
                setActiveConversation(id);
                setShowConversations(false);
              }}
              isAdmin={isAdmin}
            />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Conversation header */}
            {activeConv && (
              <div className="p-2 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium truncate">{activeConv.subject}</p>
                    {activeConv.product && (
                      <p className="text-xs text-muted-foreground">{activeConv.product.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={activeConv.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {activeConv.status}
                    </Badge>
                    {isAdmin && (
                      <select
                        value={activeConv.status}
                        onChange={(e) => updateConversationStatus(activeConv.id, e.target.value as any)}
                        className="text-xs border rounded px-1"
                      >
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="closed">Closed</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <MessagesList messages={messages} currentUserId={user?.id} />

            {/* Message input */}
            {activeConv?.status !== 'closed' && (
              <div className="p-2 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="text-xs"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <Send size={12} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
    </ComingSoonOverlay>
  );
};