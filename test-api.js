const axios = require('axios');

async function testYaoSenjutsuAPI() {
  try {
    console.log('Testing YaoSenjutsu API...');
    
    const response = await axios.post(
      'https://api.yaosenjutsu.com/api/v1/natal_chart',
      {
        name: 'テストユーザー',
        datetime: '1990-01-15T12:00:00+09:00',
        location: '東京',
        language: 'ja'
      },
      {
        headers: {
          'X-API-Key': 'test_api_key_12345',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Success! Response:', JSON.stringify(response.data, null, 2).substring(0, 500));
    console.log('Sun sign:', response.data.planets[0].sign);
    console.log('Moon sign:', response.data.planets[1].sign);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testYaoSenjutsuAPI();