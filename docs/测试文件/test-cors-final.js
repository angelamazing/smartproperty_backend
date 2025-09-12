/**
 * 最终CORS测试脚本
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TEST_AVATAR = 'avatar_1756687222017_hsnganr3o.png';

async function testCorsFinal() {
  console.log('🧪 开始最终CORS测试...\n');

  const testUrls = [
    `${BASE_URL}/uploads/avatars/${TEST_AVATAR}`,
    `${BASE_URL}/avatar/${TEST_AVATAR}`,
    `${BASE_URL}/api/static/uploads/avatars/${TEST_AVATAR}`
  ];

  const origins = [
    'http://localhost:5175',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:5175'
  ];

  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    console.log(`${i + 1}️⃣ 测试URL: ${url}`);
    
    for (const origin of origins) {
      try {
        // 测试OPTIONS预检请求
        const optionsResponse = await axios.options(url, {
          headers: {
            'Origin': origin,
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type'
          }
        });
        
        console.log(`   ✅ ${origin} OPTIONS成功: ${optionsResponse.status}`);
        
        // 测试实际GET请求
        const getResponse = await axios.get(url, {
          responseType: 'arraybuffer',
          headers: {
            'Origin': origin
          }
        });
        
        console.log(`   ✅ ${origin} GET成功: ${getResponse.status} (${getResponse.data.length} 字节)`);
        
      } catch (error) {
        console.log(`   ❌ ${origin} 失败: ${error.message}`);
        if (error.response) {
          console.log(`      状态码: ${error.response.status}`);
          console.log(`      CORS头: ${error.response.headers['access-control-allow-origin']}`);
        }
      }
    }
    console.log('');
  }

  // 浏览器测试指导
  console.log('🌐 浏览器测试指导:');
  console.log('请在浏览器控制台中运行以下代码:');
  console.log(`
// 测试所有路径
const testUrls = [
  '${BASE_URL}/uploads/avatars/${TEST_AVATAR}',
  '${BASE_URL}/avatar/${TEST_AVATAR}',
  '${BASE_URL}/api/static/uploads/avatars/${TEST_AVATAR}'
];

testUrls.forEach((url, index) => {
  console.log(\`测试路径 \${index + 1}: \${url}\`);
  
  // 使用fetch测试
  fetch(url, {
    method: 'GET',
    mode: 'cors'
  })
  .then(response => {
    console.log(\`✅ 路径 \${index + 1} fetch成功: \${response.status}\`);
  })
  .catch(error => {
    console.log(\`❌ 路径 \${index + 1} fetch失败: \${error.message}\`);
  });
  
  // 使用Image测试
  const img = new Image();
  img.onload = () => console.log(\`✅ 路径 \${index + 1} 图片加载成功\`);
  img.onerror = () => console.log(\`❌ 路径 \${index + 1} 图片加载失败\`);
  img.src = url;
});
  `);
}

// 运行测试
testCorsFinal();
