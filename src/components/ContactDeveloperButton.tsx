import { useState } from "react";
import { Mail, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ContactDeveloperButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleEmailClick = () => {
    window.location.href = "mailto:mwangiwanjiku033@gmail.com";
  };

  const handleWhatsAppClick = () => {
    window.open("https://wa.me/254743614394", "_blank");
  };

  return (
    <TooltipProvider>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Contact Options - Visible when open */}
        {isOpen && (
          <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-200">
            <Button
              onClick={handleEmailClick}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <Mail className="h-4 w-4" />
              Email Developer
            </Button>
            <Button
              onClick={handleWhatsAppClick}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2 shadow-lg hover:shadow-xl transition-all bg-[#25D366] hover:bg-[#20BA5A] text-white"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          </div>
        )}

        {/* Main Toggle Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsOpen(!isOpen)}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all animate-pulse hover:animate-none"
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <MessageCircle className="h-6 w-6" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>💡 Want a similar website? Contact the developer</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default ContactDeveloperButton;
