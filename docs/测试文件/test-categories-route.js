const http = require('http');

async function testCategoriesRoute() {
  console.log('🧪 测试菜品分类路由...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/dishes/categories',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`状态码: ${res.statusCode}`);
      console.log(`响应头:`, res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('响应数据:', response);
          
          if (res.statusCode === 200) {
            console.log('✅ 菜品分类接口测试成功');
          } else {
            console.log('❌ 菜品分类接口测试失败');
          }
          
          resolve({ statusCode: res.statusCode, data: response });
        } catch (parseError) {
          console.log('❌ 解析响应失败:', parseError.message);
          console.log('原始响应:', data);
          resolve({ statusCode: res.statusCode, rawData: data });
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ 请求错误:', error.message);
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      console.log('❌ 请求超时');
      req.destroy();
      reject(new Error('请求超时'));
    });
    
    req.end();
  });
}

// 运行测试
testCategoriesRoute()
  .then(result => {
    console.log('\n🎉 测试完成！');
    console.log('最终结果:', result);
  })
  .catch(error => {
    console.error('❌ 测试失败:', error.message);
  });
