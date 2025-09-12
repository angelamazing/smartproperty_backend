const http = require('http');

// 测试菜品接口
const testDishesAPI = () => {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/dishes?pageSize=100&status=active',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`状态码: ${res.statusCode}`);
    console.log(`响应头:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('响应数据:', data);
    });
  });

  req.on('error', (error) => {
    console.error('请求错误:', error.message);
  });

  req.end();
};

console.log('🧪 测试菜品接口...');
testDishesAPI();
