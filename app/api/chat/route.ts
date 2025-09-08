import { NextRequest, NextResponse } from 'next/server'
// 八百占術API対応のMastraエージェントを使用
import { mastraYaoSenjutsuAgent } from '@/app/lib/mastra-yaosenjutsu'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    // DeepChatは messages 配列を送信する
    const { messages, threadId } = body
    
    // threadIdがない場合はランダムに生成
    const actualThreadId = threadId || `thread_${Date.now()}_${Math.random().toString(36).substring(7)}`

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      )
    }

    // Get the latest user message
    const userMessage = messages[messages.length - 1]
    const messageText = userMessage.text || userMessage.content || ''
    
    if (!messageText) {
      return NextResponse.json(
        { error: 'Empty message' },
        { status: 400 }
      )
    }

    console.log('Processing message:', messageText, 'with threadId:', actualThreadId)

    // Process message with YaoSenjutsu Mastra agent
    const response = await mastraYaoSenjutsuAgent.processMessage(
      messageText,
      actualThreadId
    )

    // Return response in DeepChat format
    return NextResponse.json({
      text: response,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}