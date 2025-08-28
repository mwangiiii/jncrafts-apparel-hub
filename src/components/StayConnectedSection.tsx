import { Clock, MessageCircle, Package, Headphones } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const StayConnectedSection = () => {
  return (
    <div className="relative">
      {/* Blurred background content */}
      <div className="blur-sm pointer-events-none select-none">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <MessageCircle className="w-6 h-6" />
              Stay Connected
            </CardTitle>
            <p className="text-muted-foreground">
              View your product enquiries, track orders, and chat with support
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* My Conversations Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  My Conversations
                </h3>
                <div className="space-y-3">
                  <div className="p-4 border rounded-lg bg-card">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">Product Inquiry</h4>
                        <p className="text-sm text-muted-foreground">
                          Question about Blue Cotton Shirt sizing
                        </p>
                        <span className="text-xs text-muted-foreground">2 hours ago</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg bg-card">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Headphones className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">Support Chat</h4>
                        <p className="text-sm text-muted-foreground">
                          Order tracking assistance
                        </p>
                        <span className="text-xs text-muted-foreground">1 day ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Coming soon overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center space-y-4 p-8 bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border max-w-md mx-4">
          <div className="flex justify-center">
            <div className="relative">
              <MessageCircle className="w-16 h-16 text-primary" />
              <Clock className="w-8 h-8 text-yellow-500 absolute -top-2 -right-2 bg-background rounded-full p-1" />
            </div>
          </div>
          
          <div className="space-y-3">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 px-3 py-1">
              Coming Soon
            </Badge>
            <h3 className="text-xl font-semibold text-foreground">
              Stay Connected
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              We're building a comprehensive communication hub where you can view your product enquiries, track orders, and chat with our support team!
            </p>
          </div>
          
          <div className="text-sm text-muted-foreground border-t pt-4">
            Thank you for your patience as we enhance your experience
          </div>
        </div>
      </div>
    </div>
  );
};