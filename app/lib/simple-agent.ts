// シンプルなエージェント実装（Mastraの代替）
import OpenAI from 'openai'
import { yaosenjutsuAPI } from './yaosenjutsu'
import { saveConversation, loadConversation, ConversationContext } from './firebase-mock'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export class SimpleAstrologyAgent {
  private context: ConversationContext | null = null

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

    // ユーザーメッセージを追加
    this.context!.messages.push({
      role: 'user',
      content: message,
      timestamp: Date.now(),
    })

    try {
      // ユーザー情報の抽出
      const extractedInfo = this.extractUserInfo(message)
      
      // ユーザー情報を更新
      if (extractedInfo.dateOfBirth || extractedInfo.location) {
        if (!this.context!.userInfo) {
          this.context!.userInfo = {}
        }
        if (extractedInfo.dateOfBirth) {
          this.context!.userInfo.dateOfBirth = extractedInfo.dateOfBirth
        }
        if (extractedInfo.location) {
          this.context!.userInfo.birthLocation = extractedInfo.location
          const coords = this.getCityCoordinates(extractedInfo.location)
          if (coords) {
            this.context!.userInfo.birthLat = coords.lat
            this.context!.userInfo.birthLon = coords.lon
          }
        }
      }

      // 占星術チャートが必要か判断
      const needsChart = this.shouldFetchChart(message)
      let chartData = null

      if (needsChart && this.context!.userInfo?.dateOfBirth && this.context!.userInfo?.birthLat) {
        try {
          // 2025年について聞かれているか確認
          const is2025Query = message.includes('2025')
          
          if (is2025Query) {
            chartData = await yaosenjutsuAPI.getTransitChart({
              dob: this.context!.userInfo.dateOfBirth,
              lat: this.context!.userInfo.birthLat,
              lon: this.context!.userInfo.birthLon!,
              targetDate: '2025-01-01',
            })
          } else {
            chartData = await yaosenjutsuAPI.getNatalChart({
              dob: this.context!.userInfo.dateOfBirth,
              lat: this.context!.userInfo.birthLat,
              lon: this.context!.userInfo.birthLon!,
            })
          }
          this.context!.chartData = chartData
        } catch (error) {
          console.error('チャート取得エラー:', error)
        }
      }

      // OpenAI APIでレスポンス生成
      const messages: any[] = [
        {
          role: 'system',
          content: `あなたは優しく親身な占星術コーチングアシスタントです。
            ユーザーの悩みに共感し、占星術の知見を基に前向きなアドバイスを提供します。
            専門用語は避け、分かりやすい日本語で説明してください。
            ${this.context!.userInfo?.dateOfBirth ? 
              `ユーザー情報: 生年月日: ${this.context!.userInfo.dateOfBirth}, 
               出生地: ${this.context!.userInfo.birthLocation || '未設定'}` : 
              'まだユーザー情報が提供されていません。生年月日と出生地を尋ねてください。'}
            ${chartData ? `\n占星術チャート情報:\n${JSON.stringify(chartData.interpretation)}` : ''}`
        }
      ]

      // 最近のメッセージを追加（最大5件）
      const recentMessages = this.context!.messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content,
      }))
      messages.push(...recentMessages)

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 500,
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
      console.error('メッセージ処理エラー:', error)
      
      // ユーザー情報がない場合の応答
      if (!this.context!.userInfo?.dateOfBirth) {
        return 'こんにちは！あなたの占星術チャートを作成するために、生年月日（例：1990年1月1日）と出生地（例：東京）を教えていただけますか？'
      }
      
      return 'すみません、エラーが発生しました。もう一度お試しください。'
    }
  }

  private shouldFetchChart(message: string): boolean {
    const chartKeywords = ['運勢', '占い', 'チャート', '2025', '今年', '来年', 'キャリア', '恋愛', '仕事', '未来']
    return chartKeywords.some(keyword => message.includes(keyword))
  }

  extractUserInfo(message: string): {
    dateOfBirth?: string
    location?: string
  } {
    const result: any = {}

    // 生年月日の抽出（様々な形式）
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

    // 場所の抽出（日本の都市）
    const locationPattern = /(東京|大阪|名古屋|札幌|福岡|横浜|京都|神戸|さいたま|広島|仙台|千葉|新潟|浜松|熊本|相模原|静岡|岡山|堺|川崎)/
    const locationMatch = message.match(locationPattern)
    if (locationMatch) {
      result.location = locationMatch[1]
    }

    return result
  }

  // 都市名から座標を取得（簡略版）
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
    }
    return cities[city] || null
  }
}

export const simpleAgent = new SimpleAstrologyAgent()