import axios from 'axios'

const API_URL = 'https://api.yaosenjutsu.com'
const API_KEY = process.env.YAOSENJUTSU_API_KEY

export interface NatalChartRequest {
  name: string
  datetime: string // ISO 8601 format or flexible format
  latitude?: number
  longitude?: number
  address?: string
  location?: string
  timezone?: string
  gender?: string
  birth_time_unknown?: boolean
  birth_place_unknown?: boolean
  language?: 'ja' | 'en' | 'symbol'
}

export interface TransitRequest extends NatalChartRequest {
  target_date?: string
}

export interface HoroscopeRequest {
  name: string
  datetime: string
  latitude?: number
  longitude?: number
  address?: string
  location?: string
  timezone?: string
  target_date?: string
  language?: 'ja' | 'en'
}

class YaoSenjutsuRealAPI {
  private headers = {
    'X-API-Key': API_KEY || '',
    'Content-Type': 'application/json',
  }

  async getNatalChart(request: NatalChartRequest): Promise<any> {
    try {
      console.log('Calling YaoSenjutsu Natal Chart API:', request)
      
      const response = await axios.post(
        `${API_URL}/api/v1/natal_chart`,
        {
          ...request,
          language: request.language || 'ja',
        },
        { headers: this.headers }
      )
      
      console.log('Natal Chart Response:', response.data)
      return response.data
    } catch (error: any) {
      console.error('Error fetching natal chart:', error.response?.data || error.message)
      throw new Error('Failed to fetch natal chart')
    }
  }

  async getTransits(request: TransitRequest): Promise<any> {
    try {
      console.log('Calling YaoSenjutsu Transits API:', request)
      
      const response = await axios.post(
        `${API_URL}/api/v1/transits`,
        {
          ...request,
          language: request.language || 'ja',
        },
        { headers: this.headers }
      )
      
      console.log('Transits Response:', response.data)
      return response.data
    } catch (error: any) {
      console.error('Error fetching transits:', error.response?.data || error.message)
      throw new Error('Failed to fetch transits')
    }
  }

  async getHoroscope(request: HoroscopeRequest): Promise<any> {
    try {
      console.log('Calling YaoSenjutsu Horoscope API:', request)
      
      const response = await axios.post(
        `${API_URL}/api/v1/horoscope`,
        {
          ...request,
          language: request.language || 'ja',
        },
        { headers: this.headers }
      )
      
      console.log('Horoscope Response:', response.data)
      return response.data
    } catch (error: any) {
      console.error('Error fetching horoscope:', error.response?.data || error.message)
      throw new Error('Failed to fetch horoscope')
    }
  }

  // ヘルパー関数：生年月日と時刻を組み合わせてISO形式に変換
  formatDateTime(date: string, time?: string): string {
    // 日付が YYYY-MM-DD 形式の場合
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // 時刻が不明な場合は正午を使用
      const timeStr = time || '12:00:00'
      return `${date}T${timeStr}+09:00` // 日本時間として扱う
    }
    
    // すでにISO形式の場合はそのまま返す
    return date
  }
}

export const yaoSenjutsuRealAPI = new YaoSenjutsuRealAPI()