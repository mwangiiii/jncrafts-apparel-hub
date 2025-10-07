import { useState, useEffect } from "react";
import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const ContactDeveloperButton = () => {
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      // Only apply on smaller screens (md and below)
      if (window.innerWidth <= 768) {
        setIsScrolling(true);
        
        // Clear existing timeout
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        
        // Set new timeout to fade back in after scrolling stops
        const timeout = setTimeout(() => {
          setIsScrolling(false);
        }, 150);
        
        setScrollTimeout(timeout);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [scrollTimeout]);
  const handleEmailClick = () => {
    window.location.href = "mailto:mwangiwanjiku033@gmail.com";
  };

  const handleWhatsAppClick = () => {
    window.open("https://wa.me/254743614394", "_blank");
  };

  return (
    <div 
      className={`fixed bottom-6 right-6 z-40 transition-all duration-300 ${
        isScrolling ? 'md:opacity-30 md:blur-[2px]' : 'opacity-100 blur-0'
      }`}
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-muted-foreground border-muted hover:bg-muted/50 transition-colors shadow-sm"
          >
            Need a similar site?
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="end" 
          className="w-72"
        >
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm mb-1">Custom Development</h4>
              <p className="text-xs text-muted-foreground">
                Professional web solutions for your business
              </p>
            </div>
            <div className="space-y-2">
              <Button
                onClick={handleEmailClick}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
              >
                <Mail className="h-3.5 w-3.5 mr-2" />
                mwangiwanjiku033@gmail.com
              </Button>
              <Button
                onClick={handleWhatsAppClick}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
              >
                <Phone className="h-3.5 w-3.5 mr-2" />
                +254 743 614 394
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ContactDeveloperButton;
