/**
 * 测试API CORS修复
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testCorsAPI() {
  console.log('🧪 开始测试API CORS修复...\n');

  try {
    // 1. 测试OPTIONS预检请求
    console.log('1️⃣ 测试OPTIONS预检请求...');
    
    try {
      const optionsResponse = await axios.options(`${BASE_URL}/api/auth/test-login-sys-admin`, {
        headers: {
          'Origin': 'http://localhost:5175',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });
      
      console.log('✅ OPTIONS预检请求成功');
      console.log('   - 状态码:', optionsResponse.status);
      console.log('   - CORS头:', optionsResponse.headers['access-control-allow-origin']);
      console.log('   - 允许的方法:', optionsResponse.headers['access-control-allow-methods']);
      console.log('   - 允许的头:', optionsResponse.headers['access-control-allow-headers']);
    } catch (error) {
      console.log('❌ OPTIONS预检请求失败:', error.message);
      if (error.response) {
        console.log('   - 响应状态:', error.response.status);
        console.log('   - 响应头:', error.response.headers);
      }
    }

    // 2. 测试实际API请求
    console.log('\n2️⃣ 测试实际API请求...');
    
    try {
      const apiResponse = await axios.post(`${BASE_URL}/api/auth/test-login-sys-admin`, {
        username: 'testuser',
        password: 'testpass123'
      }, {
        headers: {
          'Origin': 'http://localhost:5175',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ API请求成功');
      console.log('   - 状态码:', apiResponse.status);
      console.log('   - CORS头:', apiResponse.headers['access-control-allow-origin']);
      console.log('   - 响应数据:', apiResponse.data.success ? '成功' : '失败');
    } catch (error) {
      console.log('❌ API请求失败:', error.message);
      if (error.response) {
        console.log('   - 响应状态:', error.response.status);
        console.log('   - 响应头:', error.response.headers);
        console.log('   - 响应数据:', error.response.data);
      }
    }

    // 3. 测试不同来源
    console.log('\n3️⃣ 测试不同来源...');
    const origins = [
      'http://localhost:5175',
      'http://localhost:5173',
      'http://localhost:8080',
      'http://127.0.0.1:5175'
    ];
    
    for (const origin of origins) {
      try {
        const response = await axios.options(`${BASE_URL}/api/auth/test-login-sys-admin`, {
          headers: {
            'Origin': origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization'
          }
        });
        
        console.log(`✅ ${origin} OPTIONS请求成功`);
      } catch (error) {
        console.log(`❌ ${origin} OPTIONS请求失败:`, error.message);
      }
    }

    // 4. 测试头像访问
    console.log('\n4️⃣ 测试头像访问...');
    
    try {
      const avatarResponse = await axios.get(`${BASE_URL}/avatar/avatar_1756687222017_hsnganr3o.png`, {
        responseType: 'arraybuffer',
        headers: {
          'Origin': 'http://localhost:5175'
        }
      });
      
      console.log('✅ 头像访问成功');
      console.log('   - 状态码:', avatarResponse.status);
      console.log('   - CORS头:', avatarResponse.headers['access-control-allow-origin']);
      console.log('   - 内容类型:', avatarResponse.headers['content-type']);
    } catch (error) {
      console.log('❌ 头像访问失败:', error.message);
    }

    // 5. 浏览器测试指导
    console.log('\n5️⃣ 浏览器测试指导');
    console.log('请在浏览器控制台中运行以下代码测试:');
    console.log(`
// 测试API请求
fetch('${BASE_URL}/api/auth/test-login-sys-admin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'http://localhost:5175'
  },
  body: JSON.stringify({
    username: 'testuser',
    password: 'testpass123'
  })
})
.then(response => {
  console.log('✅ API请求成功:', response.status);
  return response.json();
})
.then(data => console.log('✅ 响应数据:', data))
.catch(error => console.log('❌ API请求失败:', error));

// 测试头像加载
const img = new Image();
img.onload = () => console.log('✅ 头像加载成功');
img.onerror = () => console.log('❌ 头像加载失败');
img.src = '${BASE_URL}/avatar/avatar_1756687222017_hsnganr3o.png';
    `);

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testCorsAPI();
