import { Plus, MessageSquare, Settings, User } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  onConversationSelect: (id: string) => void;
  onNewConversation: () => void;
}

export function Sidebar({ 
  conversations, 
  activeConversationId, 
  onConversationSelect, 
  onNewConversation 
}: SidebarProps) {
  return (
    <div className="flex-shrink-0 w-80 bg-gray-100 border-r border-gray-200 flex flex-col h-full" style={{minWidth: '320px', maxWidth: '320px'}}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Button 
          onClick={onNewConversation}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          新しいチャット
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 py-2">
          {conversations.map((conversation) => (
            <Button
              key={conversation.id}
              variant={activeConversationId === conversation.id ? "secondary" : "ghost"}
              className={`w-full justify-start p-3 h-auto rounded-lg ${
                activeConversationId === conversation.id 
                  ? "bg-primary/10 text-primary shadow-sm" 
                  : "hover:bg-accent text-foreground"
              }`}
              onClick={() => onConversationSelect(conversation.id)}
            >
              <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0" />
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">{conversation.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {conversation.lastMessage}
                </div>
              </div>
              <span className="text-xs text-muted-foreground ml-2">
                {conversation.timestamp}
              </span>
            </Button>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-foreground hover:bg-accent"
        >
          <Settings className="w-4 h-4 mr-3" />
          設定
        </Button>
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground">U</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="text-sm font-medium text-foreground">ユーザー</div>
            <div className="text-xs text-muted-foreground">無料プラン</div>
          </div>
        </div>
      </div>
    </div>
  );
}