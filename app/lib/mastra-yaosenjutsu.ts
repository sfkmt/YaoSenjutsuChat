import { Mastra } from '@mastra/core'
import { OpenAI } from 'openai'
import { yaoSenjutsuRealAPI } from './yaosenjutsu-real'
import { saveConversation, loadConversation, ConversationContext } from './firebase-mock'
import { createChartSummaryForPrompt, formatChartForLLM } from './chart-formatter'

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
      // Always load the latest context from storage
      await this.initialize(threadId)

      // ユーザーメッセージを追加
      this.context!.messages.push({
        role: 'user',
        content: message,
        timestamp: Date.now(),
      })

      // ユーザー情報を抽出
      console.log('Extracting user info from message:', message)
      const extracted = this.extractUserInfo(message)

      if (extracted.dateOfBirth || extracted.datetime || extracted.location || extracted.gender) {
        if (!this.context!.userInfo) {
          this.context!.userInfo = {}
        }
        if (extracted.dateOfBirth) {
          this.context!.userInfo.dateOfBirth = extracted.dateOfBirth
        }
        if (extracted.datetime) {
          this.context!.userInfo.datetime = extracted.datetime
        }
        if (extracted.location) {
          this.context!.userInfo.birthLocation = extracted.location
        }
        if (extracted.gender) {
          this.context!.userInfo.gender = extracted.gender
        }
      }
      
      console.log('Context userInfo:', this.context!.userInfo)

      // Determine what type of data to fetch based on keywords
      let chartData = null
      let additionalData: any[] = []
      const { primary, secondary, deepDive } = this.determineRequestType(message)
      
      if (primary && this.context!.userInfo?.dateOfBirth) {
        try {
          console.log('=== FETCHING CHART DATA ===')
          console.log('Primary type:', primary)
          console.log('Secondary types:', secondary)
          console.log('Deep dive:', deepDive)
          
          const birthData = {
            name: 'ユーザー',
            datetime: this.context!.userInfo.datetime || 
              (this.context!.userInfo.dateOfBirth + 'T12:00:00+09:00'),
            location: this.context!.userInfo.birthLocation || '東京',
            language: 'ja' as const,
          }
          
          // Check if synastry type needs second person info
          const needsSecondPerson = ['yaosynastry', 'synastry', 'sanku'].includes(primary)
          let secondBirthData: any = null
          
          if (needsSecondPerson) {
            const secondInfo = this.extractSecondPersonInfo(message)
            if (!secondInfo.dateOfBirth && !this.context!.secondUserInfo?.dateOfBirth) {
              return '相性を占うために、パートナーの生年月日と出生地を教えてください。例：「相手は1990年5月15日生まれ、東京出身です」'
            }
            
            // Save second person info if new
            if (secondInfo.dateOfBirth) {
              this.context!.secondUserInfo = secondInfo
            }
            
            secondBirthData = {
              name: this.context!.secondUserInfo?.name || 'パートナー',
              datetime: (this.context!.secondUserInfo?.dateOfBirth || secondInfo.dateOfBirth) + 'T12:00:00+09:00',
              location: this.context!.secondUserInfo?.birthLocation || secondInfo.location || '東京',
              gender: this.context!.secondUserInfo?.gender || secondInfo.gender,
            }
          }
          
          switch (primary) {
            case 'natal':
              chartData = await yaoSenjutsuRealAPI.getNatalChart(birthData)
              break
            
            case 'transit':
              chartData = await yaoSenjutsuRealAPI.getTransits({
                ...birthData,
                transit_date: new Date().toISOString(),
              })
              break
            
            case 'solar_return':
              chartData = await yaoSenjutsuRealAPI.getSolarReturn({
                ...birthData,
                year: new Date().getFullYear(),
              })
              break
            
            case 'lunar_return':
              chartData = await yaoSenjutsuRealAPI.getLunarReturn(birthData)
              break
            
            case 'saturn_return':
              chartData = await yaoSenjutsuRealAPI.getSaturnReturn(birthData)
              break
            
            case 'progressions':
              chartData = await yaoSenjutsuRealAPI.getProgressions({
                ...birthData,
                target_date: new Date().toISOString(),
                progression_type: 'secondary',
              })
              break
            
            case 'horoscope':
              chartData = await yaoSenjutsuRealAPI.getHoroscope({
                date: new Date().toISOString().split('T')[0],
                language: 'ja',
              })
              break
            
            case 'yaonatal':
              chartData = await yaoSenjutsuRealAPI.getYaoNatal(birthData)
              break
            
            case 'yaosynastry':
              // Need to extract second person info from message
              // For now, just use placeholder
              console.log('YaoSynastry requires two people - need more info')
              break
            
            case 'yaotransits':
              chartData = await yaoSenjutsuRealAPI.getYaoTransits({
                name: 'ユーザー',
                birth_datetime: this.context!.userInfo.datetime || 
                  (this.context!.userInfo.dateOfBirth + 'T12:00:00+09:00'),
                birth_location: this.context!.userInfo.birthLocation,
                transit_datetime: new Date().toISOString(),
                language: 'ja',
              })
              break
            
            case 'sukuyo':
              chartData = await yaoSenjutsuRealAPI.getSukuyo({
                name: 'ユーザー',
                datetime: this.context!.userInfo.datetime || 
                  (this.context!.userInfo.dateOfBirth + 'T12:00:00+09:00'),
                include_details: true,
              })
              break
            
            case 'sanku':
              // Need to extract second person info from message
              console.log('Sanku requires two people - need more info')
              break
            
            case 'dailysanku':
              chartData = await yaoSenjutsuRealAPI.getDailySanku({
                name: 'ユーザー',
                birth_datetime: this.context!.userInfo.datetime || 
                  (this.context!.userInfo.dateOfBirth + 'T12:00:00+09:00'),
                target_date: new Date().toISOString().split('T')[0],
                include_ryohan: true,
                include_rokugai: true,
              })
              break
          }
          
          if (chartData) {
            // Add chart type for formatter
            chartData.chart_type = primary
            
            console.log('=== CHART DATA RECEIVED ===')
            console.log('Chart type:', primary)
            console.log('Data keys:', Object.keys(chartData))
          }
          
          // Deep dive: fetch secondary endpoints if requested
          if (deepDive && secondary.length > 0 && chartData) {
            console.log('=== FETCHING SECONDARY DATA (Deep Dive) ===')
            console.log('Secondary types:', secondary)
            
            const secondaryPromises = secondary.map(async (type) => {
              try {
                let secData = null
                switch (type) {
                  case 'natal':
                    secData = await yaoSenjutsuRealAPI.getNatalChart(birthData)
                    break
                  case 'transit':
                    secData = await yaoSenjutsuRealAPI.getTransits({
                      ...birthData,
                      transit_date: new Date().toISOString(),
                    })
                    break
                  case 'sukuyo':
                    secData = await yaoSenjutsuRealAPI.getSukuyo({
                      name: birthData.name,
                      datetime: birthData.datetime,
                      include_details: true,
                    })
                    break
                  case 'dailysanku':
                    secData = await yaoSenjutsuRealAPI.getDailySanku({
                      name: birthData.name,
                      birth_datetime: birthData.datetime,
                      target_date: new Date().toISOString().split('T')[0],
                      include_ryohan: true,
                      include_rokugai: true,
                    })
                    break
                  case 'synastry':
                    if (secondBirthData) {
                      secData = await yaoSenjutsuRealAPI.getSynastry({
                        person1: birthData,
                        person2: secondBirthData,
                        language: 'ja',
                      })
                    }
                    break
                  case 'sanku':
                    if (secondBirthData) {
                      secData = await yaoSenjutsuRealAPI.getSanku({
                        person1_name: birthData.name,
                        person1_datetime: birthData.datetime,
                        person2_name: secondBirthData.name,
                        person2_datetime: secondBirthData.datetime,
                        include_details: true,
                      })
                    }
                    break
                }
                
                if (secData) {
                  secData.chart_type = type
                  return secData
                }
              } catch (error) {
                console.error(`Failed to fetch secondary ${type}:`, error)
                return null
              }
            })
            
            additionalData = (await Promise.all(secondaryPromises)).filter(d => d !== null)
            console.log('Secondary data fetched:', additionalData.map(d => d.chart_type))
          }
          
          // Save all data to context
          this.context!.chartData = {
            primary: chartData,
            secondary: additionalData,
            timestamp: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
          }
        } catch (error) {
          console.error('=== CHART FETCH ERROR ===')
          console.error('Error details:', error)
          
          // Fallback mechanism for hybrid endpoints
          if (primary && primary.startsWith('yao')) {
            console.log('=== ATTEMPTING FALLBACK ===')
            const fallbackType = primary.replace('yao', '')
            try {
              switch (fallbackType) {
                case 'natal':
                  chartData = await yaoSenjutsuRealAPI.getNatalChart(birthData)
                  break
                case 'transits':
                  chartData = await yaoSenjutsuRealAPI.getTransits({
                    ...birthData,
                    transit_date: new Date().toISOString(),
                  })
                  break
                case 'synastry':
                  if (secondBirthData) {
                    chartData = await yaoSenjutsuRealAPI.getSynastry({
                      person1: birthData,
                      person2: secondBirthData,
                      language: 'ja',
                    })
                  }
                  break
              }
              if (chartData) {
                chartData.chart_type = fallbackType
                this.context!.chartData = { primary: chartData, secondary: [], timestamp: Date.now() }
                console.log('Fallback successful:', fallbackType)
              }
            } catch (fallbackError) {
              console.error('Fallback also failed:', fallbackError)
            }
          }
        }
      } else if (this.context!.chartData && primary) {
        // Use existing chart data if available and not expired
        const cached = this.context!.chartData
        if (cached.expiresAt && cached.expiresAt > Date.now()) {
          chartData = cached.primary
          additionalData = cached.secondary || []
          console.log('=== USING CACHED CHART DATA ===')
          console.log('Chart type:', chartData?.chart_type)
        } else {
          console.log('Cached data expired, fetching new data...')
          // Could re-fetch here if needed
        }
      }

      // システムプロンプト作成
      let chartSummary = ''
      
      // Format primary data
      if (chartData) {
        chartSummary = '\n' + createChartSummaryForPrompt(chartData)
      }
      
      // Format secondary data for deep dive
      if (additionalData && additionalData.length > 0) {
        chartSummary += '\n\n=== 詳細分析 ==='
        additionalData.forEach(data => {
          chartSummary += `\n\n[【${data.chart_type?.toUpperCase() || 'ADDITIONAL'}】`
          chartSummary += '\n' + createChartSummaryForPrompt(data)
        })
      }
      
      const systemPrompt = `あなたは優しく親身な占星術コーチングアシスタントです。
ユーザーの悩みに共感し、占星術の知見を基に前向きなアドバイスを提供します。
専門用語は避け、分かりやすい日本語で説明してください。

${this.context!.userInfo?.dateOfBirth ? 
  `ユーザー情報: 
