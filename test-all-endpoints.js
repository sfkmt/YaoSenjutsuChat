// Test all YaoSenjutsu API endpoints and their formatters
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

const API_KEY = process.env.YAOSENJUTSU_API_KEY;
const API_URL = 'https://api.yaosenjutsu.com';

// Test birth data
const birthData = {
  name: 'テストユーザー',
  datetime: '1984-01-08T23:27:00+09:00',
  location: '大阪',
  language: 'ja'
};

async function callAPI(endpoint, data) {
  try {
    console.log(`\n=== Testing ${endpoint} ===`);
    console.log('Request:', JSON.stringify(data, null, 2));
    
    const response = await axios.post(
      `${API_URL}${endpoint}`,
      data,
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Status:', response.status);
    console.log('Response keys:', Object.keys(response.data));
    
    // Show first few keys from the response
    const sample = {};
    Object.keys(response.data).slice(0, 5).forEach(key => {
      const value = response.data[key];
      if (typeof value === 'object' && value !== null) {
        sample[key] = Array.isArray(value) ? `Array(${value.length})` : 'Object';
      } else {
        sample[key] = value;
      }
    });
    console.log('Sample data:', sample);
    
    return response.data;
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.response?.data || error.message);
    return null;
  }
}

async function testAllEndpoints() {
  console.log('=== TESTING ALL YAOSENJUTSU API ENDPOINTS ===\n');
  
  // Western Astrology
  console.log('\n--- WESTERN ASTROLOGY ---');
  
  // 1. Natal Chart
  await callAPI('/api/v1/natal_chart', birthData);
  
  // 2. Solar Return
  await callAPI('/api/v1/solar_return', {
    ...birthData,
    year: 2024
  });
  
  // 3. Lunar Return
  await callAPI('/api/v1/lunar_return', {
    ...birthData,
    target_month: 11
  });
  
  // 4. Saturn Return
  await callAPI('/api/v1/saturn_return', birthData);
  
  // 5. Jupiter Return
  await callAPI('/api/v1/jupiter_return', birthData);
  
  // 6. Transits
  await callAPI('/api/v1/transits', {
    ...birthData,
    transit_date: '2024-11-30T12:00:00+09:00'
  });
  
  // 7. Progressions
  await callAPI('/api/v1/progressions', {
    ...birthData,
    target_date: '2024-11-30T12:00:00+09:00',
    progression_type: 'secondary'
  });
  
  // Eastern Astrology
  console.log('\n--- EASTERN ASTROLOGY ---');
  
  // 8. BaZi
  await callAPI('/api/v1/bazi', {
    name: 'テストユーザー',
    datetime: '1984-01-08T23:27:00+09:00',
    gender: 'male',
    language: 'ja'
  });
  
  // 9. SiMeiPan
  await callAPI('/api/v1/simeipan', {
    name: 'テストユーザー',
    datetime: '1984-01-08T23:27:00+09:00',
    gender: 'male',
    language: 'ja'
  });
  
  // Divination
  console.log('\n--- DIVINATION ---');
  
  // 10. Tarot
  await callAPI('/api/v1/tarot', {
    question: '今後の恋愛運について教えてください',
    spread: 'three_card',
    language: 'ja'
  });
  
  // 11. I Ching
  await callAPI('/api/v1/iching', {
    question: '新しいプロジェクトを始めるべきでしょうか',
    method: 'yarrow',
    language: 'ja'
  });
  
  // 12. Fortune
  await callAPI('/api/v1/fortune', {
    name: 'テストユーザー',
    datetime: '1984-01-08T23:27:00+09:00',
    location: '大阪',
    question: '今後の運勢について',
    fortune_type: 'general',
    language: 'ja'
  });
  
  // 13. Kin Diary
  await callAPI('/api/v1/kin_diary', {
    date: '2024-11-30',
    language: 'ja'
  });
  
  console.log('\n=== ALL TESTS COMPLETED ===');
}

// Run tests
testAllEndpoints().catch(console.error);