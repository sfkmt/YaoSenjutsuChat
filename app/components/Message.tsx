import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Bot, User } from "lucide-react";

interface MessageProps {
  content: string;
  isUser: boolean;
  timestamp: string;
}

export function Message({ content, isUser, timestamp }: MessageProps) {
  return (
    <div className={`flex gap-4 mb-6 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src="" />
        <AvatarFallback className={isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex-1 max-w-3xl ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block p-4 rounded-2xl shadow-sm ${
            isUser
              ? "bg-primary text-primary-foreground ml-auto"
              : "bg-card text-card-foreground border border-border"
          }`}
        >
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
        <div className={`text-xs text-muted-foreground mt-2 ${isUser ? "text-right" : ""}`}>
          {timestamp}
        </div>
      </div>
    </div>
  );
}