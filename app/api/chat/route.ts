import { NextRequest, NextResponse } from 'next/server'
// 八百占術API対応のMastraエージェントを使用
import { mastraYaoSenjutsuAgent } from '@/app/lib/mastra-yaosenjutsu'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    // DeepChatは messages 配列を送信する
    const { messages, threadId, stream } = body
    
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

    console.log('Processing message:', messageText, 'with threadId:', actualThreadId, 'stream:', stream)

    // Check if streaming is requested
    if (stream) {
      // Create a readable stream for streaming response
      const encoder = new TextEncoder()
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            // Process message with streaming
            await mastraYaoSenjutsuAgent.processMessageStream(
              messageText,
              actualThreadId,
              (chunk: string) => {
                controller.enqueue(encoder.encode(chunk))
              }
            )
            controller.close()
          } catch (error) {
            console.error('Streaming error:', error)
            controller.error(error)
          }
        },
      })

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      // Non-streaming response (original behavior)
      const response = await mastraYaoSenjutsuAgent.processMessage(
        messageText,
        actualThreadId
      )

      // Return response in DeepChat format
      return NextResponse.json({
        text: response,
      })
    }
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}