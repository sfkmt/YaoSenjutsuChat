'use client'

import { useState, useCallback, useRef, useEffect } from "react";
import { Plus, Send, Paperclip, Mic, MessageSquare, Settings, User, Bot, Sparkles, Menu, X } from "lucide-react";

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

interface ChatGPTInterfaceProps {
  threadId: string;
}

export default function ChatGPTInterface({ threadId }: ChatGPTInterfaceProps) {
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
  const [message, setMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || isLoading || !activeConversation) return;

    const userMessage = message.trim();
    setMessage("");
    
    // Reset textarea height
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.style.height = '24px';
    }

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      content: userMessage,
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
              lastMessage: userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : ''),
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
          messages: [{ role: 'user', text: userMessage }],
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
  }, [activeConversationId, activeConversation, threadId, message, isLoading]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleConversationSelect = (id: string) => {
    setActiveConversationId(id);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', backgroundColor: '#ffffff', position: 'relative' }}>
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 40
          }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? (isSidebarOpen ? 0 : '-260px') : 0,
        top: 0,
        bottom: 0,
        width: '260px',
        backgroundColor: '#f9f9f9',
        borderRight: 'none',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
        zIndex: isMobile ? 50 : 1,
        transition: 'left 0.3s ease-in-out'
      }}>
        {/* New Chat Button */}
        <div style={{ padding: '12px' }}>
          <button
            onClick={handleNewConversation}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'transparent',
              border: '1px solid #d0d0d0',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Plus size={16} />
            新しいチャット
          </button>
        </div>

        {/* Conversations List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => handleConversationSelect(conversation.id)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '2px',
                backgroundColor: activeConversationId === conversation.id ? '#e8e8e8' : 'transparent',
                border: 'none',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                if (activeConversationId !== conversation.id) {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }
              }}
              onMouseLeave={(e) => {
                if (activeConversationId !== conversation.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <MessageSquare size={16} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '2px' }}>
                  {conversation.title}
                </div>
                <div style={{ fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conversation.lastMessage}
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#999', flexShrink: 0 }}>
                {conversation.timestamp}
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px', borderTop: 'none' }}>
          <button
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Settings size={16} />
            設定
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', marginTop: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              U
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>ユーザー</div>
              <div style={{ fontSize: '12px', color: '#666' }}>無料プラン</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Mobile Header */}
        {isMobile && (
          <div style={{
            padding: '12px 16px',
            borderBottom: 'none',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#ffffff'
          }}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 style={{
              marginLeft: '12px',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              八百占術
            </h1>
          </div>
        )}

        {/* Messages Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '20px' }}>
          {activeConversation?.messages.length === 0 ? (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ textAlign: 'center', maxWidth: isMobile ? '90%' : '400px', padding: isMobile ? '0 16px' : '0' }}>
                <div style={{
                  width: isMobile ? '60px' : '80px',
                  height: isMobile ? '60px' : '80px',
                  borderRadius: '50%',
                  backgroundColor: '#f0e6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <Sparkles size={isMobile ? 28 : 36} color="#7c3aed" />
                </div>
                <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '600', marginBottom: '8px' }}>
                  八百占術へようこそ
                </h2>
                <p style={{ color: '#666', fontSize: isMobile ? '13px' : '14px' }}>
                  占星術の知見を基に、あなたの悩みや質問にお答えします。
                  どんなことでもお気軽にお話しください。
                </p>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: isMobile ? '100%' : '800px', margin: '0 auto' }}>
              {activeConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    gap: isMobile ? '8px' : '12px',
                    marginBottom: isMobile ? '16px' : '24px',
                    flexDirection: msg.isUser ? 'row-reverse' : 'row'
                  }}
                >
                  <div style={{
                    width: isMobile ? '28px' : '32px',
                    height: isMobile ? '28px' : '32px',
                    borderRadius: '50%',
                    backgroundColor: msg.isUser ? '#7c3aed' : '#e5e5e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {msg.isUser ? (
                      <User size={isMobile ? 14 : 16} color="white" />
                    ) : (
                      <Bot size={isMobile ? 14 : 16} color="#666" />
                    )}
                  </div>
                  <div style={{ flex: 1, maxWidth: isMobile ? '85%' : '70%' }}>
                    <div style={{
                      padding: isMobile ? '10px 12px' : '12px 16px',
                      borderRadius: '12px',
                      backgroundColor: msg.isUser ? '#7c3aed' : '#f7f7f8',
                      color: msg.isUser ? 'white' : '#1a1a1a',
                      marginLeft: msg.isUser ? 'auto' : 0,
                      width: 'fit-content'
                    }}>
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: '16px', lineHeight: '1.5' }}>
                        {msg.content}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#999',
                      marginTop: '4px',
                      textAlign: msg.isUser ? 'right' : 'left'
                    }}>
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', marginBottom: isMobile ? '16px' : '24px' }}>
                  <div style={{
                    width: isMobile ? '28px' : '32px',
                    height: isMobile ? '28px' : '32px',
                    borderRadius: '50%',
                    backgroundColor: '#e5e5e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Bot size={isMobile ? 14 : 16} color="#666" />
                  </div>
                  <div style={{
                    padding: isMobile ? '10px 12px' : '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: '#f7f7f8'
                  }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#999',
                        animation: 'bounce 1.4s infinite ease-in-out',
                        animationDelay: '0s'
                      }} />
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#999',
                        animation: 'bounce 1.4s infinite ease-in-out',
                        animationDelay: '0.16s'
                      }} />
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#999',
                        animation: 'bounce 1.4s infinite ease-in-out',
                        animationDelay: '0.32s'
                      }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{
          borderTop: 'none',
          padding: isMobile ? '12px' : '20px',
          backgroundColor: '#ffffff'
        }}>
          <div style={{ maxWidth: isMobile ? '100%' : '800px', margin: '0 auto' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '8px' : '12px',
              padding: isMobile ? '8px 12px 8px 16px' : '8px 16px 8px 20px',
              backgroundColor: '#f0f0f0',
              borderRadius: '24px',
              border: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>
              {!isMobile && (
                <button
                  style={{
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e5e5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Paperclip size={20} color="#666" />
                </button>
              )}
              
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  // Auto-resize textarea
                  e.target.style.height = '24px';
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                }}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="メッセージを入力してください..."
                disabled={isLoading}
                rows={1}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontSize: isMobile ? '16px' : '16px',
                  lineHeight: '1.5',
                  height: '24px',
                  maxHeight: '200px',
                  padding: '0',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif',
                  overflow: 'hidden'
                }}
              />
              
              {!isMobile && (
                <button
                  style={{
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e5e5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Mic size={20} color="#666" />
                </button>
              )}

              <button
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
                style={{
                  width: '32px',
                  height: '32px',
                  padding: '0',
                  backgroundColor: message.trim() && !isLoading ? '#7c3aed' : '#d0d0d0',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: message.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
              >
                <Send size={16} color={message.trim() && !isLoading ? 'white' : '#999'} />
              </button>
            </div>
            
            <div style={{
              textAlign: 'center',
              fontSize: '11px',
              color: '#999',
              marginTop: '8px'
            }}>
              八百占術は占星術の知見を基にアドバイスを提供します。重要な決定は慎重にご検討ください。
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}