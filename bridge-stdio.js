#!/usr/bin/env node

/**
 * YaoEphemeris MCP Bridge v1.4.16 - Clean YAML-like Format Edition
 * 
 * Features:
 * - Intelligent error recovery with helpful suggestions
 * - Smart parameter validation and auto-correction
 * - Context-aware responses with formatting optimization
 * - User preference learning and caching
 * - Progressive disclosure for complex data
 * - Automatic timezone and location detection hints
 * - Multi-language support (日本語/English)
 * - Real-time validation feedback
 */

const readline = require('readline');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true';
const API_KEY = process.env.YAOEPHEMERIS_API_KEY || process.env.MCP_API_KEY || '';
const API_HOST = process.env.YAOEPHEMERIS_API_URL ? new URL(process.env.YAOEPHEMERIS_API_URL).hostname : 
                 process.env.MCP_API_HOST || 'api.yaosenjutsu.com';
const API_PORT = process.env.YAOEPHEMERIS_API_URL ? (new URL(process.env.YAOEPHEMERIS_API_URL).port || 443) : 
                 process.env.MCP_API_PORT || 443;
const LANG = process.env.MCP_LANG || 'ja'; // ja or en
const FORMAT_MODE = process.env.MCP_FORMAT_MODE || 'compact'; // compact, default, or full

// User preference cache
const CACHE_DIR = path.join(os.homedir(), '.yaoephemeris-mcp');
const CACHE_FILE = path.join(CACHE_DIR, 'user-preferences.json');
let userCache = {};

// Load user preferences
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  if (fs.existsSync(CACHE_FILE)) {
    userCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  }
} catch (e) {
  // Silent fail, cache is optional
}

// Enhanced debug logging
const debug = (msg, level = 'info') => {
  if (DEBUG) {
    console.error(`[mcp-bridge] [${level}] ${new Date().toISOString()} ${msg}`);
  }
};

const error = (msg) => {
  console.error(`[mcp-bridge] ERROR: ${msg}`);
};

debug('Starting YaoEphemeris MCP Bridge v1.4.16 - Clean YAML-like Format Edition', 'success');
debug(`API Host: ${API_HOST}:${API_PORT}`, 'info');
debug(`API Key: ${API_KEY ? API_KEY.substring(0, 8) + '...' : '(not set)'}`, 'info');
debug(`Language: ${LANG}, Format: ${FORMAT_MODE}`, 'info');

