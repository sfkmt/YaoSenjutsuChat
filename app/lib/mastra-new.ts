import { Mastra, createTool } from '@mastra/core'
import { z } from 'zod'
import OpenAI from 'openai'
import { yaosenjutsuAPI } from './yaosenjutsu'
import { saveConversation, loadConversation, ConversationContext } from './firebase-mock'

// OpenAI設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ツール定義
const getNatalChartTool = createTool({
  id: 'getNatalChart',
  description: 'ユーザーの出生チャートを取得',
  inputSchema: z.object({
    dob: z.string().describe('生年月日 (YYYY-MM-DD)'),
    lat: z.number().describe('緯度'),
    lon: z.number().describe('経度'),
  }),
  execute: async ({ context, data }) => {
    console.log('Getting natal chart for:', data)
    const chart = await yaosenjutsuAPI.getNatalChart({
      dob: data.dob,
      lat: data.lat,
      lon: data.lon,
    })
    return {
      success: true,
      data: chart,
    }
  },
})

const getTransitChartTool = createTool({
  id: 'getTransitChart',
  description: '現在または特定日のトランジットチャートを取得',
  inputSchema: z.object({
    dob: z.string().describe('生年月日 (YYYY-MM-DD)'),
    lat: z.number().describe('緯度'),
    lon: z.number().describe('経度'),
    targetDate: z.string().optional().describe('対象日 (YYYY-MM-DD)'),
  }),
  execute: async ({ context, data }) => {
    console.log('Getting transit chart for:', data)
    const chart = await yaosenjutsuAPI.getTransitChart({
      dob: data.dob,
      lat: data.lat,
      lon: data.lon,
      targetDate: data.targetDate,
    })
    return {
      success: true,
      data: chart,
    }
  },
})

const extractUserInfoTool = createTool({
  id: 'extractUserInfo',
  description: 'メッセージから生年月日と出生地を抽出',
  inputSchema: z.object({
    message: z.string().describe('ユーザーメッセージ'),
  }),
  execute: async ({ context, data }) => {
    const result: any = {}

    // 生年月日の抽出
    const dobPatterns = [
      /(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})日?/,
      /(\d{1,2})[月\-\/](\d{1,2})[日\-\/](\d{4})/,
    ]

    for (const pattern of dobPatterns) {
      const match = data.message.match(pattern)
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
    const locationMatch = data.message.match(locationPattern)
    if (locationMatch) {
      result.location = locationMatch[1]
      
      // 都市の座標を取得
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
      
      const coords = cities[result.location]
      if (coords) {
        result.lat = coords.lat
        result.lon = coords.lon
      }
    }

    return {
      success: true,
      data: result,
    }
  },
})

// Mastraエージェントクラス
export class MastraAstrologyAgent {
  private mastra: Mastra
  private context: ConversationContext | null = null

  constructor() {
    this.mastra = new Mastra({
      tools: {
        getNatalChart: getNatalChartTool,
        getTransitChart: getTransitChartTool,
        extractUserInfo: extractUserInfoTool,
      },
      llm: {
        provider: 'OPEN_AI',
        name: 'gpt-4o',
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

      // ユーザー情報を抽出（直接実行）
      const extractResult = await extractUserInfoTool.execute({
        context: {},
        data: { message },
      })

      console.log('Extracted user info:', extractResult)

      if (extractResult.success && extractResult.data) {
        const extracted = extractResult.data as any
        if (!this.context!.userInfo) {
          this.context!.userInfo = {}
        }
        if (extracted.dateOfBirth) {
          this.context!.userInfo.dateOfBirth = extracted.dateOfBirth
        }
        if (extracted.location) {
          this.context!.userInfo.birthLocation = extracted.location
          this.context!.userInfo.birthLat = extracted.lat
          this.context!.userInfo.birthLon = extracted.lon
        }
      }
      
      console.log('Context userInfo:', this.context!.userInfo)

      // 占星術チャートが必要か判断
      const needsChart = this.shouldFetchChart(message)
      let chartData = null

      if (needsChart && this.context!.userInfo?.dateOfBirth && this.context!.userInfo?.birthLat) {
        try {
          const is2025Query = message.includes('2025')
          
          if (is2025Query) {
            const result = await getTransitChartTool.execute({
              context: {},
              data: {
                dob: this.context!.userInfo.dateOfBirth,
                lat: this.context!.userInfo.birthLat,
                lon: this.context!.userInfo.birthLon!,
                targetDate: '2025-01-01',
              },
            })
            if (result.success) {
              chartData = result.data
            }
          } else {
            const result = await getNatalChartTool.execute({
              context: {},
              data: {
                dob: this.context!.userInfo.dateOfBirth,
                lat: this.context!.userInfo.birthLat,
                lon: this.context!.userInfo.birthLon!,
              },
            })
            if (result.success) {
              chartData = result.data
            }
          }
          
          if (chartData) {
            this.context!.chartData = chartData
          }
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
${chartData ? `\n占星術チャート情報:\n${JSON.stringify(chartData)}` : ''}`

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
      console.error('Mastraエージェントエラー:', error)
      
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
}

export const mastraAgent = new MastraAstrologyAgent()