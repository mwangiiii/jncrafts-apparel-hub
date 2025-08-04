import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";
import { ChatWindow } from "./ChatWindow";
import { useAuth } from "@/contexts/AuthContext";

interface ChatWidgetProps {
  productId?: string;
  productName?: string;
}

const ChatWidget = ({ productId, productName }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="mb-4">
          <ChatWindow
            onClose={() => setIsOpen(false)}
            productId={productId}
            productName={productName}
          />
        </div>
      )}
      
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="lg"
        className="rounded-full h-12 w-12 shadow-lg bg-primary hover:bg-primary/90"
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </Button>
    </div>
  );
};

export default ChatWidget;