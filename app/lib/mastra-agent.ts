import { Mastra } from '@mastra/core'
import { OpenAI } from 'openai'
import { yaosenjutsuAPI } from './yaosenjutsu'
// 開発環境ではモックを使用
import { saveConversation, loadConversation, ConversationContext } from './firebase-mock'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export class AstrologyAgent {
  private mastra: Mastra
  private context: ConversationContext | null = null

  constructor() {
    this.mastra = new Mastra({
      name: 'YaoSenjutsu Assistant',
      instructions: `あなたは優しく親身な占星術コーチングアシスタントです。
        ユーザーの悩みに共感し、占星術の知見を基に前向きなアドバイスを提供します。
        専門用語は避け、分かりやすい日本語で説明してください。
        必要に応じて生年月日と出生地を尋ね、占星術チャートを作成します。`,
      model: {
        provider: 'OPEN_AI',
        name: 'gpt-4o',
        toolChoice: 'auto',
      },
      tools: {
        getNatalChart: {
          description: 'ユーザーの出生チャートを取得',
          parameters: {
            type: 'object',
            properties: {
              dob: { type: 'string', description: '生年月日 (YYYY-MM-DD)' },
              lat: { type: 'number', description: '緯度' },
              lon: { type: 'number', description: '経度' },
            },
            required: ['dob', 'lat', 'lon'],
          },
          execute: async ({ dob, lat, lon }: any) => {
            const chart = await yaosenjutsuAPI.getNatalChart({ dob, lat, lon })
            return chart
          },
        },
        getTransitChart: {
          description: '現在または特定日のトランジットチャートを取得',
          parameters: {
            type: 'object',
            properties: {
              dob: { type: 'string', description: '生年月日 (YYYY-MM-DD)' },
              lat: { type: 'number', description: '緯度' },
              lon: { type: 'number', description: '経度' },
              targetDate: { type: 'string', description: '対象日 (YYYY-MM-DD)' },
            },
            required: ['dob', 'lat', 'lon'],
          },
          execute: async ({ dob, lat, lon, targetDate }: any) => {
            const chart = await yaosenjutsuAPI.getTransitChart({ 
              dob, 
              lat, 
              lon, 
              targetDate 
            })
            return chart
          },
        },
        saveUserInfo: {
          description: 'ユーザー情報を保存',
          parameters: {
            type: 'object',
            properties: {
              dateOfBirth: { type: 'string' },
              birthLocation: { type: 'string' },
              birthLat: { type: 'number' },
              birthLon: { type: 'number' },
            },
          },
          execute: async (userInfo: any) => {
            if (this.context) {
              this.context.userInfo = userInfo
              await saveConversation(this.context)
            }
            return { success: true }
          },
        },
      },
    })
  }

  async initialize(threadId: string) {
    this.context = await loadConversation(threadId)
    if (!this.context) {
      this.context = {
        threadId,
        messages: [],
      }
    }
  }

  async processMessage(message: string, threadId: string): Promise<string> {
    if (!this.context || this.context.threadId !== threadId) {
      await this.initialize(threadId)
    }

    // Add user message to context
    this.context!.messages.push({
      role: 'user',
      content: message,
      timestamp: Date.now(),
    })

    try {
      // Create messages array for OpenAI
      const messages = this.context!.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }))

      // Add system message with context
      const systemMessage = {
        role: 'system' as const,
        content: `あなたは優しく親身な占星術コーチングアシスタントです。
          ${this.context!.userInfo ? 
            `ユーザー情報: 生年月日: ${this.context!.userInfo.dateOfBirth}, 
             出生地: ${this.context!.userInfo.birthLocation}` : 
            'ユーザー情報はまだ提供されていません。'}`,
      }

      // Get response from Mastra/OpenAI
      const response = await this.mastra.generate([systemMessage, ...messages])
      
      const assistantMessage = response.text || 'すみません、回答を生成できませんでした。'

      // Add assistant message to context
      this.context!.messages.push({
        role: 'assistant',
        content: assistantMessage,
        timestamp: Date.now(),
      })

      // Save conversation
      await saveConversation(this.context!)

      return assistantMessage
    } catch (error) {
      console.error('Error processing message:', error)
      return 'すみません、エラーが発生しました。もう一度お試しください。'
    }
  }

  extractUserInfo(message: string): {
    dateOfBirth?: string
    location?: string
  } {
    const result: any = {}

    // Extract date of birth (various formats)
    const dobPatterns = [
      /(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})日?/,
      /(\d{1,2})[月\-\/](\d{1,2})[日\-\/](\d{4})/,
    ]

    for (const pattern of dobPatterns) {
      const match = message.match(pattern)
      if (match) {
        const year = match[1].length === 4 ? match[1] : match[3]
        const month = match[1].length === 4 ? match[2] : match[1]
        const day = match[1].length === 4 ? match[3] : match[2]
        result.dateOfBirth = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        break
      }
    }

    // Extract location (Japanese cities)
    const locationPattern = /(東京|大阪|名古屋|札幌|福岡|横浜|京都|神戸|さいたま|広島|仙台|千葉|新潟|浜松|熊本|相模原|静岡|岡山|堺|川崎)/
    const locationMatch = message.match(locationPattern)
    if (locationMatch) {
      result.location = locationMatch[1]
    }

    return result
  }

  // Convert city name to coordinates (simplified - in production, use geocoding API)
  getCityCoordinates(city: string): { lat: number; lon: number } | null {
    const cities: Record<string, { lat: number; lon: number }> = {
      '東京': { lat: 35.6895, lon: 139.6917 },
      '大阪': { lat: 34.6937, lon: 135.5023 },
      '名古屋': { lat: 35.1815, lon: 136.9066 },
      '札幌': { lat: 43.0642, lon: 141.3469 },
      '福岡': { lat: 33.5904, lon: 130.4017 },
      '横浜': { lat: 35.4437, lon: 139.6380 },
      '京都': { lat: 35.0116, lon: 135.7681 },
      '神戸': { lat: 34.6901, lon: 135.1955 },
      // Add more cities as needed
    }
    return cities[city] || null
  }
}

export const astrologyAgent = new AstrologyAgent()