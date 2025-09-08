// Test the chart formatter with actual API call
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

const API_KEY = process.env.YAOSENJUTSU_API_KEY;
const API_URL = 'https://api.yaosenjutsu.com';

async function testChartFormat() {
  try {
    console.log('=== Testing Chart Format for 1984-01-08 23:27 大阪 ===\n');
    
    // Call the actual API
    const response = await axios.post(
      `${API_URL}/api/v1/natal_chart`,
      {
        name: 'テストユーザー',
        datetime: '1984-01-08T23:27:00+09:00',
        location: '大阪',
        language: 'ja'
      },
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const chartData = response.data;
    
    // Manually format like bridge-stdio.js would
    const lines = [];
    
    lines.push('テストユーザーさんのネイタルチャート');
    lines.push('生年月日時: 1984-01-08T23:27:00+09:00');
    lines.push('出生地: 大阪\n');
    
    lines.push('主要10天体:');
    if (chartData.planets) {
      chartData.planets.forEach(p => {
        if (['太陽', '月', '水星', '金星', '火星', '木星', '土星', '天王星', '海王星', '冥王星'].includes(p.name)) {
          const degree = (p.longitude % 30).toFixed(1);
          const retro = p.retrograde ? '(R)' : '';
          lines.push(` ${p.name}: ${p.sign}${degree}/${p.house}H${retro}`);
        }
      });
    }
    
    if (chartData.north_node) {
      const degree = (chartData.north_node.longitude % 30).toFixed(1);
      lines.push(` ドラゴンヘッド: ${chartData.north_node.sign}${degree}/${chartData.north_node.house}H`);
    }
    if (chartData.south_node) {
      const degree = (chartData.south_node.longitude % 30).toFixed(1);
      lines.push(` ドラゴンテイル: ${chartData.south_node.sign}${degree}/${chartData.south_node.house}H`);
    }
    
    if (chartData.houses && chartData.houses.length >= 10) {
      lines.push('\nアングル:');
      const asc = chartData.houses[0];
      const ic = chartData.houses[3];
      const dsc = chartData.houses[6];
      const mc = chartData.houses[9];
      
      if (asc) lines.push(` ASC: ${asc.sign}${(asc.longitude % 30).toFixed(1)}`);
      if (ic) lines.push(` IC: ${ic.sign}${(ic.longitude % 30).toFixed(1)}`);
      if (dsc) lines.push(` DSC: ${dsc.sign}${(dsc.longitude % 30).toFixed(1)}`);
      if (mc) lines.push(` MC: ${mc.sign}${(mc.longitude % 30).toFixed(1)}`);
    }
    
    if (chartData.houses) {
      lines.push('\nハウスカスプ:');
      chartData.houses.forEach(h => {
        const degree = (h.longitude % 30).toFixed(1);
        lines.push(` ${h.house}H: ${h.sign}${degree}`);
      });
    }
    
    if (chartData.modality_element) {
      const me = chartData.modality_element;
      if (me.elements) {
        lines.push('\nエレメント:');
        lines.push(` 火: ${me.elements['火'].toFixed(1)}% 地: ${me.elements['地'].toFixed(1)}% 風: ${me.elements['風'].toFixed(1)}% 水: ${me.elements['水'].toFixed(1)}%`);
      }
      if (me.modalities) {
        lines.push('モダリティ:');
        lines.push(` 活動: ${me.modalities['活動宮'].toFixed(1)}% 不動: ${me.modalities['不動宮'].toFixed(1)}% 柔軟: ${me.modalities['柔軟宮'].toFixed(1)}%`);
      }
    }
    
    if (chartData.aspects) {
      lines.push('\nアスペクト:');
      chartData.aspects.slice(0, 10).forEach(a => {
        // Skip node oppositions
        if ((a.body1 === 'north_node' && a.body2 === 'south_node') ||
            (a.body1 === 'south_node' && a.body2 === 'north_node')) {
          return;
        }
        lines.push(` ${a.body1}-${a.type}-${a.body2} (${a.orb.toFixed(1)}°)`);
      });
    }
    
    console.log(lines.join('\n'));
    
    // Count characters for token estimation
    const output = lines.join('\n');
    console.log('\n=== Statistics ===');
    console.log('Total characters:', output.length);
    console.log('Estimated tokens:', Math.ceil(output.length / 4));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testChartFormat();