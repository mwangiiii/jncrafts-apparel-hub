import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useMessaging } from "@/hooks/useMessaging";

interface ChatWidgetProps {
  productId?: string;
  productName?: string;
}

const ChatWidget = ({ productId, productName }: ChatWidgetProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createConversation } = useMessaging();

  if (!user) {
    return null;
  }

  const handleStartConversation = async () => {
    try {
      const subject = productName ? `Enquiry about ${productName}` : "General Enquiry";
      const conversationId = await createConversation(subject, productId);
      navigate(`/messages/${conversationId}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
      // Fallback: navigate to messages page
      navigate('/messages');
    }
  };

  return (
    <Button
      onClick={handleStartConversation}
      size="lg"
      className="rounded-full h-12 w-12 shadow-lg bg-primary hover:bg-primary/90"
      title={productName ? `Message about ${productName}` : "Start conversation"}
    >
      <MessageCircle size={20} />
    </Button>
  );
};

export default ChatWidget;