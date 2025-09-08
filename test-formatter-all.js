// Test formatters for different chart types
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

// Import formatter functions (need to compile TypeScript first)
const { formatChartForLLM } = require('./app/lib/chart-formatter');

const API_KEY = process.env.YAOSENJUTSU_API_KEY;
const API_URL = 'https://api.yaosenjutsu.com';

async function testFormatter(endpoint, data, chartType) {
  try {
    console.log(`\n=== Testing ${chartType} formatter ===`);
    
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
    
    // Add chart type to the response
    response.data.chart_type = chartType;
    
    // Format the data
    const formatted = formatChartForLLM(response.data);
    console.log('Formatted output:');
    console.log(formatted);
    console.log(`\nCharacter count: ${formatted.length}`);
    console.log(`Estimated tokens: ${Math.ceil(formatted.length / 4)}`);
    
  } catch (error) {
    console.error(`Error testing ${chartType}:`, error.message);
  }
}

async function runTests() {
  console.log('Note: This requires TypeScript compilation first.');
  console.log('Run: npx ts-node test-formatter-all.ts instead');
  
  // Sample test that would work with compiled code
  const birthData = {
    name: 'テストユーザー',
    datetime: '1984-01-08T23:27:00+09:00',
    location: '大阪',
    language: 'ja'
  };
  
  // Test would go here if TypeScript was compiled
}

runTests();