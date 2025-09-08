// Test script to check API status
require('dotenv').config({ path: '.env.local' });

console.log('=== API Configuration Check ===\n');

// Check OpenAI API Key
if (process.env.OPENAI_API_KEY) {
  console.log('✅ OpenAI API Key: Set (length: ' + process.env.OPENAI_API_KEY.length + ')');
  console.log('   First 10 chars: ' + process.env.OPENAI_API_KEY.substring(0, 10) + '...');
} else {
  console.log('❌ OpenAI API Key: Not set');
}

// Check YaoSenjutsu API Key
if (process.env.YAOSENJUTSU_API_KEY) {
  console.log('✅ YaoSenjutsu API Key: Set (length: ' + process.env.YAOSENJUTSU_API_KEY.length + ')');
  console.log('   First 10 chars: ' + process.env.YAOSENJUTSU_API_KEY.substring(0, 10) + '...');
} else {
  console.log('❌ YaoSenjutsu API Key: Not set');
}

console.log('\n=== Testing API Endpoints ===\n');

// Test YaoSenjutsu API
async function testYaoSenjutsuAPI() {
  const axios = require('axios');
  
  try {
    console.log('Testing YaoSenjutsu API...');
    const response = await axios.post(
      'https://api.yaosenjutsu.com/api/v1/natal_chart',
      {
        name: 'テストユーザー',
        datetime: '1990-01-01T12:00:00+09:00',
        location: '東京',
        language: 'ja'
      },
      {
        headers: {
          'X-API-Key': process.env.YAOSENJUTSU_API_KEY || '',
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ YaoSenjutsu API: Working');
    console.log('   Response status:', response.status);
    console.log('   Response data keys:', Object.keys(response.data));
  } catch (error) {
    console.log('❌ YaoSenjutsu API: Error');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data);
    } else {
      console.log('   Error:', error.message);
    }
  }
}

// Test OpenAI API
async function testOpenAIAPI() {
  const { OpenAI } = require('openai');
  
  try {
    console.log('\nTesting OpenAI API...');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a test assistant.' },
        { role: 'user', content: 'Say "API is working" in Japanese.' }
      ],
      max_tokens: 50
    });
    
    console.log('✅ OpenAI API: Working');
    console.log('   Response:', completion.choices[0].message.content);
  } catch (error) {
    console.log('❌ OpenAI API: Error');
    console.log('   Error:', error.message);
  }
}

// Run tests
(async () => {
  await testYaoSenjutsuAPI();
  await testOpenAIAPI();
  
  console.log('\n=== Recommendations ===\n');
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('1. Set OPENAI_API_KEY in .env.local file');
  }
  if (!process.env.YAOSENJUTSU_API_KEY) {
    console.log('2. Set YAOSENJUTSU_API_KEY in .env.local file');
  }
  
  console.log('\nMake sure your .env.local file contains:');
  console.log('OPENAI_API_KEY=your_actual_api_key_here');
  console.log('YAOSENJUTSU_API_KEY=your_actual_api_key_here');
})();