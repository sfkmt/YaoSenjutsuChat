// Firebase機能のモック実装（開発環境用）

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface ConversationContext {
  threadId: string
  messages: Message[]
  userInfo?: {
    dateOfBirth?: string
    datetime?: string
    birthLocation?: string
    birthLat?: number
    birthLon?: number
  }
  chartData?: any
}

// メモリ内ストレージ（開発環境用）
const memoryStorage = new Map<string, ConversationContext>()

export async function saveConversation(context: ConversationContext) {
  try {
    memoryStorage.set(context.threadId, {
      ...context,
      lastUpdated: Date.now(),
    } as any)
    console.log('Conversation saved to memory:', context.threadId)
  } catch (error) {
    console.error('Error saving conversation:', error)
  }
}

export async function loadConversation(threadId: string): Promise<ConversationContext | null> {
  try {
    const context = memoryStorage.get(threadId)
    if (context) {
      console.log('Conversation loaded from memory:', threadId)
      return context
    }
    return null
  } catch (error) {
    console.error('Error loading conversation:', error)
    return null
  }
}

export async function addMessage(threadId: string, message: Message) {
  try {
    const context = memoryStorage.get(threadId)
    if (context) {
      context.messages.push(message)
      memoryStorage.set(threadId, context)
      console.log('Message added to thread:', threadId)
    }
  } catch (error) {
    console.error('Error adding message:', error)
  }
}