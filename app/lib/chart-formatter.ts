/**
 * Chart Formatter for YaoSenjutsu API responses
 * Based on bridge-stdio.js formatters
 * Converts raw API data into readable, structured formats for LLM consumption
 */

export interface ChartData {
  birth_data?: any;
  planets?: any[] | any;
  houses?: any[];
  aspects?: any[];
  modality_element?: any;
  north_node?: any;
  south_node?: any;
  patterns?: any[];
  [key: string]: any;
}

/**
 * Format natal chart data into readable Japanese format
 */
export function formatNatalChart(data: ChartData): string {
  const lines: string[] = [];
  
  const birthData = data.birth_data || {};
  lines.push(`${birthData.name || ''}さんのネイタルチャート`);
  lines.push(`生年月日時: ${birthData.datetime || ''}`);
  lines.push(`出生地: ${birthData.location || `${birthData.latitude?.toFixed(4)}, ${birthData.longitude?.toFixed(4)}`}\n`);
  
  lines.push('主要10天体:');
  if (data.planets) {
    const planetNames: Record<string, string> = {
      sun: '太陽', moon: '月', mercury: '水星', venus: '金星',
      mars: '火星', jupiter: '木星', saturn: '土星',
      uranus: '天王星', neptune: '海王星', pluto: '冥王星'
    };
    
    // Handle both array and object formats
    let planetsObj: Record<string, any> = {};
    if (Array.isArray(data.planets)) {
      data.planets.forEach(p => {
        const key = p.name?.toLowerCase() || p.name;
        planetsObj[key] = p;
      });
    } else {
      planetsObj = data.planets;
    }
    
    Object.entries(planetNames).forEach(([key, name]) => {
      const p = planetsObj[key];
      if (p) {
        const retro = (p.is_retrograde || p.retrograde) ? '(R)' : '';
        const degree = p.degree !== undefined ? p.degree : (p.longitude % 30);
        lines.push(` ${name}: ${p.sign}${degree.toFixed(1)}/${p.house}H${retro}`);
      }
    });
    
    
    // Add Dragon nodes
    if (data.north_node) {
      const nn = data.north_node;
      const degree = nn.longitude % 30;
      lines.push(` ドラゴンヘッド: ${nn.sign}${degree.toFixed(1)}/${nn.house}H`);
    }
    if (data.south_node) {
      const sn = data.south_node;
      const degree = sn.longitude % 30;
      lines.push(` ドラゴンテイル: ${sn.sign}${degree.toFixed(1)}/${sn.house}H`);
    }
  }
  
  // Angles (ASC, IC, DSC, MC)
  if (data.houses && data.houses.length >= 10) {
    lines.push('\nアングル:');
    const asc = data.houses[0];
    const ic = data.houses[3];
    const dsc = data.houses[6];
    const mc = data.houses[9];
    
    if (asc) lines.push(` ASC: ${asc.sign}${(asc.longitude % 30).toFixed(1)}`);
    if (ic) lines.push(` IC: ${ic.sign}${(ic.longitude % 30).toFixed(1)}`);
    if (dsc) lines.push(` DSC: ${dsc.sign}${(dsc.longitude % 30).toFixed(1)}`);
    if (mc) lines.push(` MC: ${mc.sign}${(mc.longitude % 30).toFixed(1)}`);
  }
  
  // House cusps
  if (data.houses && data.houses.length > 0) {
    lines.push('\nハウスカスプ:');
    data.houses.forEach(h => {
      const degree = (h.longitude % 30).toFixed(1);
      lines.push(` ${h.house}H: ${h.sign}${degree}`);
    });
  }
  
  // Elements and modalities
  if (data.modality_element) {
    const me = data.modality_element;
    if (me.elements) {
      const fire = me.elements.fire || me.elements['火'] || 0;
      const earth = me.elements.earth || me.elements['地'] || 0;
      const air = me.elements.air || me.elements['風'] || 0;
      const water = me.elements.water || me.elements['水'] || 0;
      lines.push('\nエレメント:');
      lines.push(` 火: ${fire.toFixed(1)}% 地: ${earth.toFixed(1)}% 風: ${air.toFixed(1)}% 水: ${water.toFixed(1)}%`);
    }
    if (me.modalities) {
      const cardinal = me.modalities.cardinal || me.modalities['活動宮'] || 0;
      const fixed = me.modalities.fixed || me.modalities['不動宮'] || 0;
      const mutable = me.modalities.mutable || me.modalities['柔軟宮'] || 0;
      lines.push('モダリティ:');
      lines.push(` 活動: ${cardinal.toFixed(1)}% 不動: ${fixed.toFixed(1)}% 柔軟: ${mutable.toFixed(1)}%`);
    }
  }
  
  // Major aspects (exclude obvious node opposition)
  if (data.aspects && data.aspects.length > 0) {
    lines.push('\nアスペクト:');
    const aspectTranslations: Record<string, string> = {
      'north_node': 'ドラゴンヘッド',
      'south_node': 'ドラゴンテイル',
      'sun': '太陽', 'moon': '月', 'mercury': '水星', 'venus': '金星',
      'mars': '火星', 'jupiter': '木星', 'saturn': '土星',
      'uranus': '天王星', 'neptune': '海王星', 'pluto': '冥王星',
      '太陽': '太陽', '月': '月', '水星': '水星', '金星': '金星',
      '火星': '火星', '木星': '木星', '土星': '土星',
      '天王星': '天王星', '海王星': '海王星', '冥王星': '冥王星'
    };
    
    // Sort aspects by score/importance
    const sortedAspects = [...data.aspects].sort((a, b) => (b.score || 0) - (a.score || 0));
    
    sortedAspects.slice(0, 10).forEach(a => {
      const planet1 = a.planet1 || a.body1 || 'unknown';
      const planet2 = a.planet2 || a.body2 || 'unknown';
      
      // Skip obvious north_node-south_node opposition
      if ((planet1 === 'north_node' && planet2 === 'south_node') ||
          (planet1 === 'south_node' && planet2 === 'north_node')) {
        return;
      }
      
      const p1Name = aspectTranslations[planet1] || planet1;
      const p2Name = aspectTranslations[planet2] || planet2;
      const aspectName = a.aspect_name || a.type || 'unknown';
      const orb = a.orb !== undefined ? a.orb.toFixed(1) : '0.0';
      lines.push(` ${p1Name}-${aspectName}-${p2Name} (${orb}°)`);
    });
  }
  
  // Patterns - removed to save tokens (can be added back if needed)
  
  return lines.join('\n');
}