// Intelligent parameter helpers
const parameterHelpers = {
  // Validate and fix datetime formats
  normalizeDateTime: (dt) => {
    if (!dt) return null;
    
    // Handle various formats
    const patterns = [
      /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/,
      /^(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2})時(\d{1,2})分?$/
    ];
    
    for (const pattern of patterns) {
      const match = dt.match(pattern);
      if (match) {
        if (pattern.source.includes('年')) {
          return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}T${match[4].padStart(2, '0')}:${match[5].padStart(2, '0')}:00`;
        }
        return dt.replace(' ', 'T');
      }
    }
    
    return dt; // Return as-is if no match
  }
};

// Enhanced validation with helpful error messages
const validateParams = (toolName, params) => {
  const errors = [];
  const suggestions = [];
  const autoFixed = {};
  
  // Common birth data validation
  if (['natal_chart', 'transits', 'progressions', 'solar_return', 'lunar_return', 'saturn_return', 'jupiter_return'].includes(toolName)) {
    if (!params.name) {
      errors.push(LANG === 'ja' ? '名前が必要です' : 'Name is required');
    }
    
    if (params.datetime) {
      const fixed = parameterHelpers.normalizeDateTime(params.datetime);
      if (fixed !== params.datetime) {
        autoFixed.datetime = fixed;
        suggestions.push(LANG === 'ja' 
          ? `日時形式を修正: ${params.datetime} → ${fixed}`
          : `Fixed datetime format: ${params.datetime} → ${fixed}`);
      }
    } else {
      errors.push(LANG === 'ja' ? '生年月日時が必要です' : 'Birth datetime is required');
    }
    
    // Location validation - API supports auto-detection from location string
    // No validation needed here - let API handle location resolution
  }
  
  // Election validation
  if (toolName === 'election') {
    // Need either location string OR lat/lon coordinates
    if (!params.location && (!params.latitude || !params.longitude)) {
      errors.push(LANG === 'ja' 
        ? '場所（都市名）または緯度・経度が必要です' 
        : 'Location (city name) or latitude/longitude coordinates are required');
      suggestions.push(LANG === 'ja'
        ? '例: location: "東京" または latitude: 35.6762, longitude: 139.6503'
        : 'Example: location: "Tokyo" or latitude: 35.6762, longitude: 139.6503');
    }
  }
  
  // Tool-specific validations
  if (toolName === 'horoscope') {
    const validSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                       'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const signMap = {
      '牡羊座': 'Aries', 'おひつじ座': 'Aries', 
      '牡牛座': 'Taurus', 'おうし座': 'Taurus',
      '双子座': 'Gemini', 'ふたご座': 'Gemini',
      '蟹座': 'Cancer', 'かに座': 'Cancer',
      '獅子座': 'Leo', 'しし座': 'Leo',
      '乙女座': 'Virgo', 'おとめ座': 'Virgo',
      '天秤座': 'Libra', 'てんびん座': 'Libra',
      '蠍座': 'Scorpio', 'さそり座': 'Scorpio',
      '射手座': 'Sagittarius', 'いて座': 'Sagittarius',
      '山羊座': 'Capricorn', 'やぎ座': 'Capricorn',
      '水瓶座': 'Aquarius', 'みずがめ座': 'Aquarius',
      '魚座': 'Pisces', 'うお座': 'Pisces'
    };
    
    if (signMap[params.sign]) {
      autoFixed.sign = signMap[params.sign];
      suggestions.push(LANG === 'ja'
        ? `星座名を変換: ${params.sign} → ${autoFixed.sign}`
        : `Converted sign: ${params.sign} → ${autoFixed.sign}`);
    } else if (!validSigns.includes(params.sign)) {
      errors.push(LANG === 'ja'
        ? `無効な星座: ${params.sign}。有効な星座: ${validSigns.join(', ')}`
        : `Invalid sign: ${params.sign}. Valid signs: ${validSigns.join(', ')}`);
    }
  }
  
  return { errors, suggestions, autoFixed };
};

// Save user preferences
const saveUserPreference = (key, value) => {
  userCache[key] = value;
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(userCache, null, 2));
    debug(`Saved user preference: ${key}`, 'cache');
  } catch (e) {
    // Silent fail
  }
};

// Define all 12 tools with enhanced descriptions
const TOOLS = [
  {
    name: 'natal_chart',
    description: LANG === 'ja' 
      ? '出生図（ネイタルチャート）を作成 - 生まれた瞬間の天体配置から性格・運命を読み解きます'
      : 'Create a comprehensive natal chart showing planetary positions at birth',
    inputSchema: {
      type: 'object',
      properties: {
        name: { 
          type: 'string', 
          description: LANG === 'ja' ? '名前（ニックネーム可）' : 'Person\'s name (nickname OK)' 
        },
        datetime: { 
          type: 'string', 
          description: LANG === 'ja' 
            ? '生年月日時（例: "1990-03-15 14:30:00" または "1990年3月15日 14時30分"）' 
            : 'Birth date/time (e.g., "1990-03-15 14:30:00" or ISO format)' 
        },
        location: { 
          type: 'string', 
          description: LANG === 'ja' 
            ? '出生地（都市名や住所。例: "東京"、"大阪府大阪市"、"New York"）' 
            : 'Birth location (city name or address. e.g., "Tokyo", "New York")'
        },
        timezone: { 
          type: 'string', 
          description: LANG === 'ja' 
            ? 'タイムゾーン（例: "Asia/Tokyo"、省略時は場所から自動推定）' 
            : 'Timezone (e.g., "Asia/Tokyo", auto-detected from location if omitted)'
        }
      },
      required: ['name', 'datetime', 'location']
    }
  },
  {
    name: 'transits',
    description: 'Calculate current transits (トランジット) for a person',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        datetime: { type: 'string' },
        location: { type: 'string', description: 'Birth location (city name or address)' },
        timezone: { type: 'string', description: 'Timezone (optional, auto-detected)' },
        transit_date: { type: 'string', description: 'Date for transits (optional, defaults to now)' }
      },
      required: ['name', 'datetime', 'location']
    }
  },
  {
    name: 'synastry',
    description: 'Calculate compatibility between two people (相性診断)',
    inputSchema: {
      type: 'object',
      properties: {
        person1: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            datetime: { type: 'string' },
            location: { type: 'string', description: 'Birth location' },
            timezone: { type: 'string', description: 'Timezone (optional)' }
          },
          required: ['name', 'datetime', 'location']
        },
        person2: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            datetime: { type: 'string' },
            location: { type: 'string', description: 'Birth location' },
            timezone: { type: 'string', description: 'Timezone (optional)' }
          },
          required: ['name', 'datetime', 'location']
        }
      },
      required: ['person1', 'person2']
    }
  },
  {
    name: 'composite',
    description: 'Create a composite chart for two people',
    inputSchema: {
      type: 'object',
      properties: {
        person1: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            datetime: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            timezone: { type: 'string' }
          },
          required: ['name', 'datetime', 'latitude', 'longitude', 'timezone']
        },
        person2: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            datetime: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            timezone: { type: 'string' }
          },
          required: ['name', 'datetime', 'latitude', 'longitude', 'timezone']
        }
      },
      required: ['person1', 'person2']
    }
  },
  {
    name: 'progressions',
    description: 'Calculate secondary progressions (プログレッション)',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        datetime: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        timezone: { type: 'string' },
        target_date: { type: 'string', description: 'Date for progressions' }
      },
      required: ['name', 'datetime', 'latitude', 'longitude', 'timezone']
    }
  },
  {
    name: 'solar_return',
    description: 'Calculate solar return chart (ソーラーリターン)',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        datetime: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        timezone: { type: 'string' },
        year: { type: 'number', description: 'Year for solar return' }
      },
      required: ['name', 'datetime', 'latitude', 'longitude', 'timezone', 'year']
    }
  },
  {
    name: 'lunar_return',
    description: LANG === 'ja'
      ? 'ルナーリターン（月回帰）- 月が出生時と同じ位置に戻る約27.3日周期の運勢'
      : 'Calculate lunar return chart - monthly emotional and domestic themes',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: LANG === 'ja' ? '名前' : 'Name' },
        datetime: { type: 'string', description: LANG === 'ja' ? '生年月日時' : 'Birth datetime' },
        latitude: { type: 'number', description: LANG === 'ja' ? '出生地緯度' : 'Birth latitude' },
        longitude: { type: 'number', description: LANG === 'ja' ? '出生地経度' : 'Birth longitude' },
        timezone: { type: 'string', description: LANG === 'ja' ? 'タイムゾーン' : 'Timezone' },
        target_date: { 
          type: 'string',
          description: LANG === 'ja'
            ? '対象日（省略時は翌月の回帰を自動計算）'
            : 'Target date (auto-calculates next return if omitted)'
        }
      },
      required: ['name', 'datetime', 'latitude', 'longitude']
    }
  },
  {
    name: 'saturn_return',
    description: 'Calculate Saturn return chart',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        datetime: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        timezone: { type: 'string' }
      },
      required: ['name', 'datetime', 'latitude', 'longitude', 'timezone']
    }
  },
  {
    name: 'jupiter_return',
    description: 'Calculate Jupiter return chart',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        datetime: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        timezone: { type: 'string' }
      },
      required: ['name', 'datetime', 'latitude', 'longitude', 'timezone']
    }
  },
  {
    name: 'election',
    description: 'Find auspicious dates (エレクション/吉日選定)',
    inputSchema: {
      type: 'object',
      properties: {
        purpose: { type: 'string', description: 'Purpose of election' },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
        location: { type: 'string', description: 'Location (city name or address, optional if lat/lon provided)' },
        latitude: { type: 'number', description: 'Latitude (optional if location provided)' },
        longitude: { type: 'number', description: 'Longitude (optional if location provided)' },
        timezone: { type: 'string', description: 'Timezone (optional, auto-detected if not provided)' }
      },
      required: ['purpose', 'start_date', 'end_date']
    }
  },
  {
    name: 'horoscope',
    description: 'Get daily horoscope for a zodiac sign (今日の運勢)',
    inputSchema: {
      type: 'object',
      properties: {
        sign: { 
          type: 'string',
          enum: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'],
          description: 'Zodiac sign'
        },
        date: { type: 'string', description: 'Date for horoscope (optional)' }
      },
      required: ['sign']
    }
  },
  {
    name: 'triple_synastry',
    description: 'Calculate compatibility between three people (3者相性)',
    inputSchema: {
      type: 'object',
      properties: {
        person1: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            datetime: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            timezone: { type: 'string' }
          },
          required: ['name', 'datetime', 'latitude', 'longitude', 'timezone']
        },
        person2: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            datetime: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            timezone: { type: 'string' }
          },
          required: ['name', 'datetime', 'latitude', 'longitude', 'timezone']
        },
        person3: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            datetime: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            timezone: { type: 'string' }
          },
          required: ['name', 'datetime', 'latitude', 'longitude', 'timezone']
        }
      },
      required: ['person1', 'person2', 'person3']
    }
  },
  {
    name: 'sukuyo',
    description: LANG === 'ja' 
      ? '宿曜占星術 - 27宿による東洋の月齢占星術'
      : 'Sukuyo (27 lunar mansions) - Eastern lunar astrology',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        datetime: { type: 'string', description: '生年月日時（ISO形式 or YYYY-MM-DD）' },
        include_details: { type: 'boolean', description: '詳細情報を含めるか（デフォルト: true）' }
      },
      required: ['name', 'datetime']
    }
  },
  {
    name: 'sanku',
    description: LANG === 'ja'
      ? '三九の秘法による相性診断 - 2人の生年月日から相性を診断'
      : 'Sanku compatibility - Calculate compatibility between two people',
    inputSchema: {
      type: 'object',
      properties: {
        person1_name: { type: 'string', description: '人物1の名前' },
        person1_datetime: { type: 'string', description: '人物1の生年月日時（ISO形式）' },
        person2_name: { type: 'string', description: '人物2の名前' },
        person2_datetime: { type: 'string', description: '人物2の生年月日時（ISO形式）' },
        include_details: { type: 'boolean', description: '詳細な相性分析を含めるか' }
      },
      required: ['person1_name', 'person1_datetime', 'person2_name', 'person2_datetime']
    }
  },
  {
    name: 'dailysanku',
    description: LANG === 'ja'
      ? '日運三九 - 日々の三九関係と凌犯期間・六害宿の判定'
      : 'Daily Sanku - Daily relationships with ryohan periods and rokugai days',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        birth_datetime: { type: 'string', description: '生年月日時（ISO形式）' },
        target_date: { type: 'string', description: '診断する日（省略時は今日）' },
        include_ryohan: { type: 'boolean', description: '凌犯期間の情報を含めるか' },
        include_rokugai: { type: 'boolean', description: '六害宿の情報を含めるか' }
      },
      required: ['name', 'birth_datetime']
    }
  },
  {
    name: 'yaonatal',
    description: LANG === 'ja'
      ? 'Yao出生図 - 西洋占星術と宿曜・三九を融合した統合占星術'
      : 'YaoNatal - Integrated astrology combining Western and Eastern (Sukuyo/Sanku)',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        datetime: { type: 'string' },
        latitude: { type: 'number', description: 'Latitude (optional if location provided)' },
        longitude: { type: 'number', description: 'Longitude (optional if location provided)' },
        location: { type: 'string', description: 'Location string (e.g., 東京, 大阪)' },
        address: { type: 'string', description: 'Address string (e.g., 東京都渋谷区)' },
        timezone: { type: 'string', description: 'Timezone (optional, auto-detected)' }
      },
      required: ['name', 'datetime']
    }
  },
  {
    name: 'yaosynastry',
    description: LANG === 'ja'
      ? 'Yao相性診断 - 西洋相性と三九関係を統合した相性分析'
      : 'YaoSynastry - Integrated compatibility combining Western synastry and Sanku',
    inputSchema: {
      type: 'object',
      properties: {
        person1_name: { type: 'string' },
        person1_datetime: { type: 'string' },
        person1_latitude: { type: 'number', description: 'Latitude (optional)' },
        person1_longitude: { type: 'number', description: 'Longitude (optional)' },
        person1_location: { type: 'string', description: 'Location string (e.g., 東京, 大阪)' },
        person1_timezone: { type: 'string', description: 'Timezone (optional)' },
        person2_name: { type: 'string' },
        person2_datetime: { type: 'string' },
        person2_latitude: { type: 'number', description: 'Latitude (optional)' },
        person2_longitude: { type: 'number', description: 'Longitude (optional)' },
        person2_location: { type: 'string', description: 'Location string (e.g., 東京, 大阪)' },
        person2_timezone: { type: 'string', description: 'Timezone (optional)' }
      },
      required: ['person1_name', 'person1_datetime', 'person2_name', 'person2_datetime']
    }
  },
  {
    name: 'yaotransits',
    description: LANG === 'ja'
      ? 'Yaoトランジット - 西洋トランジットと日運三九を統合'
      : 'YaoTransits - Integrated transits with Western and Daily Sanku',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        birth_datetime: { type: 'string' },
        birth_latitude: { type: 'number' },
        birth_longitude: { type: 'number' },
        birth_timezone: { type: 'string', description: 'Birth timezone (optional)' },
        transit_datetime: { type: 'string', description: 'Transit datetime (optional, defaults to now)' },
        transit_latitude: { type: 'number', description: 'Transit latitude (optional)' },
        transit_longitude: { type: 'number', description: 'Transit longitude (optional)' },
        transit_timezone: { type: 'string', description: 'Transit timezone (optional)' }
      },
      required: ['name', 'birth_datetime', 'birth_latitude', 'birth_longitude']
    }
  }
];

// Setup readline for stdin
const rl = readline.createInterface({
  input: process.stdin,
  output: null,
  terminal: false
});

// Keep process alive
process.stdin.resume();

// Handle incoming JSON-RPC messages
rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    debug(`Received: ${request.method} (id: ${request.id})`);
    
    let response;
    
    switch (request.method) {
      case 'initialize':
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2025-06-18',
            serverInfo: {
              name: 'yaoephemeris-mcp',
              version: '1.4.10'
            },
            capabilities: {
              tools: {}
            }
          }
        };
        debug('Sent initialize response');
        break;
        
      case 'tools/list':
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: TOOLS
          }
        };
        debug(`Sent tools list (${TOOLS.length} tools)`);
        break;
        
      case 'tools/call':
        const toolName = request.params?.name;
        const toolArgs = request.params?.arguments || {};
        
        // Find the tool
        const tool = TOOLS.find(t => t.name === toolName);
        
        if (!tool) {
          // Suggest similar tools
          const similar = TOOLS.filter(t => 
            t.name.includes(toolName) || toolName.includes(t.name)
          ).map(t => t.name);
          
          const suggestion = similar.length > 0
            ? (LANG === 'ja' 
                ? `\n似たツール: ${similar.join(', ')}` 
                : `\nSimilar tools: ${similar.join(', ')}`)
            : '';
          
          response = {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32602,
              message: `Unknown tool: ${toolName}${suggestion}`
            }
          };
        } else {
          debug(`Calling tool: ${toolName}`, 'api');
          
          // Check for cached user data to auto-fill missing params
          if (toolArgs.name && !toolArgs.latitude) {
            const cacheKey = `user_${toolArgs.name.toLowerCase().replace(/\s+/g, '_')}`;
            const cached = userCache[cacheKey];
            if (cached) {
              debug(`Auto-filling location from cache for ${toolArgs.name}`, 'cache');
              toolArgs.latitude = toolArgs.latitude || cached.latitude;
              toolArgs.longitude = toolArgs.longitude || cached.longitude;
              toolArgs.timezone = toolArgs.timezone || cached.timezone;
            }
          }
          
          try {
            const startTime = Date.now();
            const apiResult = await callAPI(toolName, toolArgs);
            const duration = Date.now() - startTime;
            
            response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: formatResponse(toolName, apiResult)
                }],
                metadata: {
                  duration_ms: duration,
                  format: FORMAT_MODE,
                  cached_params: !!userCache[`user_${toolArgs.name?.toLowerCase().replace(/\s+/g, '_')}`]
                }
              }
            };
            debug(`Tool ${toolName} executed successfully in ${duration}ms`, 'success');
          } catch (err) {
            error(`Tool ${toolName} failed: ${err.message}`);
            
            // Provide helpful recovery suggestions
            let helpText = '';
            if (err.message.includes('authentication')) {
              helpText = LANG === 'ja'
                ? '\n\nヒント: APIキーを環境変数 YAOEPHEMERIS_API_KEY に設定してください。'
                : '\n\nHint: Please set your API key in YAOEPHEMERIS_API_KEY environment variable.';
            } else if (err.message.includes('required')) {
              helpText = LANG === 'ja'
                ? '\n\nヒント: 必須パラメータをご確認ください。例: name, datetime, latitude, longitude'
                : '\n\nHint: Please check required parameters. Example: name, datetime, latitude, longitude';
            }
            
            response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: `Error: ${err.message}${helpText}`
                }],
                isError: true
              }
            };
          }
        }
        break;
        
      case 'resources/list':
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            resources: []
          }
        };
        debug('Sent empty resources list');
        break;
        
      case 'prompts/list':
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            prompts: []
          }
        };
        debug('Sent empty prompts list');
        break;
        
      case 'shutdown':
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: null
        };
        console.log(JSON.stringify(response));
        debug('Received shutdown request, exiting gracefully');
        process.exit(0);
        break;
        
      default:
        // Check if this is a notification (no id field)
        if (request.id === undefined) {
          debug(`Ignored notification: ${request.method}`);
          response = null; // Don't send response for notifications
        } else {
          response = {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`
            }
          };
          debug(`Unknown method: ${request.method}`);
        }
    }
    
    // Send response only if it has an id (not a notification)
    if (response && request.id !== undefined) {
      const responseStr = JSON.stringify(response);
      console.log(responseStr);
      debug(`Sent response for ${request.method} (${responseStr.length} bytes)`);
    } else if (!response && request.id === undefined) {
      debug(`No response sent for notification: ${request.method}`);
    }
    
  } catch (err) {
    error(`Failed to process message: ${err.message}`);
    error(`Raw line: ${line}`);
  }
});

