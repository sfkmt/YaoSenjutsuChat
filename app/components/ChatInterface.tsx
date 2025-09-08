'use client'

import { useEffect, useRef } from 'react'
import { DeepChat } from 'deep-chat-react'

interface ChatInterfaceProps {
  threadId: string
}

export default function ChatInterface({ threadId }: ChatInterfaceProps) {
  const chatRef = useRef<any>(null)

  useEffect(() => {
    // Load conversation history if exists
    if (chatRef.current && threadId) {
      console.log('Loading thread:', threadId)
    }
  }, [threadId])

  // カスタムリクエストハンドラー
  const customRequest = async (body: any, signals: any) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...body,
          threadId: threadId,
        }),
      })
      
      const data = await response.json()
      console.log('API Response:', data)
      
      // DeepChatが期待する形式で返す
      signals.onResponse({ text: data.text })
    } catch (error) {
      console.error('Chat error:', error)
      signals.onResponse({ error: 'エラーが発生しました' })
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <DeepChat
        ref={chatRef}
        style={{
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          width: '100%',
          height: '600px',
        }}
        textInput={{
          placeholder: {
            text: 'あなたの悩みや質問を入力してください...',
          },
        }}
        request={customRequest}
        initialMessages={[
          {
            role: 'ai',
            text: 'こんにちは！私はYaoSenjutsu AIアシスタントです。キャリア、恋愛、人生の悩みなど、どんなことでもお話しください。占星術の知見を基に、あなたに寄り添ったアドバイスをお届けします。',
          },
        ]}
        messageStyles={{
          default: {
            shared: {
              bubble: {
                maxWidth: '80%',
                fontSize: '0.95rem',
                lineHeight: '1.6',
              },
            },
            user: {
              bubble: {
                backgroundColor: '#7c3aed',
                color: 'white',
              },
            },
            ai: {
              bubble: {
                backgroundColor: '#f3f4f6',
                color: '#1f2937',
              },
            },
          },
        }}
      />
    </div>
  )
}