/**
 * Format transit data
 */
export function formatTransits(data: ChartData): string {
  const lines: string[] = []
  
  lines.push('現在のトランジット:')
  
  if (data.transits && Array.isArray(data.transits)) {
    const importantTransits = data.transits
      .filter(t => t.orb <= 3) // Only close orbs
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 15) // Limit to save tokens
    
    importantTransits.forEach(t => {
      const transitPlanet = t.transit_planet || t.planet1 || 'unknown'
      const natalPlanet = t.natal_planet || t.planet2 || 'unknown'
      const aspect = t.aspect || t.type || 'unknown'
      const orb = t.orb?.toFixed(1) || '0.0'
      lines.push(` T${transitPlanet}-${aspect}-N${natalPlanet} (${orb}°)`)
    })
  }
  
  if (data.current_positions) {
    lines.push('\n現在の天体位置:')
    Object.entries(data.current_positions).forEach(([planet, pos]: [string, any]) => {
      const retro = pos.retrograde ? '(R)' : ''
      lines.push(` ${planet}: ${pos.sign}${(pos.longitude % 30).toFixed(1)}${retro}`)
    })
  }
  
  return lines.join('\n')
}

/**
 * Format synastry (相性) data
 */
export function formatSynastry(data: ChartData): string {
  const lines: string[] = []
  
  const person1 = data.person1_data || data.person1 || {}
  const person2 = data.person2_data || data.person2 || {}
  
  lines.push(`${person1.name || 'Person1'} × ${person2.name || 'Person2'} の相性\n`)
  
  if (data.compatibility_score !== undefined) {
    lines.push(`相性スコア: ${data.compatibility_score}/100\n`)
  }
  
  if (data.aspects && Array.isArray(data.aspects)) {
    lines.push('主要アスペクト:')
    const importantAspects = data.aspects
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 12)
    
    importantAspects.forEach(a => {
      const p1 = a.person1_planet || a.planet1 || 'unknown'
      const p2 = a.person2_planet || a.planet2 || 'unknown'
      const aspect = a.aspect || a.type || 'unknown'
      const orb = a.orb?.toFixed(1) || '0.0'
      lines.push(` P1${p1}-${aspect}-P2${p2} (${orb}°)`)
    })
  }
  
  return lines.join('\n')
}

/**
 * Format Solar/Lunar/Saturn/Jupiter Return charts
 */
export function formatReturnChart(data: ChartData, returnType: string): string {
  const lines: string[] = []
  
  lines.push(`${returnType}リターンチャート`)
  if (data.return_date) {
    lines.push(`リターン日時: ${data.return_date}\n`)
  }
  
  // Use natal chart formatter for the main chart data
  const chartLines = formatNatalChart(data).split('\n')
  // Skip the header lines from natal format
  lines.push(...chartLines.slice(3))
  
  return lines.join('\n')
}

