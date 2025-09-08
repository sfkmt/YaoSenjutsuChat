import { useState } from "react";
import { Send, Paperclip, Mic } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-end gap-3 bg-muted/50 border border-border rounded-2xl shadow-sm p-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力してください..."
            className="flex-1 border-0 bg-transparent resize-none min-h-[40px] max-h-32 p-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
            disabled={disabled}
          />
          
          <div className="flex gap-2 flex-shrink-0">
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-lg text-muted-foreground hover:text-foreground"
            >
              <Mic className="w-4 h-4" />
            </Button>
            <Button 
              onClick={handleSend}
              disabled={!message.trim() || disabled}
              size="sm"
              className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-lg"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground text-center mt-2">
          YaoSenjutsu AIは占星術の知見を基にアドバイスを提供します。重要な決定は慎重にご検討ください。
        </div>
      </div>
    </div>
  );
}