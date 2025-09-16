const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  try {
    console.log('🚀 测试API接口...\n');
    
    // 测试健康检查
    console.log('1. 测试健康检查...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 健康检查:', healthResponse.data.message);
    
    // 测试菜品列表API（不需要认证的版本）
    console.log('\n2. 测试菜品列表API...');
    try {
      const dishesResponse = await axios.get(`${BASE_URL}/api/admin/dishes?page=1&pageSize=3`);
      console.log('✅ 菜品列表API响应成功');
      console.log('📊 数据:', JSON.stringify(dishesResponse.data, null, 2));
    } catch (error) {
      console.log('❌ 菜品列表API需要认证:', error.response?.data?.message || error.message);
    }
    
    // 测试按餐次类型获取菜品API
    console.log('\n3. 测试按餐次类型获取菜品API...');
    try {
      const mealResponse = await axios.get(`${BASE_URL}/api/admin/dishes/meal/breakfast?page=1&pageSize=3`);
      console.log('✅ 按餐次类型获取菜品API响应成功');
      console.log('📊 数据:', JSON.stringify(mealResponse.data, null, 2));
    } catch (error) {
      console.log('❌ 按餐次类型获取菜品API需要认证:', error.response?.data?.message || error.message);
    }
    
    console.log('\n🎉 API测试完成！');
    
  } catch (error) {
    console.error('❌ API测试失败:', error.message);
  }
}

// 运行测试
testAPI();
