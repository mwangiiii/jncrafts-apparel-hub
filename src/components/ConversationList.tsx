import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Conversation } from "@/types/database";

interface ConversationListProps {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  isAdmin: boolean;
}

export const ConversationList = ({ 
  conversations, 
  onSelectConversation, 
  isAdmin 
}: ConversationListProps) => {
  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">
          No conversations yet.<br />
          Start a new conversation above.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-2">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className="p-2 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{conversation.subject}</p>
                {conversation.product && (
                  <p className="text-xs text-muted-foreground truncate">
                    {conversation.product.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge 
                  variant={conversation.status === 'active' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {conversation.status}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};