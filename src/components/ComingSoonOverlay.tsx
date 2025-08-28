import { Clock, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ComingSoonOverlayProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export const ComingSoonOverlay = ({ 
  children, 
  title = "Messages Coming Soon",
  description = "We're working on this feature and it will be available soon!"
}: ComingSoonOverlayProps) => {
  return (
    <div className="relative">
      {/* Blurred background content */}
      <div className="blur-sm pointer-events-none select-none">
        {children}
      </div>
      
      {/* Coming soon overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center space-y-4 p-6 bg-card/90 backdrop-blur-sm rounded-lg shadow-lg border max-w-sm mx-4">
          <div className="flex justify-center">
            <div className="relative">
              <MessageCircle className="w-12 h-12 text-primary" />
              <Clock className="w-6 h-6 text-yellow-500 absolute -top-1 -right-1 bg-background rounded-full p-1" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Coming Soon
            </Badge>
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Stay tuned for updates!
          </div>
        </div>
      </div>
    </div>
  );
};