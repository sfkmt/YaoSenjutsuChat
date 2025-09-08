import axios from 'axios'

const API_URL = 'https://api.yaosenjutsu.com'
const API_KEY = process.env.YAOSENJUTSU_API_KEY

// Base interfaces
export interface BirthData {
  name: string
  datetime: string
  location?: string
  latitude?: number
  longitude?: number
  language?: 'ja' | 'en' | 'symbol'
}

// Western Astrology interfaces
export interface NatalChartRequest extends BirthData {}

export interface SolarReturnRequest extends BirthData {
  year: number
}

export interface LunarReturnRequest extends BirthData {
  target_date?: string
  target_month?: number
}

export interface ReturnRequest extends BirthData {
  year?: number
}

export interface TransitRequest extends BirthData {
  transit_date?: string
}

export interface SynastryRequest {
  person1: BirthData
  person2: BirthData
  language?: 'ja' | 'en' | 'symbol'
}

export interface TripleSynastryRequest {
  person1: BirthData
  person2: BirthData
  person3: BirthData
  language?: 'ja' | 'en' | 'symbol'
}

export interface ProgressionRequest extends BirthData {
  target_date: string
  progression_type?: 'secondary' | 'solar_arc'
}

export interface ElectionRequest {
  start_date: string
  end_date: string
  purpose?: string
  location?: string
  language?: 'ja' | 'en'
}

// Horoscope interface
export interface HoroscopeRequest {
  date: string
  sign?: string
  language?: 'ja' | 'en'
  enhanced?: boolean
}

// YaoSenjutsu Hybrid interfaces
export interface YaoNatalRequest extends BirthData {}

export interface YaoSynastryRequest {
  person1_name: string
  person1_datetime: string
  person1_location?: string
  person2_name: string
  person2_datetime: string
  person2_location?: string
  language?: 'ja' | 'en'
}

export interface YaoTransitsRequest {
  name: string
  birth_datetime: string
  birth_location?: string
  transit_datetime: string
  language?: 'ja' | 'en'
}

// Eastern Astrology interfaces
export interface SukuyoRequest {
  name: string
  datetime: string
  include_details?: boolean
}

export interface SankuRequest {
  person1_name: string
  person1_datetime: string
  person2_name: string
  person2_datetime: string
  include_details?: boolean
}

export interface DailySankuRequest {
  name: string
  birth_datetime: string
  target_date?: string
  include_ryohan?: boolean
  include_rokugai?: boolean
}

export interface SankuSearchRequest {
  base_suku: string
  target_sukus?: string[]
}

class YaoSenjutsuRealAPI {
  private headers = {
    'X-API-Key': API_KEY || '',
    'Content-Type': 'application/json',
  }

  private async post(endpoint: string, data: any): Promise<any> {
    try {
      console.log(`=== YaoSenjutsu API: ${endpoint} ===`)
      console.log('Request:', JSON.stringify(data, null, 2))
      
      const response = await axios.post(
        `${API_URL}${endpoint}`,
        data,
        { headers: this.headers }
      )
      
      console.log('Response status:', response.status)
      console.log('Response keys:', Object.keys(response.data))
      
      return response.data
    } catch (error: any) {
      console.error(`Error calling ${endpoint}:`, error.response?.data || error.message)
      throw new Error(`Failed to call ${endpoint}`)
    }
  }

  // Western Astrology methods
  async getNatalChart(request: NatalChartRequest): Promise<any> {
    return this.post('/api/v1/natal_chart', {
      ...request,
      language: request.language || 'ja',
    })
  }

  async getSolarReturn(request: SolarReturnRequest): Promise<any> {
    return this.post('/api/v1/solar_return', {
      ...request,
      language: request.language || 'ja',
    })
  }

  async getLunarReturn(request: LunarReturnRequest): Promise<any> {
    return this.post('/api/v1/lunar_return', {
      ...request,
      language: request.language || 'ja',
    })
  }

  async getSaturnReturn(request: ReturnRequest): Promise<any> {
    return this.post('/api/v1/saturn_return', {
      ...request,
      language: request.language || 'ja',
    })
  }

  async getJupiterReturn(request: ReturnRequest): Promise<any> {
    return this.post('/api/v1/jupiter_return', {
      ...request,
      language: request.language || 'ja',
    })
  }

  async getTransits(request: TransitRequest): Promise<any> {
    return this.post('/api/v1/transits', {
      ...request,
      language: request.language || 'ja',
    })
  }

  async getSynastry(request: SynastryRequest): Promise<any> {
    return this.post('/api/v1/synastry', {
      ...request,
      language: request.language || 'ja',
    })
  }

  async getTripleSynastry(request: TripleSynastryRequest): Promise<any> {
    return this.post('/api/v1/triple_synastry', {
      ...request,
      language: request.language || 'ja',
    })
  }

  async getComposite(request: SynastryRequest): Promise<any> {
    return this.post('/api/v1/composite', {
      ...request,
      language: request.language || 'ja',
    })
  }

  async getProgressions(request: ProgressionRequest): Promise<any> {
    return this.post('/api/v1/progressions', {
      ...request,
      language: request.language || 'ja',
    })
  }

  async getElection(request: ElectionRequest): Promise<any> {
    return this.post('/api/v1/election', {
      ...request,
      language: request.language || 'ja',
    })
  }

  async getHoroscope(request: HoroscopeRequest): Promise<any> {
    return this.post('/api/v1/horoscope', {
      ...request,
      language: request.language || 'ja',
    })
  }

  // YaoSenjutsu Hybrid methods
  async getYaoNatal(request: YaoNatalRequest): Promise<any> {
    return this.post('/api/v1/yaonatal', {
      ...request,
      language: request.language || 'ja',
    })
  }

  async getYaoSynastry(request: YaoSynastryRequest): Promise<any> {
    return this.post('/api/v1/yaosynastry', {
      ...request,
      language: request.language || 'ja',
    })
  }

  async getYaoTransits(request: YaoTransitsRequest): Promise<any> {
    return this.post('/api/v1/yaotransits', {
      ...request,
      language: request.language || 'ja',
    })
  }

  // Eastern Astrology methods
  async getSukuyo(request: SukuyoRequest): Promise<any> {
    return this.post('/api/v1/sukuyo', {
      ...request,
    })
  }

  async getSanku(request: SankuRequest): Promise<any> {
    return this.post('/api/v1/sanku', {
      ...request,
    })
  }

  async getDailySanku(request: DailySankuRequest): Promise<any> {
    return this.post('/api/v1/dailysanku', {
      ...request,
    })
  }

  async getSankuSearch(request: SankuSearchRequest): Promise<any> {
    return this.post('/api/v1/sankusearch', {
      ...request,
    })
  }

  // Helper functions
  formatDateTime(date: string, time?: string): string {
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const timeStr = time || '12:00:00'
      return `${date}T${timeStr}+09:00`
    }
    return date
  }
}

export const yaoSenjutsuRealAPI = new YaoSenjutsuRealAPI()