import { NextRequest, NextResponse } from 'next/server'

// モックデータジェネレータ
function generateMockNatalChart(dob: string, lat: number, lon: number) {
  return {
    planets: {
      sun: { sign: '牡羊座', degree: 15.5, house: 10 },
      moon: { sign: '蟹座', degree: 22.3, house: 1 },
      mercury: { sign: '双子座', degree: 8.7, house: 11 },
      venus: { sign: '牡牛座', degree: 28.1, house: 11 },
      mars: { sign: '獅子座', degree: 12.4, house: 2 },
      jupiter: { sign: '射手座', degree: 5.9, house: 5 },
      saturn: { sign: '山羊座', degree: 18.2, house: 6 },
    },
    houses: {
      1: '蟹座', 2: '獅子座', 3: '乙女座', 4: '天秤座',
      5: '蠍座', 6: '射手座', 7: '山羊座', 8: '水瓶座',
      9: '魚座', 10: '牡羊座', 11: '牡牛座', 12: '双子座',
    },
    aspects: [
      { planet1: 'sun', planet2: 'moon', aspect: 'square', degree: 90 },
      { planet1: 'sun', planet2: 'jupiter', aspect: 'trine', degree: 120 },
      { planet1: 'moon', planet2: 'venus', aspect: 'sextile', degree: 60 },
    ],
    interpretation: `あなたは牡羊座の太陽を持ち、リーダーシップと独立心が強い性格です。
      蟹座の月は感情的な安定と家族への愛情を示しています。
      第10ハウスの太陽は、キャリアと社会的地位への強い願望を表しています。
      木星とのトラインは幸運と成長の機会をもたらします。`,
  }
}

function generateMockTransitChart(dob: string, lat: number, lon: number, targetDate?: string) {
  const date = targetDate || new Date().toISOString().split('T')[0]
  return {
    ...generateMockNatalChart(dob, lat, lon),
    transits: {
      jupiter: { sign: '牡牛座', degree: 10.5, house: 11 },
      saturn: { sign: '魚座', degree: 7.2, house: 9 },
      uranus: { sign: '牡牛座', degree: 23.1, house: 11 },
    },
    interpretation: `現在、木星があなたの第11ハウスを通過しており、
      友人関係や長期的な目標に関して幸運な時期です。
      土星は第9ハウスにあり、精神的な成長と学習の時期を示しています。
      ${date.includes('2025') ? '2025年は特に成長と発展の年になるでしょう。' : ''}`,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dob, lat, lon, targetDate } = body
    
    // エンドポイントの判定
    const url = new URL(request.url)
    const isTransit = url.pathname.includes('transit')
    
    // レスポンスの生成
    const response = isTransit
      ? generateMockTransitChart(dob, lat, lon, targetDate)
      : generateMockNatalChart(dob, lat, lon)
    
    // 少し遅延を入れてAPI呼び出しをシミュレート
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}