/**
 * Format Progressions data
 */
export function formatProgressions(data: ChartData): string {
  const lines: string[] = []
  
  const progType = data.progression_type === 'solar_arc' ? 'ソーラーアーク' : 'セカンダリー'
  lines.push(`${progType}プログレッション`)
  lines.push(`進行日: ${data.target_date || ''}\n`)
  
  if (data.progressed_planets) {
    lines.push('進行天体:')
    Object.entries(data.progressed_planets).forEach(([planet, pos]: [string, any]) => {
      const retro = pos.retrograde ? '(R)' : ''
      lines.push(` P${planet}: ${pos.sign}${(pos.longitude % 30).toFixed(1)}/${pos.house}H${retro}`)
    })
  }
  
  if (data.progressed_aspects) {
    lines.push('\n進行アスペクト:')
    data.progressed_aspects.slice(0, 10).forEach((a: any) => {
      lines.push(` P${a.planet1}-${a.aspect}-N${a.planet2} (${a.orb.toFixed(1)}°)`)
    })
  }
  
  return lines.join('\n')
}

/**
 * Format Horoscope data
 */
export function formatHoroscope(data: any): string {
  const lines: string[] = []
  
  lines.push('今日の星占い')
  if (data.date) {
    lines.push(`日付: ${data.date}\n`)
  }
  
  if (data.signs) {
    Object.entries(data.signs).forEach(([sign, info]: [string, any]) => {
      lines.push(`${sign}:`)
      if (info.overall) lines.push(`  総合運: ${info.overall}/5`)
      if (info.love) lines.push(`  恋愛運: ${info.love}/5`)
      if (info.work) lines.push(`  仕事運: ${info.work}/5`)
      if (info.money) lines.push(`  金運: ${info.money}/5`)
      if (info.message) lines.push(`  メッセージ: ${info.message}`)
    })
  }
  
  return lines.join('\n')
}

/**
 * Format YaoNatal (東西占星術ハイブリッド) data
 */
export function formatYaoNatal(data: any): string {
  const lines: string[] = []
  
  lines.push('東西占星術ハイブリッド分析\n')
  
  // Basic info
  if (data.sun_sign || data.moon_sign || data.rising_sign) {
    lines.push('【基本情報】')
    if (data.sun_sign) lines.push(`太陽星座: ${data.sun_sign}`)
    if (data.moon_sign) lines.push(`月星座: ${data.moon_sign}`)
    if (data.rising_sign) lines.push(`アセンダント: ${data.rising_sign}`)
    lines.push('')
  }
  
  // Western astrology details
  if (data.western_astrology) {
    lines.push('【西洋占星術】')
    // Format as natal chart using the western_astrology data
    const westernLines = formatNatalChart(data.western_astrology).split('\n')
    lines.push(...westernLines.slice(3)) // Skip headers
  } else if (data.western) {
    lines.push('【西洋占星術】')
    const westernLines = formatNatalChart(data.western).split('\n')
    lines.push(...westernLines.slice(3)) // Skip headers
  }
  
  // Eastern part
  if (data.honmei_shuku) {
    lines.push('\n【東洋占星術（宿曜）】')
    if (typeof data.honmei_shuku === 'object' && data.honmei_shuku.name) {
      lines.push(`本命宿: ${data.honmei_shuku.name}`)
      if (data.honmei_shuku.group) lines.push(`  グループ: ${data.honmei_shuku.group}`)
    } else if (typeof data.honmei_shuku === 'string') {
      lines.push(`本命宿: ${data.honmei_shuku}`)
    }
  } else if (data.eastern) {
    lines.push('\n【東洋占星術】')
    if (data.eastern.sukuyo) {
      lines.push(`本命宿: ${data.eastern.sukuyo.name}`)
      if (data.eastern.sukuyo.group) lines.push(`  グループ: ${data.eastern.sukuyo.group}`)
    }
  }
  
  // Lunar calendar info
  if (data.lunar_calendar) {
    lines.push('\n【旧暦情報】')
    if (data.lunar_calendar.lunar_date) {
      lines.push(`旧暦: ${data.lunar_calendar.lunar_date}`)
    }
    if (data.lunar_calendar.rokuyou) {
      lines.push(`六曜: ${data.lunar_calendar.rokuyou}`)
    }
  }
  
  // Synthesis
  if (data.synthesis) {
    lines.push('\n【総合分析】')
    lines.push(data.synthesis)
  }
  
  return lines.join('\n')
}

/**
 * Format YaoSynastry (東西相性診断) data
 */
