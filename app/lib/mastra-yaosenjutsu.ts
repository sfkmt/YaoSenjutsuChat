import { Mastra } from '@mastra/core'
import { OpenAI } from 'openai'
import { yaoSenjutsuRealAPI } from './yaosenjutsu-real'
import { saveConversation, loadConversation, ConversationContext } from './firebase-mock'

// OpenAI設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Mastraエージェントクラス
export class MastraYaoSenjutsuAgent {
  private mastra: Mastra
  private context: ConversationContext | null = null

  constructor() {
    this.mastra = new Mastra({})
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
    try {
      if (!this.context || this.context.threadId !== threadId) {
        await this.initialize(threadId)
      }

      // ユーザーメッセージを追加
      this.context!.messages.push({
        role: 'user',
        content: message,
        timestamp: Date.now(),
      })

      // ユーザー情報を抽出
      console.log('Extracting user info from message:', message)
      const extracted = this.extractUserInfo(message)

      if (extracted.dateOfBirth || extracted.location) {
        if (!this.context!.userInfo) {
          this.context!.userInfo = {}
        }
        if (extracted.dateOfBirth) {
          this.context!.userInfo.dateOfBirth = extracted.dateOfBirth
        }
        if (extracted.location) {
          this.context!.userInfo.birthLocation = extracted.location
        }
      }
      
      console.log('Context userInfo:', this.context!.userInfo)

      // 占星術チャートを取得
      let chartData = null
      if (this.context!.userInfo?.dateOfBirth && message.includes('チャート')) {
        try {
          console.log('Fetching natal chart...')
          const chartResult = await yaoSenjutsuRealAPI.getNatalChart({
            name: 'ユーザー',
            datetime: this.context!.userInfo.dateOfBirth + 'T12:00:00+09:00',
            location: this.context!.userInfo.birthLocation,
            language: 'ja',
          })
          
          chartData = chartResult
          this.context!.chartData = chartData
          console.log('Chart data received:', chartData)
        } catch (error) {
          console.error('チャート取得エラー:', error)
        }
      }

      // システムプロンプト作成
      const systemPrompt = `あなたは優しく親身な占星術コーチングアシスタントです。
ユーザーの悩みに共感し、占星術の知見を基に前向きなアドバイスを提供します。
専門用語は避け、分かりやすい日本語で説明してください。
${this.context!.userInfo?.dateOfBirth ? 
  `ユーザー情報: 生年月日: ${this.context!.userInfo.dateOfBirth}, 
   出生地: ${this.context!.userInfo.birthLocation || '未設定'}` : 
  'まだユーザー情報が提供されていません。生年月日と出生地を尋ねてください。'}
${chartData ? `\n占星術データ:\n${JSON.stringify(chartData, null, 2).substring(0, 2000)}` : ''}`

      // メッセージ履歴を作成
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...this.context!.messages.slice(-10).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ]

      // OpenAI APIでレスポンス生成
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 800,
      })

      const assistantMessage = completion.choices[0].message.content || 'すみません、回答を生成できませんでした。'

      // アシスタントメッセージを追加
      this.context!.messages.push({
        role: 'assistant',
        content: assistantMessage,
        timestamp: Date.now(),
      })

      // 会話を保存
      await saveConversation(this.context!)

      return assistantMessage
    } catch (error) {
      console.error('Mastraエージェントエラー:', error)
      
      if (!this.context!.userInfo?.dateOfBirth) {
        return 'こんにちは！あなたの占星術チャートを作成するために、生年月日（例：1990年1月1日）と出生地（例：東京）を教えていただけますか？'
      }
      
      return 'すみません、エラーが発生しました。もう一度お試しください。'
    }
  }

  extractUserInfo(message: string): {
    dateOfBirth?: string
    location?: string
  } {
    const result: any = {}

    // 生年月日の抽出
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

    // 場所の抽出
    const locationPattern = /(東京|大阪|名古屋|札幌|福岡|横浜|京都|神戸|さいたま|広島|仙台|千葉|新潟|浜松|熊本|相模原|静岡|岡山|堺|川崎)/
    const locationMatch = message.match(locationPattern)
    if (locationMatch) {
      result.location = locationMatch[1]
    }

    return result
  }

  // 都市名を座標に変換（簡易版）
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
      'さいたま': { lat: 35.8617, lon: 139.6455 },
      '広島': { lat: 34.3853, lon: 132.4553 },
      '仙台': { lat: 38.2682, lon: 140.8694 },
      '千葉': { lat: 35.6074, lon: 140.1065 },
      '新潟': { lat: 37.9026, lon: 139.0232 },
      '浜松': { lat: 34.7108, lon: 137.7261 },
      '熊本': { lat: 32.8032, lon: 130.7079 },
      '相模原': { lat: 35.5711, lon: 139.3733 },
      '静岡': { lat: 34.9769, lon: 138.3831 },
      '岡山': { lat: 34.6551, lon: 133.9195 },
      '堺': { lat: 34.5733, lon: 135.4830 },
      '川崎': { lat: 35.5308, lon: 139.7029 },
    }
    return cities[city] || null
  }
}

export const mastraYaoSenjutsuAgent = new MastraYaoSenjutsuAgent()