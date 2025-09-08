// Test formatter output comparison
const { formatNatalChart, createChartSummaryForPrompt } = require('./app/lib/chart-formatter.ts');

// Sample test data (same structure as API response)
const testData = {
  chart_type: 'natal',
  birth_data: {
    name: 'テストユーザー',
    datetime: '1984-01-08T23:27:00+09:00',
    location: '大阪',
    latitude: 34.6937,
    longitude: 135.5023
  },
  planets: [
    { name: '太陽', sign: '山羊座', longitude: 287.7257, house: 4, retrograde: false },
    { name: '月', sign: '魚座', longitude: 346.9459, house: 6, retrograde: false },
    { name: '水星', sign: '山羊座', longitude: 271.0546, house: 3, retrograde: true },
    { name: '金星', sign: '射手座', longitude: 249.3079, house: 3, retrograde: false },
    { name: '火星', sign: '天秤座', longitude: 208.9145, house: 1, retrograde: false },
  ],
  houses: [
    { house: 1, longitude: 188.225, sign: '天秤座' },
    { house: 2, longitude: 211.235, sign: '蠍座' },
    { house: 3, longitude: 242.608, sign: '射手座' },
  ],
  aspects: [
    { body1: '太陽', body2: '月', type: 'セクスタイル', orb: 0.779, score: 0.541, applying: true },
    { body1: '水星', body2: '海王星', type: 'コンジャンクション', orb: 1.158, score: 0.884, applying: false },
  ],
  modality_element: {
    elements: { '火': 41.66, '地': 16.66, '風': 16.66, '水': 25 },
    modalities: { '活動宮': 25, '不動宮': 16.66, '柔軟宮': 58.33 }
  },
  patterns: [
    { type: 'ステリウム', planets: ['水星', '木星', '海王星'], score: 0.786 }
  ]
};

console.log('=== TESTING FORMATTER OUTPUT ===\n');

// Test formatNatalChart
console.log('1. formatNatalChart() output:');
console.log('--------------------------------');
try {
  // Need to handle TypeScript imports in Node.js
  console.log('Note: This test requires TypeScript compilation first');
  console.log('Run: npx ts-node test-formatter.ts instead');
} catch (e) {
  console.log('Error:', e.message);
}

console.log('\n2. Expected bridge-stdio.js format:');
console.log('--------------------------------');
console.log(`テストユーザーさんのネイタルチャート
生年月日時: 1984-01-08T23:27:00+09:00
出生地: 大阪

主要10天体:
 太陽: 山羊座17.7/4H
 月: 魚座16.9/6H
 水星: 山羊座1.1/3H(R)
 金星: 射手座9.3/3H
 火星: 天秤座28.9/1H

アングル:
 ASC: 天秤座8.2
 IC: 山羊座9.0
 DSC: 牡羊座8.2
 MC: 蟹座9.0

ハウスカスプ:
 1H: 天秤座8.2
 2H: 蠍座1.2
 3H: 射手座2.6

エレメント:
 火: 41.7% 地: 16.7% 風: 16.7% 水: 25.0%
モダリティ:
 活動: 25.0% 不動: 16.7% 柔軟: 58.3%

アスペクト:
 太陽-セクスタイル-月 (0.8°)
 水星-コンジャンクション-海王星 (1.2°)`);

console.log('\n3. Key differences to check:');
console.log('--------------------------------');
console.log('- Degree format: should be "sign + degree.decimal/houseH"');
console.log('- Retrograde: should be "(R)" not "(逆行)"');
console.log('- Aspect format: "planet1-aspect-planet2 (orb°)"');
console.log('- No "第" prefix for houses in planet positions');
console.log('- Compact format to save tokens');