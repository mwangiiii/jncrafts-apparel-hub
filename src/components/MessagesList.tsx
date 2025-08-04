import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Message } from "@/types/database";

interface MessagesListProps {
  messages: Message[];
  currentUserId?: string;
}

export const MessagesList = ({ messages, currentUserId }: MessagesListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">
          No messages yet.<br />
          Send a message to start the conversation.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-2">
      <div className="space-y-2">
        {messages.map((message) => {
          const isOwnMessage = message.sender_id === currentUserId;
          const isSystem = message.message_type === 'system';

          if (isSystem) {
            return (
              <div key={message.id} className="flex justify-center">
                <div className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs">
                  {message.content}
                </div>
              </div>
            );
          }

          return (
            <div
              key={message.id}
              className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              {!isOwnMessage && (
                <Avatar className="w-6 h-6 text-xs">
                  {message.sender_type === 'admin' ? 'A' : 'U'}
                </Avatar>
              )}
              
              <div
                className={`max-w-[70%] p-2 rounded-lg text-xs ${
                  isOwnMessage
                    ? 'bg-primary text-primary-foreground ml-2'
                    : 'bg-muted text-foreground mr-2'
                }`}
              >
                <p className="break-words">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}
                >
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </p>
              </div>

              {isOwnMessage && (
                <Avatar className="w-6 h-6 text-xs">
                  {message.sender_type === 'admin' ? 'A' : 'U'}
                </Avatar>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};