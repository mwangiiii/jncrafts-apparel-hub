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
import Header from "@/components/Header";
import { StayConnectedSection } from "@/components/StayConnectedSection";

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
      <div className="min-h-screen bg-background">
        <Header 
          cartItems={0} 
          onCartClick={() => {}} 
        />
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your messages...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        cartItems={0} 
        onCartClick={() => {}} 
      />
      <div className="container mx-auto py-8 px-4">
        <StayConnectedSection />
      </div>
    </div>
  );
};

export default UserMessages;