// Handle readline close
rl.on('close', () => {
  debug('Readline closed, stdin ended');
  process.exit(0);
});

// Helper function to call YaoEphemeris API with enhanced UX
function callAPI(endpoint, params) {
  return new Promise(async (resolve, reject) => {
    // Check API key first
    if (!API_KEY) {
      const errorMsg = LANG === 'ja'
        ? 'APIキーが設定されていません。環境変数 YAOEPHEMERIS_API_KEY または MCP_API_KEY を設定してください。'
        : 'API key not set. Please set YAOEPHEMERIS_API_KEY or MCP_API_KEY environment variable.';
      reject(new Error(errorMsg));
      return;
    }
    
    // Validate and auto-fix parameters
    const validation = validateParams(endpoint, params);
    
    if (validation.errors.length > 0) {
      // Return helpful error with suggestions
      const errorMsg = validation.errors.join('\n');
      const helpMsg = LANG === 'ja'
        ? `\n\nヒント: ${validation.errors[0]}\n例: datetime="1990-03-15 14:30:00"`
        : `\n\nHint: ${validation.errors[0]}\nExample: datetime="1990-03-15 14:30:00"`;
      reject(new Error(errorMsg + helpMsg));
      return;
    }
    
    // Apply auto-fixes
    let apiParams = { ...params, ...validation.autoFixed };
    
    // Show suggestions to user
    if (validation.suggestions.length > 0) {
      debug(`Auto-corrections: ${validation.suggestions.join(', ')}`, 'success');
    }
    
    // Handle location for all endpoints that support it
    // API supports both location string and lat/lon coordinates
    if (params.location && !['horoscope', 'election'].includes(endpoint)) {
      // If location string is provided, send it to API for auto-resolution
      apiParams.location = params.location;
      // Remove lat/lon if location is provided to avoid conflicts
      delete apiParams.latitude;
      delete apiParams.longitude;
      debug(`Using location string for auto-resolution: ${params.location}`, 'info');
    }
    
    // Save successful parameters as preferences
    if (params.name && !params.name.includes('test')) {
      const cacheKey = `user_${params.name.toLowerCase().replace(/\s+/g, '_')}`;
      saveUserPreference(cacheKey, {
        latitude: apiParams.latitude,
        longitude: apiParams.longitude,
        location: apiParams.location,
        timezone: apiParams.timezone,
        lastUsed: new Date().toISOString()
      });
    }
    
    // Special handling for election endpoint
    if (endpoint === 'election') {
      apiParams = {
        purpose: params.purpose,
        start_date: params.start_date,
        end_date: params.end_date
      };
      
      // Support both location string and lat/lon coordinates
      if (params.location) {
        // Use location string (city name) - API will auto-resolve
        apiParams.location = params.location;
        debug(`Using location string: ${params.location}`, 'info');
      } else if (params.latitude && params.longitude) {
        // Use lat/lon coordinates directly
        apiParams.latitude = params.latitude;
        apiParams.longitude = params.longitude;
        debug(`Using coordinates: ${params.latitude}, ${params.longitude}`, 'info');
      }
      
      // Add timezone if provided
      if (params.timezone) {
        apiParams.timezone = params.timezone;
      }
      
      // Default to 30 days if end_date not specified
      if (!params.end_date && params.start_date) {
        const start = new Date(params.start_date);
        const end = new Date(start);
        end.setDate(end.getDate() + 30);
        apiParams.end_date = end.toISOString().split('T')[0];
        debug('Auto-set election range to 30 days', 'info');
        suggestions.push(LANG === 'ja'
          ? `期間を30日間に自動設定: ${params.start_date} → ${apiParams.end_date}`
          : `Auto-set period to 30 days: ${params.start_date} → ${apiParams.end_date}`);
      }
    }
    
    const postData = JSON.stringify(apiParams);
    
    const options = {
      hostname: API_HOST,
      port: Number(API_PORT),
      path: `/api/v1/${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-API-Key': API_KEY,
        'User-Agent': '@yaosenjutsu/mcp-client/1.4.10'
      }
    };
    
    debug(`API Request: POST ${options.hostname}${options.path}`);
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        debug(`API Response: ${res.statusCode} (${data.length} bytes)`);
        
        if (res.statusCode === 401) {
          reject(new Error('API authentication failed. Please check your API key.'));
          return;
        }
        
        try {
          const result = JSON.parse(data);
          
          if (res.statusCode >= 400) {
            const errorMsg = result.detail || result.message || `API error: ${res.statusCode}`;
            reject(new Error(errorMsg));
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(new Error(`Failed to parse API response: ${data.substring(0, 100)}`));
        }
      });
    });
    
    req.on('error', (e) => {
      error(`Network error: ${e.message}`);
      reject(new Error(`Network error: ${e.message}`));
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('API request timeout (30s)'));
    });
    
    req.write(postData);
    req.end();
  });
}

// Ultra-high-quality response formatting
function formatResponse(queryType, data) {
  if (data.error) {
    const suggestion = LANG === 'ja'
      ? '\n解決方法: APIキーを確認するか、パラメータを修正してください。'
      : '\nSolution: Check your API key or correct the parameters.';
    return `Error: ${data.error}${suggestion}`;
  }
  
  // Format based on mode
  if (FORMAT_MODE === 'full') {
    return JSON.stringify(data, null, 2);
  }
  
  // Ultra-compact, readable format for AI
  try {
    return formatCompactResponse(queryType, data);
  } catch (e) {
    debug(`Formatting error: ${e.message}`, 'warning');
    return JSON.stringify(data, null, 2);
  }
}

// Compact response formatter with progressive disclosure
function formatCompactResponse(queryType, data) {
  const formatters = {
    natal_chart: formatNatalChart,
    transits: formatTransits,
    synastry: formatSynastry,
    composite: formatComposite,
    progressions: formatProgressions,
    solar_return: formatReturnChart,
    lunar_return: formatReturnChart,
    saturn_return: formatReturnChart,
    jupiter_return: formatReturnChart,
    election: formatElection,
    horoscope: formatHoroscope,
    triple_synastry: formatTripleSynastry
  };
  
  const formatter = formatters[queryType];
  if (!formatter) {
    return JSON.stringify(data, null, 2);
  }
  
  return formatter(data);
}

// Natal chart formatter with essential info first
function formatNatalChart(data) {
  const lines = [];
  
  if (LANG === 'ja') {
    const birthData = data.birth_data || {};
    lines.push(`${birthData.name || ''}さんのネイタルチャート`);
    lines.push(`生年月日時: ${birthData.datetime || ''}`);
    lines.push(`出生地: ${birthData.location || `${birthData.latitude?.toFixed(4)}, ${birthData.longitude?.toFixed(4)}`}\n`);
    
    lines.push('主要10天体:');
    if (data.planets) {
      const planetNames = {
        sun: '太陽', moon: '月', mercury: '水星', venus: '金星',
        mars: '火星', jupiter: '木星', saturn: '土星',
        uranus: '天王星', neptune: '海王星', pluto: '冥王星'
      };
      
      // Handle both array and object formats
      let planetsObj = {};
      if (Array.isArray(data.planets)) {
        data.planets.forEach(p => {
          planetsObj[p.name] = p;
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
      
      // Add Dragon nodes to main planet list
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
    
    // House cusps with signs
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
    if (data.aspects?.length > 0) {
      lines.push('\nアスペクト:');
      const aspectTranslations = {
        'north_node': 'ドラゴンヘッド',
        'south_node': 'ドラゴンテイル',
        'sun': '太陽', 'moon': '月', 'mercury': '水星', 'venus': '金星',
        'mars': '火星', 'jupiter': '木星', 'saturn': '土星',
        'uranus': '天王星', 'neptune': '海王星', 'pluto': '冥王星'
      };
      
      data.aspects.slice(0, 10).forEach(a => {
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
  } else {
    // English format
    const birthData = data.birth_data || {};
    lines.push(`Natal Chart for ${birthData.name || ''}`);
    lines.push(`Birth Date/Time: ${birthData.datetime || ''}`);
    lines.push(`Location: ${birthData.location || `${birthData.latitude?.toFixed(4)}, ${birthData.longitude?.toFixed(4)}`}\n`);
    
    lines.push('【Major Planets】');
    if (data.planets) {
      // Handle both array and object formats
      let planetsData = [];
      if (Array.isArray(data.planets)) {
        planetsData = data.planets.filter(p => 
          ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].includes(p.name)
        );
      } else {
        Object.entries(data.planets).forEach(([name, p]) => {
          if (['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].includes(name)) {
            planetsData.push({...p, name});
          }
        });
      }
      
      planetsData.forEach(p => {
        const retro = (p.is_retrograde || p.retrograde) ? '(R)' : '';
        const degree = p.degree !== undefined ? p.degree : (p.longitude % 30);
        lines.push(`  ${p.name}: ${p.sign} ${degree.toFixed(1)}° House ${p.house}${retro}`);
      });
    }
  }
  
  return lines.join('\n');
}

// Transits formatter with current influences
function formatTransits(data) {
  const lines = [];
  const birthData = data.birth_data || {};
  
  if (LANG === 'ja') {
    lines.push('トランジット分析:');
    lines.push(`対象: ${birthData.name || ''}さん`);
    lines.push(`分析日時: ${data.transit_date || '現在'}\n`);
    
    // Handle actual API response structure
    if (data.transit_planets && data.natal_planets && data.aspects) {
      // Show current transit positions
      if (data.transit_planets && data.transit_planets.length > 0) {
        lines.push('現在の天体位置:');
        const planetNames = {
          sun: '太陽', moon: '月', mercury: '水星', venus: '金星',
          mars: '火星', jupiter: '木星', saturn: '土星',
          uranus: '天王星', neptune: '海王星', pluto: '冥王星'
        };
        
        data.transit_planets.forEach(p => {
          const name = planetNames[p.name] || p.name;
          const retro = p.retrograde ? '(R)' : '';
          const degree = p.longitude % 30;
          lines.push(` ${name}: ${p.sign}${degree.toFixed(1)}/${p.house}H${retro}`);
        });
      }
      
      // Show aspects between transit and natal planets
      if (data.aspects && data.aspects.length > 0) {
        lines.push('\n重要なアスペクト:');
        const planetTranslations = {
          'sun': '太陽', 'moon': '月', 'mercury': '水星', 'venus': '金星',
          'mars': '火星', 'jupiter': '木星', 'saturn': '土星',
          'uranus': '天王星', 'neptune': '海王星', 'pluto': '冥王星'
        };
        
        data.aspects.slice(0, 10).forEach(a => {
          // Parse planet names (transit_sun -> sun, natal_moon -> moon)
          const transitPlanet = (a.body1 || a.planet1 || '').replace('transit_', '').replace('t_', '');
          const natalPlanet = (a.body2 || a.planet2 || '').replace('natal_', '').replace('n_', '');
          const t_name = planetTranslations[transitPlanet] || transitPlanet;
          const n_name = planetTranslations[natalPlanet] || natalPlanet;
          const aspectName = a.type || a.aspect_name || '';
          const applying = a.applying !== undefined ? (a.applying ? 'applying' : 'separating') : '';
          lines.push(` T${t_name}-${aspectName}-N${n_name} (${a.orb.toFixed(1)}°) ${applying}`);
        });
      }
      
      // Show house transits
      if (data.transit_planets && data.transit_planets.length > 0) {
        const houseTransits = {};
        data.transit_planets.forEach(p => {
          const name = {
            sun: '太陽', moon: '月', mercury: '水星', venus: '金星',
            mars: '火星', jupiter: '木星', saturn: '土星',
            uranus: '天王星', neptune: '海王星', pluto: '冥王星'
          }[p.name] || p.name;
          
          if (p.house) {
            if (!houseTransits[p.house]) houseTransits[p.house] = [];
            houseTransits[p.house].push(name);
          }
        });
        
        if (Object.keys(houseTransits).length > 0) {
          lines.push('\nハウス通過:');
          Object.entries(houseTransits).sort((a, b) => a[0] - b[0]).forEach(([house, planets]) => {
            lines.push(` ${house}H: ${planets.join('、')}が通過中`);
          });
        }
      }
    }
  } else {
    lines.push(`Transits for ${data.name}`);
    lines.push(`Date: ${data.transit_date || 'Current'}\n`);
    
    if (data.active_transits?.length > 0) {
      lines.push('【Active Influences】');
      data.active_transits.slice(0, 7).forEach(t => {
        const exact = t.days_to_exact === 0 ? '(exact!)' : 
                     t.days_to_exact > 0 ? `(${t.days_to_exact} days)` : '';
        lines.push(`  T${t.transit_planet} ${t.aspect} N${t.natal_planet} ${exact}`);
      });
    }
  }
  
  return lines.join('\n');
}

// Other formatters...
function formatSynastry(data) {
  const lines = [];
  
  const person1Name = data.person1?.name || 'Person1';
  const person2Name = data.person2?.name || 'Person2';
  const person1Date = data.person1?.datetime || '';
  const person2Date = data.person2?.datetime || '';
  
  if (LANG === 'ja') {
    lines.push('相性診断:');
    lines.push(` person1: ${person1Name}さん (${person1Date.split('T')[0] || ''})`);
    lines.push(` person2: ${person2Name}さん (${person2Date.split('T')[0] || ''})\n`);
    
    if (data.compatibility_score !== undefined) {
      lines.push('相性スコア:');
      lines.push(` 総合: ${data.compatibility_score}%`);
      if (data.love_score) lines.push(` 恋愛: ${data.love_score}%`);
      if (data.friendship_score) lines.push(` 友情: ${data.friendship_score}%`);
      if (data.business_score) lines.push(` ビジネス: ${data.business_score}%`);
    }
    
    if (data.aspects?.length > 0) {
      const planetTranslations = {
        'sun': '太陽', 'moon': '月', 'mercury': '水星', 'venus': '金星',
        'mars': '火星', 'jupiter': '木星', 'saturn': '土星',
        'uranus': '天王星', 'neptune': '海王星', 'pluto': '冥王星'
      };
      
      // Separate good and challenging aspects
      const goodAspects = data.aspects.filter(a => 
        ['conjunction', 'trine', 'sextile'].includes(a.type || a.aspect_name || '')
      );
      const challengingAspects = data.aspects.filter(a => 
        ['opposition', 'square'].includes(a.type || a.aspect_name || '')
      );
      
      if (goodAspects.length > 0) {
        lines.push('\n良い相性アスペクト:');
        goodAspects.slice(0, 5).forEach(a => {
          const p1Planet = (a.body1 || a.planet1 || '').replace('p1_', '');
          const p2Planet = (a.body2 || a.planet2 || '').replace('p2_', '');
          const p1Name = planetTranslations[p1Planet] || p1Planet;
          const p2Name = planetTranslations[p2Planet] || p2Planet;
          const aspectName = a.type || a.aspect_name || '';
          lines.push(` P1${p1Name}-${aspectName}-P2${p2Name} (${a.orb.toFixed(1)}°)`);
        });
      }
      
      if (challengingAspects.length > 0) {
        lines.push('\n注意が必要なアスペクト:');
        challengingAspects.slice(0, 5).forEach(a => {
          const p1Planet = (a.body1 || a.planet1 || '').replace('p1_', '');
          const p2Planet = (a.body2 || a.planet2 || '').replace('p2_', '');
          const p1Name = planetTranslations[p1Planet] || p1Planet;
          const p2Name = planetTranslations[p2Planet] || p2Planet;
          const aspectName = a.type || a.aspect_name || '';
          lines.push(` P1${p1Name}-${aspectName}-P2${p2Name} (${a.orb.toFixed(1)}°)`);
        });
      }
    }
  } else {
    lines.push(`Synastry: ${person1Name} & ${person2Name}`);
    lines.push(`Compatibility Score: ${data.compatibility_score || 'Calculating'}%\n`);
    
    if (data.aspects?.length > 0) {
      lines.push('【Key Aspects】');
      data.aspects.slice(0, 10).forEach(a => {
        const p1Planet = (a.body1 || a.planet1 || '').replace('p1_', '');
        const p2Planet = (a.body2 || a.planet2 || '').replace('p2_', '');
        const aspectName = a.type || a.aspect_name || '';
        lines.push(`  ${person1Name}'s ${p1Planet} - ${aspectName} - ${person2Name}'s ${p2Planet} (${a.orb.toFixed(1)}°)`);
      });
    }
  }
  
  return lines.join('\n');
}

function formatComposite(data) {
  const lines = [];
  const birthData = data.birth_data || {};
  
  const person1 = birthData.person1_name || data.person1_name || 'Person1';
  const person2 = birthData.person2_name || data.person2_name || 'Person2';
  
  if (LANG === 'ja') {
    lines.push('コンポジットチャート:');
    lines.push(` 対象: ${person1} & ${person2}`);
    lines.push(` タイプ: ${birthData.composite_type || data.composite_type || 'midpoint'}\n`);
    
    if (data.planets) {
      lines.push('合成天体:');
      const planetNames = {
        sun: '太陽', moon: '月', mercury: '水星', venus: '金星',
        mars: '火星', jupiter: '木星', saturn: '土星',
        uranus: '天王星', neptune: '海王星', pluto: '冥王星'
      };
      
      // Handle both array and object formats
      let planetsArray = Array.isArray(data.planets) ? data.planets : Object.values(data.planets);
      
      planetsArray.forEach(p => {
        const name = planetNames[p.name] || p.name;
        const retro = p.retrograde ? '(R)' : '';
        const degree = p.longitude % 30;
        lines.push(` ${name}: ${p.sign}${degree.toFixed(1)}/${p.house}H${retro}`);
      });
    }
  } else {
    lines.push(`Composite Chart: ${person1} & ${person2}`);
    lines.push(`Type: ${birthData.composite_type || 'midpoint'}\n`);
    
    if (data.planets?.length > 0) {
      lines.push('【Composite Planets】');
      data.planets.slice(0, 7).forEach(p => {
        const retro = p.retrograde ? '(R)' : '';
        const degree = p.longitude % 30;
        lines.push(`  ${p.name}: ${p.sign} ${degree.toFixed(1)}° House ${p.house}${retro}`);
      });
    }
  }
  
  return lines.join('\n');
}

function formatProgressions(data) {
  const lines = [];
  const birthData = data.birth_data || {};
  
  if (LANG === 'ja') {
    lines.push('進行図分析:');
    lines.push(` 対象: ${birthData.name || ''}さん`);
    lines.push(` 進行日: ${data.target_date || ''}\n`);
    
    if (data.progressed_planets && Array.isArray(data.progressed_planets)) {
      lines.push('進行天体:');
      const planetNames = {
        sun: '太陽', moon: '月', mercury: '水星', venus: '金星',
        mars: '火星', jupiter: '木星', saturn: '土星'
      };
      
      data.progressed_planets.forEach(p => {
        const name = planetNames[p.name] || p.name;
        const retro = p.retrograde ? '(R)' : '';
        const degree = p.longitude % 30;
        lines.push(` P${name}: ${p.sign}${degree.toFixed(1)}/${p.house}H${retro}`);
      });
    }
    
    if (data.aspects?.length > 0) {
      const planetTranslations = {
        'sun': '太陽', 'moon': '月', 'mercury': '水星', 'venus': '金星',
        'mars': '火星', 'jupiter': '木星', 'saturn': '土星',
        'uranus': '天王星', 'neptune': '海王星', 'pluto': '冥王星'
      };
      
      // Separate P-N aspects and P-P aspects
      const pnAspects = data.aspects.filter(a => {
        const p1 = a.planet1 || a.body1 || '';
        const p2 = a.planet2 || a.body2 || '';
        return (p1.includes('progressed') && p2.includes('natal')) || 
               (p1.startsWith('p_') && p2.startsWith('n_'));
      });
      
      const ppAspects = data.aspects.filter(a => {
        const p1 = a.planet1 || a.body1 || '';
        const p2 = a.planet2 || a.body2 || '';
        return (p1.includes('progressed') && p2.includes('progressed')) ||
               (p1.startsWith('p_') && p2.startsWith('p_'));
      });
      
      if (pnAspects.length > 0) {
        lines.push('\n進行天体→ネイタルへのアスペクト:');
        pnAspects.slice(0, 5).forEach(a => {
          const p1 = (a.planet1 || a.body1 || '').replace('progressed_', '').replace('p_', '');
          const p2 = (a.planet2 || a.body2 || '').replace('natal_', '').replace('n_', '');
          const p1Name = planetTranslations[p1] || p1;
          const p2Name = planetTranslations[p2] || p2;
          const aspectName = a.aspect_name || a.type || 'unknown';
          const applying = a.applying !== undefined ? (a.applying ? ' applying' : ' separating') : '';
          lines.push(` P${p1Name}-${aspectName}-N${p2Name} (${a.orb.toFixed(1)}°)${applying}`);
        });
      }
      
      if (ppAspects.length > 0) {
        lines.push('\n進行天体同士のアスペクト:');
        ppAspects.slice(0, 5).forEach(a => {
          const p1 = (a.planet1 || a.body1 || '').replace('progressed_', '').replace('p_', '');
          const p2 = (a.planet2 || a.body2 || '').replace('progressed_', '').replace('p_', '');
          const p1Name = planetTranslations[p1] || p1;
          const p2Name = planetTranslations[p2] || p2;
          const aspectName = a.aspect_name || a.type || 'unknown';
          lines.push(` P${p1Name}-${aspectName}-P${p2Name} (${a.orb.toFixed(1)}°)`);
        });
      }
    }
  } else {
    lines.push(`Progressions for ${birthData.name || ''}`);
    lines.push(`Target Date: ${data.target_date || ''}\n`);
    
    if (data.progressed_planets?.length > 0) {
      lines.push('【Progressed Planets】');
      data.progressed_planets.slice(0, 5).forEach(p => {
        const retro = p.retrograde ? '(R)' : '';
        const degree = p.longitude % 30;
        lines.push(`  P${p.name}: ${p.sign} ${degree.toFixed(1)}° House ${p.house}${retro}`);
      });
    }
  }
  
  return lines.join('\n');
}

function formatReturnChart(data) {
  const lines = [];
  const birthData = data.birth_data || {};
  
  // Determine return type from endpoint context
  let typeJa = 'リターン';
  if (data.return_type) {
    const typeMap = {
      solar: 'ソーラーリターン',
      lunar: 'ルナーリターン',
      saturn: 'サターンリターン',
      jupiter: 'ジュピターリターン'
    };
    typeJa = typeMap[data.return_type] || data.return_type;
  }
  
  if (LANG === 'ja') {
    lines.push(`${typeJa}:`);
    lines.push(` 対象: ${birthData.name || ''}さん`);
    lines.push(` リターン日時: ${data.return_date || ''}`);
    if (data.age !== undefined) lines.push(` 年齢: ${data.age}歳`);
    lines.push('');
    
    if (data.planets) {
      lines.push('リターン天体:');
      const planetNames = {
        sun: '太陽', moon: '月', mercury: '水星', venus: '金星',
        mars: '火星', jupiter: '木星', saturn: '土星',
        uranus: '天王星', neptune: '海王星', pluto: '冥王星'
      };
      
      // Handle both array and object formats
      let planetsArray = Array.isArray(data.planets) ? data.planets : Object.values(data.planets);
      
      planetsArray.forEach(p => {
        const name = planetNames[p.name] || p.name;
        const retro = p.retrograde ? '(R)' : '';
        const degree = p.longitude % 30;
        lines.push(` ${name}: ${p.sign}${degree.toFixed(1)}/${p.house}H${retro}`);
      });
    }
    
    // Add north/south nodes if available
    if (data.north_node) {
      const degree = data.north_node.longitude % 30;
      lines.push(` ドラゴンヘッド: ${data.north_node.sign}${degree.toFixed(1)}/${data.north_node.house}H`);
    }
    if (data.south_node) {
      const degree = data.south_node.longitude % 30;
      lines.push(` ドラゴンテイル: ${data.south_node.sign}${degree.toFixed(1)}/${data.south_node.house}H`);
    }
    
    // Show important aspects
    if (data.aspects && data.aspects.length > 0) {
      lines.push('\n重要なアスペクト:');
      const planetTranslations = {
        'sun': '太陽', 'moon': '月', 'mercury': '水星', 'venus': '金星',
        'mars': '火星', 'jupiter': '木星', 'saturn': '土星',
        'uranus': '天王星', 'neptune': '海王星', 'pluto': '冥王星',
        'north_node': 'ドラゴンヘッド', 'south_node': 'ドラゴンテイル'
      };
      
      data.aspects.slice(0, 8).forEach(a => {
        const p1 = a.planet1 || a.body1 || '';
        const p2 = a.planet2 || a.body2 || '';
        
        // Skip obvious node opposition
        if ((p1 === 'north_node' && p2 === 'south_node') ||
            (p1 === 'south_node' && p2 === 'north_node')) {
          return;
        }
        
        const p1Name = planetTranslations[p1] || p1;
        const p2Name = planetTranslations[p2] || p2;
        const aspectName = a.aspect_name || a.type || '';
        lines.push(` ${p1Name}-${aspectName}-${p2Name} (${a.orb.toFixed(1)}°)`);
      });
    }
    
    // Show angles if available
    if (data.houses && data.houses.length >= 10) {
      lines.push('\n年運のテーマ:');
      const asc = data.houses[0];
      const mc = data.houses[9];
      if (asc) lines.push(` ASC: ${asc.sign}${(asc.longitude % 30).toFixed(1)}`);
      if (mc) lines.push(` MC: ${mc.sign}${(mc.longitude % 30).toFixed(1)}`);
    }
  } else {
    lines.push(`${data.return_type || 'Return'} Chart for ${birthData.name || ''}`);
    lines.push(`Return Date: ${data.return_date || ''}\n`);
    
    if (data.planets?.length > 0) {
      lines.push('【Planets】');
      data.planets.slice(0, 7).forEach(p => {
        const retro = p.retrograde ? '(R)' : '';
        const degree = p.longitude % 30;
        lines.push(`  ${p.name}: ${p.sign} ${degree.toFixed(1)}° House ${p.house}${retro}`);
      });
    }
  }
  
  return lines.join('\n');
}

function formatElection(data) {
  const lines = [];
  
  if (LANG === 'ja') {
    lines.push('吉日選定結果:');
    lines.push(` 目的: ${data.purpose || ''}`);
    
    if (data.search_period) {
      lines.push(` 検索期間: ${data.search_period.start} 〜 ${data.search_period.end}\n`);
    }
    
    if (data.candidates && Array.isArray(data.candidates)) {
      if (data.candidates.length === 0) {
        lines.push('推奨日時: なし');
        lines.push(' ※ 指定期間内に適切な候補が見つかりませんでした');
        lines.push(' ※ 検索期間を変更するか、条件を調整してください');
      } else {
        lines.push('推奨日時:');
        data.candidates.slice(0, 5).forEach((c, index) => {
        // Score is 0-1, convert to percentage
        const score = Math.round((c.score || 0) * 100);
        const datetime = c.datetime || c.date || '';
        
        // Add ranking emoji
        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
        
        lines.push(` ${rankEmoji} ${datetime} - スコア: ${score}/100`);
        
        // Add key astronomical reasons if available
        if (c.chart_data?.planets) {
          const moonSign = c.chart_data.planets.find(p => p.name === 'moon')?.sign;
          const sunSign = c.chart_data.planets.find(p => p.name === 'sun')?.sign;
          if (moonSign) {
            lines.push(`    月: ${moonSign}`);
          }
          if (sunSign) {
            lines.push(`    太陽: ${sunSign}`);
          }
        }
        
        // Add reasons if available
        if (c.reasons?.length > 0) {
          c.reasons.slice(0, 2).forEach(r => {
            lines.push(`    - ${r}`);
          });
        }
      });
      }
    }
    
    if (data.location) {
      lines.push(`\n場所: 緯度 ${data.location.latitude}, 経度 ${data.location.longitude}`);
    }
  } else {
    lines.push('【Election Results】');
    lines.push(`Purpose: ${data.purpose || ''}\n`);
    
    if (data.search_period) {
      lines.push(`Search Period: ${data.search_period.start} ~ ${data.search_period.end}\n`);
    }
    
    if (data.candidates && Array.isArray(data.candidates)) {
      if (data.candidates.length === 0) {
        lines.push('Recommended Times: None');
        lines.push('※ No suitable candidates found in the specified period');
        lines.push('※ Please try changing the search period or adjusting conditions');
      } else {
        lines.push('Recommended Times:');
        data.candidates.slice(0, 5).forEach((c, index) => {
          const score = Math.round((c.score || 0) * 100);
          const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '★';
          lines.push(`  ${rankEmoji} ${c.datetime || c.date} - Score: ${score}/100`);
          
          // Add moon and sun signs if available
          if (c.chart_data?.planets) {
            const moonSign = c.chart_data.planets.find(p => p.name === 'moon')?.sign;
            const sunSign = c.chart_data.planets.find(p => p.name === 'sun')?.sign;
            if (moonSign) lines.push(`    Moon: ${moonSign}`);
            if (sunSign) lines.push(`    Sun: ${sunSign}`);
          }
        });
      }
    }
    
    if (data.location) {
      lines.push(`\nLocation: Lat ${data.location.latitude}, Lng ${data.location.longitude}`);
    }
  }
  
  return lines.join('\n');
}

function formatHoroscope(data) {
  const lines = [];
  
  if (LANG === 'ja') {
    // ヘッダー - 星座と日付
    lines.push(`${data.sign || '全体'}の運勢`);
    if (data.date) {
      lines.push(`日付: ${data.date}`);
    }
    lines.push('');
    
    // 総合運
    lines.push('総合運:');
    lines.push(`  スコア: ${data.overall_score || 0}/100`);
    lines.push(`  評価: ${data.rating || 0}/10`);
    if (data.theme) {
      lines.push(`  テーマ: ${data.theme}`);
    }
    lines.push('');
    
    // 天体の影響
    if (data.transit_influences?.length > 0) {
      lines.push('主要な天体の影響:');
      data.transit_influences.forEach(t => {
        const influence = t.influence === 'positive' ? 'ポジティブ' : 
                         t.influence === 'challenging' ? 'チャレンジング' : 'ニュートラル';
        lines.push(`  ${t.planet}:`);
        lines.push(`    アスペクト: ${t.aspect}`);
        lines.push(`    影響: ${influence}`);
      });
      lines.push('');
    }
    
    // 月相情報
    if (data.moon_details) {
      lines.push('月の情報:');
      lines.push(`  月相: ${data.moon_details.phase}`);
      lines.push(`  進行度: ${data.moon_details.phase_percentage}%`);
      lines.push(`  星座: ${data.moon_details.sign}`);
      lines.push('');
    }
    
    // エレメントバランス
    if (data.elemental_balance) {
      const elem = data.elemental_balance;
      lines.push('エレメントバランス:');
      lines.push(`  支配的エレメント: ${elem.dominant_element}`);
      lines.push(`  エネルギー: ${elem.energy_signature}`);
      lines.push('');
    }
    
    // 推奨アクティビティ
    if (data.ai_metadata?.activities?.recommended?.length > 0) {
      lines.push('推奨アクティビティ:');
      data.ai_metadata.activities.recommended.forEach(a => {
        lines.push(`  ${a.activity}:`);
        lines.push(`    理由: ${a.reason}`);
      });
      lines.push('');
    }
    
    // 精度推定
    if (data.accuracy_estimate) {
      lines.push(`精度推定: ${data.accuracy_estimate}`);
    }
  } else {
    // English version
    lines.push(`Horoscope for ${data.sign || 'All'}`);
    if (data.date) {
      lines.push(`Date: ${data.date}`);
    }
    lines.push('');
    
    lines.push('Overall:');
    lines.push(`  Score: ${data.overall_score || 0}/100`);
    lines.push(`  Rating: ${data.rating || 0}/10`);
    if (data.theme) {
      lines.push(`  Theme: ${data.theme}`);
    }
    lines.push('');
    
    if (data.transit_influences?.length > 0) {
      lines.push('Planetary Influences:');
      data.transit_influences.forEach(t => {
        const influence = t.influence === 'positive' ? 'Positive' : 
                         t.influence === 'challenging' ? 'Challenging' : 'Neutral';
        lines.push(`  ${t.planet}:`);
        lines.push(`    Aspect: ${t.aspect}`);
        lines.push(`    Influence: ${influence}`);
      });
      lines.push('');
    }
    
    if (data.moon_details) {
      lines.push('Moon Details:');
      lines.push(`  Phase: ${data.moon_details.phase}`);
      lines.push(`  Progress: ${data.moon_details.phase_percentage}%`);
      lines.push(`  Sign: ${data.moon_details.sign}`);
    }
  }
  
  return lines.join('\n');
}

function formatTripleSynastry(data) {
  const lines = [];
  
  // Extract names from various possible locations in the data
  const getName = (person, index) => {
    if (typeof person === 'string') return person;
    if (person?.name) return person.name;
    // Try getting from person_names array if it exists
    if (data.person_names && data.person_names[index]) {
      return data.person_names[index];
    }
    return `Person${index + 1}`;
  };
  
  const person1Name = getName(data.person1, 0);
  const person2Name = getName(data.person2, 1);
  const person3Name = getName(data.person3, 2);
  
  if (LANG === 'ja') {
    // ヘッダー
    lines.push(`3者相性分析`);
    lines.push(`対象者: ${person1Name} × ${person2Name} × ${person3Name}`);
    if (data.analysis_date) {
      lines.push(`分析日: ${data.analysis_date}`);
    }
    lines.push('');
    
    // 3者間の総合相性
    if (data.overall_compatibility !== undefined) {
      lines.push('総合相性:');
      lines.push(`  スコア: ${data.overall_compatibility}%`);
      lines.push('');
    }
    
    // ペア別相性スコア
    if (data.pairwise_scores) {
      lines.push('ペア別相性スコア:');
      Object.entries(data.pairwise_scores).forEach(([pair, score]) => {
        lines.push(`  ${pair}: ${score}%`);
      });
      lines.push('');
    }
    
    // 3者間の主要アスペクト
    if (data.all_aspects?.length > 0) {
      lines.push('3者間の主要アスペクト:');
      
      // Group aspects by person pairs
      const aspectsByPair = {};
      data.all_aspects.forEach(a => {
        const pairKey = `${a.person1}-${a.person2}`;
        if (!aspectsByPair[pairKey]) {
          aspectsByPair[pairKey] = [];
        }
        aspectsByPair[pairKey].push(a);
      });
      
      // Display grouped aspects
      Object.entries(aspectsByPair).forEach(([pair, aspects]) => {
        const [p1, p2] = pair.split('-');
        lines.push(`  ${p1} × ${p2}:`);
        aspects.slice(0, 3).forEach(a => {
          const aspect = a.aspect_name || a.aspect;
          const orb = a.orb !== undefined ? `${a.orb.toFixed(1)}°` : '';
          lines.push(`    ${a.body1 || a.planet1} ${aspect} ${a.body2 || a.planet2} ${orb}`);
        });
      });
      lines.push('');
    }
    
    // ペア別分析
    if (data.pairwise_analysis) {
      lines.push('ペア別詳細分析:');
      Object.entries(data.pairwise_analysis).forEach(([pair, analysis]) => {
        lines.push(`  ${pair}:`);
        if (analysis.summary) {
          lines.push(`    概要: ${analysis.summary}`);
        }
        if (analysis.strengths) {
          lines.push(`    強み: ${analysis.strengths}`);
        }
        if (analysis.challenges) {
          lines.push(`    課題: ${analysis.challenges}`);
        }
      });
      lines.push('');
    }
    
    // グループダイナミクス
    if (data.group_dynamics) {
      lines.push('グループダイナミクス:');
      lines.push(`  バランス: ${data.group_dynamics.balance || '分析中'}`);
      lines.push(`  推奨: ${data.group_dynamics.recommendation || '分析中'}`);
    }
  } else {
    // English version
    lines.push(`Triple Synastry Analysis`);
    lines.push(`Subjects: ${person1Name} × ${person2Name} × ${person3Name}`);
    if (data.analysis_date) {
      lines.push(`Date: ${data.analysis_date}`);
    }
    lines.push('');
    
    if (data.overall_compatibility !== undefined) {
      lines.push('Overall Compatibility:');
      lines.push(`  Score: ${data.overall_compatibility}%`);
      lines.push('');
    }
    
    if (data.all_aspects?.length > 0) {
      lines.push('Key Aspects:');
      const aspectsByPair = {};
      data.all_aspects.forEach(a => {
        const pairKey = `${a.person1}-${a.person2}`;
        if (!aspectsByPair[pairKey]) {
          aspectsByPair[pairKey] = [];
        }
        aspectsByPair[pairKey].push(a);
      });
      
      Object.entries(aspectsByPair).forEach(([pair, aspects]) => {
        const [p1, p2] = pair.split('-');
        lines.push(`  ${p1} × ${p2}:`);
        aspects.slice(0, 3).forEach(a => {
          const aspect = a.aspect_name || a.aspect;
          const orb = a.orb !== undefined ? `${a.orb.toFixed(1)}°` : '';
          lines.push(`    ${a.body1 || a.planet1} ${aspect} ${a.body2 || a.planet2} ${orb}`);
        });
      });
    }
  }
  
  return lines.join('\n');
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  debug('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  debug('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  error(`Uncaught exception: ${err.message}`);
  error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  error(`Unhandled rejection: ${reason}`);
  process.exit(1);
});

// Log that we're ready with rich status
const readyMessage = [
  '',
  '===========================================================',
  '  YaoEphemeris MCP Bridge v1.4.10 Ready!',
  '===========================================================',
  '  Ultra High-Quality UX Edition',
  `  Language: ${LANG === 'ja' ? '日本語' : 'English'}`,
  `  Format: ${FORMAT_MODE.padEnd(8)} | Tools: 12`,
  '  Features:',
  '    - Smart parameter validation & auto-fix',
  '    - User preference caching',
  '    - Context-aware error recovery',
  '    - Progressive disclosure formatting',
  '    - Multi-language support (JP/EN)',
  '===========================================================',
  ''
].join('\n');

console.error(readyMessage);
debug('All systems operational', 'success');