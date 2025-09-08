import axios from 'axios'

// 開発環境ではモックAPIを使用
const API_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3001/api/yaosenjutsu-mock'
  : (process.env.YAOSENJUTSU_API_URL || 'https://api.yaosenjutsu.com')
const API_KEY = process.env.YAOSENJUTSU_API_KEY

export interface NatalChartRequest {
  dob: string // Format: YYYY-MM-DD
  lat: number
  lon: number
  lang?: string
}

export interface TransitChartRequest extends NatalChartRequest {
  targetDate?: string // Format: YYYY-MM-DD
}

export interface ChartResponse {
  planets: any
  houses: any
  aspects: any
  interpretation: string
}

class YaoSenjutsuAPI {
  private headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }

  async getNatalChart(request: NatalChartRequest): Promise<ChartResponse> {
    try {
      const response = await axios.post(
        `${API_URL}/natal`,
        {
          ...request,
          lang: request.lang || 'ja',
        },
        { headers: this.headers }
      )
      return response.data
    } catch (error) {
      console.error('Error fetching natal chart:', error)
      throw new Error('Failed to fetch natal chart')
    }
  }

  async getTransitChart(request: TransitChartRequest): Promise<ChartResponse> {
    try {
      const response = await axios.post(
        `${API_URL}/transit`,
        {
          ...request,
          lang: request.lang || 'ja',
          targetDate: request.targetDate || new Date().toISOString().split('T')[0],
        },
        { headers: this.headers }
      )
      return response.data
    } catch (error) {
      console.error('Error fetching transit chart:', error)
      throw new Error('Failed to fetch transit chart')
    }
  }
}

export const yaosenjutsuAPI = new YaoSenjutsuAPI()