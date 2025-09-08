import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, get, push } from 'firebase/database'

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
}

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

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
    birthLocation?: string
    birthLat?: number
    birthLon?: number
  }
  chartData?: any
}

export async function saveConversation(context: ConversationContext) {
  try {
    const conversationRef = ref(database, `conversations/${context.threadId}`)
    await set(conversationRef, {
      ...context,
      lastUpdated: Date.now(),
    })
  } catch (error) {
    console.error('Error saving conversation:', error)
  }
}

export async function loadConversation(threadId: string): Promise<ConversationContext | null> {
  try {
    const conversationRef = ref(database, `conversations/${threadId}`)
    const snapshot = await get(conversationRef)
    if (snapshot.exists()) {
      return snapshot.val() as ConversationContext
    }
    return null
  } catch (error) {
    console.error('Error loading conversation:', error)
    return null
  }
}

export async function addMessage(threadId: string, message: Message) {
  try {
    const messagesRef = ref(database, `conversations/${threadId}/messages`)
    await push(messagesRef, message)
  } catch (error) {
    console.error('Error adding message:', error)
  }
}