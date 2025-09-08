import { ScrollArea } from "./ui/scroll-area";
import { Message } from "./Message";
import { Sparkles } from "lucide-react";

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

export function ChatArea({ messages, isLoading }: ChatAreaProps) {
  return (
    <div className="flex-1 flex flex-col bg-background">
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-2 text-foreground">
              YaoSenjutsu AIへようこそ
            </h2>
            <p className="text-muted-foreground">
              占星術の知見を基に、あなたの悩みや質問にお答えします。
              どんなことでもお気軽にお話しください。
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto p-4 space-y-4">
            {messages.map((message) => (
              <Message
                key={message.id}
                content={message.content}
                isUser={message.isUser}
                timestamp={message.timestamp}
              />
            ))}
            {isLoading && (
              <div className="flex gap-4 mb-6">
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                  <span className="text-secondary-foreground text-sm">AI</span>
                </div>
                <div className="flex-1 max-w-3xl">
                  <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}