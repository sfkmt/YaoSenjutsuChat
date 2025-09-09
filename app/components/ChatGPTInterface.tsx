'use client'

import { useState, useCallback, useRef, useEffect } from "react";
import { Plus, Send, Paperclip, Mic, MessageSquare, Settings, User, Bot, Sparkles, Menu, X, Copy, Check } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [controlNeeds, setControlNeeds] = useState<string[]>([]);
  const [controlPrompt, setControlPrompt] = useState<string>("");
  // Controlled inputs for required info form
  const [formDob, setFormDob] = useState<string>("");
  const [formTime, setFormTime] = useState<string>("");
  const [formTimeUnknown, setFormTimeUnknown] = useState<boolean>(false);
  const [formLocation, setFormLocation] = useState<string>("");
  const [formSecondDob, setFormSecondDob] = useState<string>("");
  const [formSecondTime, setFormSecondTime] = useState<string>("");
  const [formSecondLocation, setFormSecondLocation] = useState<string>("");
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

    // Create AI message placeholder for streaming
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      content: '',
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Add empty AI message
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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', text: userMessage }],
          threadId: threadId,
          stream: true,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Check if streaming is supported
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/event-stream')) {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (reader) {
          let accumulatedContent = '';
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            // Control marker parsing: __CONTROL__:{json}\n
            const parts = chunk.split('\n');
            for (const line of parts) {
              if (line.startsWith('__CONTROL__:')) {
                try {
                  const payload = JSON.parse(line.replace('__CONTROL__:', ''));
                  if (payload?.type === 'control') {
                    setControlNeeds(payload.needs || []);
                    setControlPrompt(payload.prompt || '');
                  }
                } catch (e) {
                  console.warn('Failed to parse control payload', e);
                }
              } else {
                accumulatedContent += line;
              }
            }
            
            // Update the AI message content
            setConversations(prev => 
              prev.map(conv => 
                conv.id === activeConversationId 
                  ? { 
                      ...conv, 
                      messages: conv.messages.map(msg => 
                        msg.id === aiMessageId 
                          ? { ...msg, content: accumulatedContent }
                          : msg
                      )
                    }
                  : conv
              )
            );
          }
        }
      } else {
        // Fallback to non-streaming response
        const data = await response.json();
        
        setConversations(prev => 
          prev.map(conv => 
            conv.id === activeConversationId 
              ? { 
                  ...conv, 
                  messages: conv.messages.map(msg => 
                    msg.id === aiMessageId 
                      ? { ...msg, content: data.text || "申し訳ありません。エラーが発生しました。" }
                      : msg
                  )
                }
              : conv
          )
        );
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Update error message
      setConversations(prev => 
        prev.map(conv => 
          conv.id === activeConversationId 
            ? { 
                ...conv, 
                messages: conv.messages.map(msg => 
                  msg.id === aiMessageId 
                    ? { ...msg, content: "申し訳ありません。エラーが発生しました。しばらくしてからもう一度お試しください。" }
                    : msg
                )
              }
            : conv
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeConversationId, activeConversation, threadId, message, isLoading]);

  const handleSubmitRequiredInfo = useCallback(async () => {
    // Construct a concise natural language fill message
    const parts: string[] = [];
    if (controlNeeds.includes('dob') && formDob) parts.push(`${formDob.replace(/\//g,'-')}生まれ`);
    if (controlNeeds.includes('time')) {
      if (formTimeUnknown) parts.push('時刻不明');
      else if (formTime) parts.push(`${formTime}生まれ`);
    }
    if (controlNeeds.includes('location') && formLocation) parts.push(`${formLocation}出身`);
    // second person
    if (controlNeeds.some(n => n.startsWith('second_person'))) {
      const second: string[] = [];
      if (formSecondDob) second.push(`相手は${formSecondDob.replace(/\//g,'-')}生まれ`);
      if (formSecondTime) second.push(`${formSecondTime}生まれ`);
      if (formSecondLocation) second.push(`${formSecondLocation}出身`);
      if (second.length) parts.push(second.join('、'));
    }
    const synth = parts.join('、');
    setMessage(synth);
    // Reset control state and send
    setControlNeeds([]);
    setControlPrompt("");
    await handleSendMessage();
  }, [controlNeeds, formDob, formTime, formTimeUnknown, formLocation, formSecondDob, formSecondTime, formSecondLocation, handleSendMessage]);

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

  const handleCopyMessage = useCallback((messageId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 2000);
  }, []);

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
                      width: 'fit-content',
                      maxWidth: '100%'
                    }}>
                      {msg.isUser ? (
                        <div style={{ whiteSpace: 'pre-wrap', fontSize: '16px', lineHeight: '1.5' }}>
                          {msg.content}
                        </div>
                      ) : (
                        <div className="markdown-content" style={{ fontSize: '16px', lineHeight: '1.5' }}>
                          {msg.content ? (
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({children}) => <p style={{margin: '0 0 16px 0', lineHeight: '1.6'}}>{children}</p>,
                                ul: ({children}) => <ul style={{margin: '8px 0', paddingLeft: '20px'}}>{children}</ul>,
                                ol: ({children}) => <ol style={{margin: '8px 0', paddingLeft: '20px'}}>{children}</ol>,
                                li: ({children}) => <li style={{margin: '4px 0'}}>{children}</li>,
                                h1: ({children}) => <h1 style={{fontSize: '1.5em', fontWeight: 'bold', margin: '16px 0 8px 0'}}>{children}</h1>,
                                h2: ({children}) => <h2 style={{fontSize: '1.3em', fontWeight: 'bold', margin: '16px 0 8px 0'}}>{children}</h2>,
                                h3: ({children}) => <h3 style={{fontSize: '1.1em', fontWeight: 'bold', margin: '12px 0 6px 0'}}>{children}</h3>,
                                strong: ({children}) => <strong style={{fontWeight: '600'}}>{children}</strong>,
                                code: ({inline, children}) => 
                                  inline ? (
                                    <code style={{
                                      backgroundColor: 'rgba(0,0,0,0.05)',
                                      padding: '2px 4px',
                                      borderRadius: '3px',
                                      fontSize: '0.9em',
                                      fontFamily: 'monospace'
                                    }}>{children}</code>
                                  ) : (
                                    <pre style={{
                                      backgroundColor: '#2d2d2d',
                                      color: '#f8f8f2',
                                      padding: '12px',
                                      borderRadius: '6px',
                                      overflow: 'auto',
                                      margin: '8px 0'
                                    }}>
                                      <code style={{fontFamily: 'monospace', fontSize: '0.9em'}}>{children}</code>
                                    </pre>
                                  ),
                                blockquote: ({children}) => (
                                  <blockquote style={{
                                    borderLeft: '3px solid #7c3aed',
                                    paddingLeft: '12px',
                                    margin: '8px 0',
                                    color: '#666'
                                  }}>{children}</blockquote>
                                ),
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          ) : (
                            isLoading && (
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
                            )
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: msg.isUser ? 'flex-end' : 'space-between',
                      marginTop: '4px',
                      gap: '8px'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        color: '#999'
                      }}>
                        {msg.timestamp}
                      </div>
                      {!msg.isUser && msg.content && (
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#666',
                            fontSize: '12px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f0f0f0';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check size={12} />
                              <span>コピー済み</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>コピー</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area or Required Info Form */}
        <div style={{
          borderTop: 'none',
          padding: isMobile ? '12px' : '20px',
          backgroundColor: '#ffffff'
        }}>
          <div style={{ maxWidth: isMobile ? '100%' : '800px', margin: '0 auto' }}>
            {controlNeeds.length > 0 ? (
              <div style={{
                padding: '16px',
                backgroundColor: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '12px',
                marginBottom: '12px'
              }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{controlPrompt || '必要な情報を入力してください'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  {controlNeeds.includes('dob') && (
                    <div>
                      <div style={{ fontSize: 12, marginBottom: 6 }}>生年月日</div>
                      <input type="date" value={formDob} onChange={(e) => setFormDob(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd' }} />
                    </div>
                  )}
                  {controlNeeds.includes('time') && (
                    <div>
                      <div style={{ fontSize: 12, marginBottom: 6 }}>出生時刻（不明可）</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} disabled={formTimeUnknown} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #ddd' }} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <input type="checkbox" checked={formTimeUnknown} onChange={(e) => setFormTimeUnknown(e.target.checked)} />
                          不明
                        </label>
                      </div>
                    </div>
                  )}
                  {controlNeeds.includes('location') && (
                    <div>
                      <div style={{ fontSize: 12, marginBottom: 6 }}>出生地</div>
                      <input type="text" placeholder="例: 東京" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd' }} />
                    </div>
                  )}
                  {controlNeeds.some(n => n.startsWith('second_person')) && (
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #eee', paddingTop: 8 }}>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>相手の情報</div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 8 }}>
                        <input type="date" value={formSecondDob} onChange={(e) => setFormSecondDob(e.target.value)} placeholder="生年月日" style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd' }} />
                        <input type="time" value={formSecondTime} onChange={(e) => setFormSecondTime(e.target.value)} placeholder="出生時刻" style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd' }} />
                        <input type="text" value={formSecondLocation} onChange={(e) => setFormSecondLocation(e.target.value)} placeholder="出生地" style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd' }} />
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setControlNeeds([]); setControlPrompt(""); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}>キャンセル</button>
                  <button onClick={handleSubmitRequiredInfo} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff' }}>送信</button>
                </div>
              </div>
            ) : (
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
            )}
            
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