生年月日時: ${this.context!.userInfo.datetime || (this.context!.userInfo.dateOfBirth + ' 12:00')}
出生地: ${this.context!.userInfo.birthLocation || '未設定'}` : 
  'まだユーザー情報が提供されていません。生年月日と出生地を尋ねてください。'}
${chartSummary}`
      
      console.log('=== SYSTEM PROMPT ===')
      console.log('Prompt length:', systemPrompt.length)
      console.log('Has user info:', !!this.context!.userInfo?.dateOfBirth)
      console.log('Has chart data:', !!chartData)
      if (chartData) {
        console.log('Chart summary included in prompt:', chartSummary.substring(0, 500) + '...')
        console.log('\n=== FORMATTED CHART DATA ===')
        console.log(formatChartForLLM(chartData))
      }

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
        max_tokens: 2000, // 800から2000に増加
      })

      const assistantMessage = completion.choices[0].message.content || 'すみません、回答を生成できませんでした。'
      
      console.log('=== OPENAI RESPONSE ===')
      console.log('Assistant message:', assistantMessage)
      console.log('Message length:', assistantMessage.length)

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

  async processMessageStream(message: string, threadId: string, onChunk: (chunk: string) => void): Promise<void> {
    try {
      // Always load the latest context from storage
      await this.initialize(threadId)

      // ユーザーメッセージを追加
      this.context!.messages.push({
        role: 'user',
        content: message,
        timestamp: Date.now(),
      })

      // ユーザー情報を抽出
      console.log('Extracting user info from message:', message)
      const extracted = this.extractUserInfo(message)

      if (extracted.dateOfBirth || extracted.datetime || extracted.location || extracted.gender) {
        if (!this.context!.userInfo) {
          this.context!.userInfo = {}
        }
        if (extracted.dateOfBirth) {
          this.context!.userInfo.dateOfBirth = extracted.dateOfBirth
        }
        if (extracted.datetime) {
          this.context!.userInfo.datetime = extracted.datetime
        }
        if (extracted.location) {
          this.context!.userInfo.birthLocation = extracted.location
        }
        if (extracted.gender) {
          this.context!.userInfo.gender = extracted.gender
        }
      }
      
      console.log('Context userInfo:', this.context!.userInfo)

      // ユーザー情報が不足している場合はコントロールイベントを送信
      if (!this.context!.userInfo?.dateOfBirth) {
        const control = {
          type: 'control',
          needs: ['dob', 'time', 'location'],
          prompt: 'チャート作成に必要な情報を入力してください（出生時刻は不明でも可）。'
        }
        onChunk(`__CONTROL__:${JSON.stringify(control)}\n`)
        return
      }

      // OpenAI APIを直接呼び出してストリーミング
      const messages = await this.prepareMessages(message, threadId)
      
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      })

      let fullMessage = ''
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          fullMessage += content
          onChunk(content)
        }
      }

      // アシスタントメッセージを追加
      this.context!.messages.push({
        role: 'assistant',
        content: fullMessage,
        timestamp: Date.now(),
      })

      // 会話を保存
      await saveConversation(this.context!)
      
    } catch (error) {
      console.error('Streaming error:', error)
      
      // エラーの種類に応じた処理
      if (error instanceof Error) {
        if (error.message === 'NEED_SECOND_PERSON_INFO') {
          const control = {
            type: 'control',
            needs: ['second_person.dob', 'second_person.time', 'second_person.location'],
            prompt: '相性を占うために、パートナーの生年月日・出生時刻（不明可）・出生地を入力してください。'
          }
          onChunk(`__CONTROL__:${JSON.stringify(control)}\n`)
          return
        }
      }
      
      onChunk('エラーが発生しました。もう一度お試しください。')
    }
  }

  // メッセージ準備用のヘルパーメソッド
  private async prepareMessages(message: string, threadId: string): Promise<any[]> {
    // Determine what type of data to fetch based on keywords
    let chartData = null
    const { primary } = this.determineRequestType(message)
    
    // ユーザー情報があれば、デフォルトでネイタルチャートを取得
    const actualPrimary = primary || (this.context!.userInfo?.dateOfBirth ? 'natal' : null)
    
    if (actualPrimary && this.context!.userInfo?.dateOfBirth) {
      try {
        const birthData = {
          name: 'ユーザー',
          datetime: this.context!.userInfo.datetime || 
            (this.context!.userInfo.dateOfBirth + 'T12:00:00+09:00'),
          location: this.context!.userInfo.birthLocation || '東京',
          language: 'ja' as const,
        }
        
        // Fetch chart data (simplified version)
        switch (actualPrimary) {
          case 'yaonatal':
            chartData = await yaoSenjutsuRealAPI.getYaoNatal(birthData)
            break
          case 'natal':
            chartData = await yaoSenjutsuRealAPI.getNatalChart(birthData)
            break
        }
        
        if (chartData) {
          chartData.chart_type = actualPrimary
          console.log('=== CHART DATA FETCHED ===')
          console.log('Chart type:', actualPrimary)
          console.log('Data keys:', Object.keys(chartData))
        }
      } catch (error) {
        console.error('Chart fetch error:', error)
      }
    }

    // システムプロンプト作成
    let chartSummary = ''
    if (chartData) {
      chartSummary = '\n' + createChartSummaryForPrompt(chartData)
    }
    
    const systemPrompt = `あなたは優しく親身な占星術コーチングアシスタントです。
ユーザーの悩みに共感し、占星術の知見を基に前向きなアドバイスを提供します。
専門用語は避け、分かりやすい日本語で説明してください。

${this.context!.userInfo?.dateOfBirth ? 
  `ユーザー情報: 
生年月日時: ${this.context!.userInfo.datetime || (this.context!.userInfo.dateOfBirth + ' 12:00')}
出生地: ${this.context!.userInfo.birthLocation || '未設定'}` : 
  'まだユーザー情報が提供されていません。生年月日と出生地を尋ねてください。'}
${chartSummary}`

    // メッセージ履歴を作成
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...this.context!.messages.slice(-10).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ]

    return messages
  }

  extractUserInfo(message: string): {
    dateOfBirth?: string
    datetime?: string
    location?: string
    gender?: 'male' | 'female'
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

    // 時刻の抽出 (複数のパターンに対応)
    const timePatterns = [
      /(\d{1,2}):(\d{2})/,           // 23:27 形式
      /(\d{1,2})時(\d{1,2})分?/,      // 23時27分 形式
    ]
    
    let timeMatch = null
    for (const pattern of timePatterns) {
      timeMatch = message.match(pattern)
      if (timeMatch) break
    }
    
    if (timeMatch) {
      const hour = timeMatch[1].padStart(2, '0')
      const minute = timeMatch[2].padStart(2, '0')
      result.datetime = result.dateOfBirth ? 
        `${result.dateOfBirth}T${hour}:${minute}:00+09:00` : 
        `T${hour}:${minute}:00+09:00`
    } else if (result.dateOfBirth) {
      // デフォルト時刻（正午）を設定
      result.datetime = `${result.dateOfBirth}T12:00:00+09:00`
    }

    // 場所の抽出
    const locationPattern = /(東京|大阪|名古屋|札幌|福岡|横浜|京都|神戸|さいたま|広島|仙台|千葉|新潟|浜松|熊本|相模原|静岡|岡山|堺|川崎)/
    const locationMatch = message.match(locationPattern)
    if (locationMatch) {
      result.location = locationMatch[1]
    }
    
    // 性別の抽出 (for BaZi and SiMeiPan)
    if (message.includes('男性') || message.includes('男')) {
      result.gender = 'male'
    } else if (message.includes('女性') || message.includes('女')) {
      result.gender = 'female'
    }

    return result
  }

  extractSecondPersonInfo(message: string): {
    dateOfBirth?: string
    location?: string
    gender?: 'male' | 'female'
    name?: string
  } {
    const result: any = {}
    
    // Patterns for second person (partner/other person)
    const secondPersonPatterns = [
      '相手', 'パートナー', '恋人', '配偶者', '彼氏', '彼女', '夫', '妻', 
      '好きな人', '気になる人', '二人目', '2人目', 'もう一人'
    ]
    
    // Find second person context
    let isSecondPersonContext = false
    for (const pattern of secondPersonPatterns) {
      if (message.includes(pattern)) {
        isSecondPersonContext = true
        break
      }
    }
    
    // Extract date patterns with context
    const dobWithContextPatterns = [
      /(?:相手|パートナー|恋人|彼氏|彼女|夫|妻)[はのが：、\s]*(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})日?/,
      /(?:相手|パートナー|恋人|彼氏|彼女|夫|妻)[はのが：、\s]*(\d{1,2})[月\-\/](\d{1,2})[日\-\/](\d{4})/,
    ]
    
    // Try context-specific patterns first
    for (const pattern of dobWithContextPatterns) {
      const match = message.match(pattern)
      if (match) {
        const year = match[1].length === 4 ? match[1] : match[3]
        const month = match[1].length === 4 ? match[2] : match[1]
        const day = match[1].length === 4 ? match[3] : match[2]
        result.dateOfBirth = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        break
      }
    }
    
    // If no context-specific match, try to find second date in message
    if (!result.dateOfBirth && isSecondPersonContext) {
      const allDates = message.matchAll(/(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})日?/g)
      const dateArray = Array.from(allDates)
      if (dateArray.length >= 2) {
        // Take the second date as partner's
        const match = dateArray[1]
        const year = match[1]
        const month = match[2]
        const day = match[3]
        result.dateOfBirth = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }
    
    // Extract location with context
    const locationWithContextPattern = /(?:相手|パートナー|恋人|彼氏|彼女|夫|妻)[はのが：、\s]*(東京|大阪|名古屋|札幌|福岡|横浜|京都|神戸|さいたま|広島|仙台|千葉|新潟|浜松|熊本|相模原|静岡|岡山|堺|川崎)/
    const locationMatch = message.match(locationWithContextPattern)
    if (locationMatch) {
      result.location = locationMatch[1]
    }
    
    // Extract gender
    if (message.includes('彼氏') || message.includes('夫') || (isSecondPersonContext && message.includes('男性'))) {
      result.gender = 'male'
    } else if (message.includes('彼女') || message.includes('妻') || (isSecondPersonContext && message.includes('女性'))) {
      result.gender = 'female'
    }
    
    // Extract name if provided
    const namePattern = /(?:相手|パートナー|恋人|彼氏|彼女)[のは]?(?:名前[はが]?)?([ぁ-んァ-ヶー一-龠a-zA-Z]+)(?:さん|くん|ちゃん)?/
    const nameMatch = message.match(namePattern)
    if (nameMatch) {
      result.name = nameMatch[1]
    }
    
    return result
  }
  
  determineRequestType(message: string): { primary: string | null, secondary: string[], deepDive: boolean } {
    // Keywords with scoring weights (hybrid endpoints prioritized)
    const keywords: Record<string, { words: string[], weight: number }> = {
      // Hybrid endpoints (prioritized with higher weight)
      yaonatal: { 
        words: ['ハイブリッド', '東西占星術', '東西統合', '融合', '八百占術', 'ネイタル', 'ホロスコープ', '出生図', 'チャート', 'ネイタルチャート'], 
        weight: 10 
      },
      yaotransits: { 
        words: ['東西トランジット', 'ハイブリッドトランジット', '現在の運勢', '今の星回り', 'トランジット'], 
        weight: 10 
      },
      yaosynastry: { 
        words: ['東西相性', 'ハイブリッド相性', '相性', '二人の相性', 'パートナー', '恋愛'], 
        weight: 10 
      },
      
      // Western astrology (individual endpoints)
      natal: { 
        words: ['西洋ネイタル', '西洋占星術', '惑星', 'ハウス', 'アセンダント', '月星座', '太陽星座'], 
        weight: 5 
      },
      transit: { 
        words: ['西洋トランジット', '現在の惑星'], 
        weight: 5 
      },
      solar_return: { 
        words: ['ソーラーリターン', '太陽回帰'], 
        weight: 5 
      },
      lunar_return: { 
        words: ['ルナーリターン', '月回帰'], 
        weight: 5 
      },
      saturn_return: { 
        words: ['サターンリターン', '土星回帰'], 
        weight: 5 
      },
      jupiter_return: { 
        words: ['ジュピターリターン', '木星回帰'], 
        weight: 5 
      },
      progressions: { 
        words: ['プログレッション', '進行法', '二次進行'], 
        weight: 5 
      },
      synastry: { 
        words: ['西洋相性', 'シナストリー'], 
        weight: 5 
      },
      composite: { 
        words: ['コンポジット', '関係性チャート'], 
        weight: 5 
      },
      
      // Eastern astrology
      sukuyo: { 
        words: ['宿曜', '本命宿', '二十七宿', '宿曜占星術'], 
        weight: 5 
      },
      sanku: { 
        words: ['三九の秘法', '三九相性'], 
        weight: 5 
      },
      dailysanku: { 
        words: ['日運', '今日の日運', '三九日運'], 
        weight: 5 
      },
      
      // Other
      horoscope: { 
        words: ['今日の運勢', '星占い', '今日の占い', '日々の運勢'], 
        weight: 5 
      },
    }

    // Deep dive keywords
    const deepDiveKeywords = ['詳しく', '詳細', '深く', '具体的に', 'もっと', '西洋だけ', '東洋だけ', '宿曜だけ', '個別に']
    
    // Calculate scores for each type
    let scores: Record<string, number> = {}
    Object.entries(keywords).forEach(([type, { words, weight }]) => {
      const matchCount = words.filter(word => message.includes(word)).length
      if (matchCount > 0) {
        scores[type] = matchCount * weight
      }
    })
    
    // Find primary type (highest score)
    let primary: string | null = null
    if (Object.keys(scores).length > 0) {
      primary = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b)
    }
    
    // Check for deep dive request
    const deepDive = deepDiveKeywords.some(word => message.includes(word))
    
    // Determine secondary endpoints for deep dive
    let secondary: string[] = []
    if (deepDive && primary) {
      const secondaryMappings: Record<string, string[]> = {
        yaonatal: ['natal', 'sukuyo'],
        yaotransits: ['transit', 'dailysanku'],
        yaosynastry: ['synastry', 'sanku'],
        // For non-hybrid endpoints, no secondary needed
        natal: [],
        sukuyo: [],
        synastry: [],
      }
      secondary = secondaryMappings[primary] || []
    }
    
    // Default to yaonatal if general chart request
    if (!primary && (message.includes('チャート') || message.includes('占って'))) {
      primary = 'yaonatal'  // Hybrid as default
    }
    
    return { primary, secondary, deepDive }
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