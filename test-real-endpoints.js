// Test ACTUAL YaoSenjutsu API endpoints
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
    
    console.log('✅ Status:', response.status);
    console.log('Response keys:', Object.keys(response.data).slice(0, 10));
    return true;
  } catch (error) {
    console.error(`❌ Error:`, error.response?.status, error.response?.data?.error || error.message);
    return false;
  }
}

async function testAllRealEndpoints() {
  console.log('=== TESTING ACTUAL YAOSENJUTSU API ENDPOINTS ===\n');
  
  const results = [];
  
  // Western Astrology (VERIFIED TO EXIST)
  console.log('\n--- WESTERN ASTROLOGY ---');
  results.push(await callAPI('/api/v1/natal_chart', birthData));
  results.push(await callAPI('/api/v1/solar_return', { ...birthData, year: 2024 }));
  results.push(await callAPI('/api/v1/lunar_return', birthData));
  results.push(await callAPI('/api/v1/saturn_return', birthData));
  results.push(await callAPI('/api/v1/jupiter_return', birthData));
  results.push(await callAPI('/api/v1/transits', birthData));
  results.push(await callAPI('/api/v1/progressions', {
    ...birthData,
    target_date: '2024-11-30T12:00:00+09:00'
  }));
  
  // Synastry & Composite
  console.log('\n--- SYNASTRY & COMPOSITE ---');
  const synastryData = {
    person1: birthData,
    person2: { ...birthData, name: 'テストユーザー2' },
    language: 'ja'
  };
  results.push(await callAPI('/api/v1/synastry', synastryData));
  results.push(await callAPI('/api/v1/composite', synastryData));
  
  // Triple Synastry
  const tripleData = {
    person1: birthData,
    person2: { ...birthData, name: 'テストユーザー2' },
    person3: { ...birthData, name: 'テストユーザー3' },
    language: 'ja'
  };
  results.push(await callAPI('/api/v1/triple_synastry', tripleData));
  
  // Election
  results.push(await callAPI('/api/v1/election', {
    start_date: '2024-12-01',
    end_date: '2024-12-31',
    purpose: 'business',
    language: 'ja'
  }));
  
  // Horoscope
  console.log('\n--- HOROSCOPE ---');
  results.push(await callAPI('/api/v1/horoscope', {
    date: '2024-11-30',
    language: 'ja'
  }));
  
  // YaoSenjutsu Hybrid
  console.log('\n--- YAOSENJUTSU HYBRID ---');
  results.push(await callAPI('/api/v1/yaonatal', birthData));
  results.push(await callAPI('/api/v1/yaosynastry', {
    person1_name: 'テストユーザー1',
    person1_datetime: '1984-01-08T23:27:00+09:00',
    person2_name: 'テストユーザー2',
    person2_datetime: '1985-05-15T14:30:00+09:00',
    language: 'ja'
  }));
  results.push(await callAPI('/api/v1/yaotransits', {
    name: 'テストユーザー',
    birth_datetime: '1984-01-08T23:27:00+09:00',
    transit_datetime: '2024-11-30T12:00:00+09:00',
    language: 'ja'
  }));
  
  // Eastern Astrology
  console.log('\n--- EASTERN ASTROLOGY ---');
  results.push(await callAPI('/api/v1/sukuyo', {
    name: 'テストユーザー',
    datetime: '1984-01-08T23:27:00+09:00',
    include_details: true
  }));
  results.push(await callAPI('/api/v1/sanku', {
    person1_name: 'テストユーザー1',
    person1_datetime: '1984-01-08T23:27:00+09:00',
    person2_name: 'テストユーザー2',
    person2_datetime: '1985-05-15T14:30:00+09:00',
    include_details: true
  }));
  results.push(await callAPI('/api/v1/dailysanku', {
    name: 'テストユーザー',
    birth_datetime: '1984-01-08T23:27:00+09:00',
    target_date: '2024-11-30',
    include_ryohan: true,
    include_rokugai: true
  }));
  results.push(await callAPI('/api/v1/sankusearch', {
    base_suku: '角宿',
    target_sukus: ['房宿', '心宿']
  }));
  
  // Summary
  console.log('\n=== SUMMARY ===');
  const successful = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${results.length}`);
}

// Run tests
testAllRealEndpoints().catch(console.error);