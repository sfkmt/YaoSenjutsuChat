import { NextRequest, NextResponse } from 'next/server'
// Mastraの代わりにシンプルなエージェントを使用
import { simpleAgent } from '@/app/lib/simple-agent'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, threadId } = body

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      )
    }

    if (!threadId) {
      return NextResponse.json(
        { error: 'Thread ID is required' },
        { status: 400 }
      )
    }

    // Get the latest user message
    const userMessage = messages[messages.length - 1]
    if (!userMessage || userMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      )
    }

    // Process message with simple agent
    const response = await simpleAgent.processMessage(
      userMessage.text,
      threadId
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