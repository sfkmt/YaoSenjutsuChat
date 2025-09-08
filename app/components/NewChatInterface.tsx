'use client'

import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { ChatArea } from "./ChatArea";
import { MessageInput } from "./MessageInput";

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messages: ChatMessage[];
}

interface NewChatInterfaceProps {
  threadId: string;
}

export default function NewChatInterface({ threadId }: NewChatInterfaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "1",
      title: "今日の運勢",
      lastMessage: "今日の運勢を教えてください",
      timestamp: "2時間前",
      messages: []
    }
  ]);
  
  const [activeConversationId, setActiveConversationId] = useState<string>("1");
  const [isLoading, setIsLoading] = useState(false);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!activeConversation) return;

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Add user message
    setConversations(prev => 
      prev.map(conv => 
        conv.id === activeConversationId 
          ? { 
              ...conv, 
              messages: [...conv.messages, newUserMessage],
              lastMessage: message.slice(0, 30) + (message.length > 30 ? '...' : ''),
              timestamp: '今'
            }
          : conv
      )
    );

    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', text: message }],
          threadId: threadId,
        }),
      });
      
      const data = await response.json();
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.text || "申し訳ありません。エラーが発生しました。",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversations(prev => 
        prev.map(conv => 
          conv.id === activeConversationId 
            ? { 
                ...conv, 
                messages: [...conv.messages, aiMessage]
              }
            : conv
        )
      );
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "申し訳ありません。エラーが発生しました。しばらくしてからもう一度お試しください。",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversations(prev => 
        prev.map(conv => 
          conv.id === activeConversationId 
            ? { 
                ...conv, 
                messages: [...conv.messages, errorMessage]
              }
            : conv
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeConversationId, activeConversation, threadId]);

  const handleNewConversation = useCallback(() => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: "新しいチャット",
      lastMessage: "",
      timestamp: "今",
      messages: []
    };

    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
  }, []);

  return (
    <div className="h-screen flex bg-background text-foreground">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onConversationSelect={setActiveConversationId}
        onNewConversation={handleNewConversation}
      />
      
      <div className="flex-1 flex flex-col">
        <ChatArea 
          messages={activeConversation?.messages || []}
          isLoading={isLoading}
        />
        <MessageInput 
          onSendMessage={handleSendMessage}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}