export function formatYaoSynastry(data: any): string {
  const lines: string[] = []
  
  lines.push('東西相性診断ハイブリッド分析\n')
  
  if (data.western_synastry) {
    lines.push('【西洋占星術相性】')
    const synastryLines = formatSynastry(data.western_synastry).split('\n')
    lines.push(...synastryLines)
  }
  
  if (data.eastern_compatibility) {
    lines.push('\n【東洋占星術相性】')
    if (data.eastern_compatibility.sanku) {
      lines.push(`三九の秘法: ${data.eastern_compatibility.sanku.relationship}`)
      if (data.eastern_compatibility.sanku.score) {
        lines.push(`  相性スコア: ${data.eastern_compatibility.sanku.score}/100`)
      }
    }
  }
  
  return lines.join('\n')
}

/**
 * Format Sukuyo (宿曜) data
 */
export function formatSukuyo(data: any): string {
  const lines: string[] = []
  
  lines.push('宿曜占星術')
  
  if (data.honmei_suku) {
    lines.push(`\n本命宿: ${data.honmei_suku}`)
  }
  
  if (data.details) {
    if (data.details.group) lines.push(`グループ: ${data.details.group}`)
    if (data.details.element) lines.push(`五行: ${data.details.element}`)
    if (data.details.character) lines.push(`\n性格: ${data.details.character}`)
  }
  
  return lines.join('\n')
}

/**
 * Format Sanku (三九の秘法) data
 */
export function formatSanku(data: any): string {
  const lines: string[] = []
  
  lines.push('三九の秘法相性診断\n')
  
  if (data.person1_suku && data.person2_suku) {
    lines.push(`${data.person1_name || 'Person1'}: ${data.person1_suku}`)
    lines.push(`${data.person2_name || 'Person2'}: ${data.person2_suku}\n`)
  }
  
  if (data.relationship) {
    lines.push(`関係性: ${data.relationship}`)
  }
  
  if (data.compatibility_score !== undefined) {
    lines.push(`相性スコア: ${data.compatibility_score}/100`)
  }
  
  if (data.details) {
    lines.push(`\n詳細: ${data.details}`)
  }
  
  return lines.join('\n')
}

/**
 * Format DailySanku (日運) data
 */
export function formatDailySanku(data: any): string {
  const lines: string[] = []
  
  lines.push('三九の秘法 日運診断\n')
  
  if (data.target_date) {
    lines.push(`対象日: ${data.target_date}`)
  }
  
  if (data.day_suku) {
    lines.push(`日の宿: ${data.day_suku}`)
  }
  
  if (data.relationship) {
    lines.push(`\n本命宿との関係: ${data.relationship}`)
  }
  
  if (data.fortune) {
    lines.push(`運勢: ${data.fortune}`)
  }
  
  if (data.advice) {
    lines.push(`\nアドバイス: ${data.advice}`)
  }
  
  return lines.join('\n')
}

/**
 * Format data into a compact, structured format for LLM
 */
export function formatChartForLLM(data: ChartData): string {
  // Determine chart type and use appropriate formatter
  const chartType = data.chart_type || data.type || ''
  
  switch (chartType.toLowerCase()) {
    case 'natal':
    case 'natal_chart':
      return formatNatalChart(data)
    
    case 'transit':
    case 'transits':
      return formatTransits(data)
    
    case 'synastry':
      return formatSynastry(data)
    
    case 'solar_return':
      return formatReturnChart(data, 'ソーラー')
    
    case 'lunar_return':
      return formatReturnChart(data, 'ルナー')
    
    case 'saturn_return':
      return formatReturnChart(data, 'サターン')
    
    case 'jupiter_return':
      return formatReturnChart(data, 'ジュピター')
    
    case 'progressions':
    case 'progression':
      return formatProgressions(data)
    
    case 'composite':
      return formatNatalChart(data) // Composite uses natal format
    
    case 'horoscope':
      return formatHoroscope(data)
    
    case 'yaonatal':
      return formatYaoNatal(data)
    
    case 'yaosynastry':
      return formatYaoSynastry(data)
    
    case 'yaotransits':
      // YaoTransits is similar to regular transits with hybrid analysis
      return formatTransits(data)
    
    case 'sukuyo':
      return formatSukuyo(data)
    
    case 'sanku':
      return formatSanku(data)
    
    case 'dailysanku':
    case 'daily_sanku':
      return formatDailySanku(data)
    
    default:
      // If we have planets data, assume it's some form of chart
      if (data.planets) {
        return formatNatalChart(data)
      }
      // Otherwise return a generic format
      return JSON.stringify(data, null, 2)
  }
}

/**
 * Create a summary specifically optimized for LLM system prompts
 */
export function createChartSummaryForPrompt(data: ChartData): string {
  return formatChartForLLM(data)
}