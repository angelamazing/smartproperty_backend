const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testFixedAPI() {
  try {
    console.log('🔍 测试修复后的API接口...\n');
    
    // 测试健康检查
    console.log('1. 测试服务器状态...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 服务器状态:', healthResponse.data.message);
    
    // 测试菜品列表API
    console.log('\n2. 测试菜品列表API...');
    const dishesResponse = await axios.get(`${BASE_URL}/api/dishes?page=1&size=3`);
    
    if (dishesResponse.data.success) {
      console.log('✅ 菜品列表API响应成功');
      console.log('📊 返回菜品数量:', dishesResponse.data.data.list.length);
      
      // 检查第一个菜品是否包含meal_types字段
      const firstDish = dishesResponse.data.data.list[0];
      if (firstDish.meal_types) {
        console.log('✅ meal_types字段存在:', JSON.stringify(firstDish.meal_types));
      } else {
        console.log('❌ meal_types字段不存在');
      }
      
      // 显示所有字段
      console.log('\n📋 第一个菜品的字段:');
      Object.keys(firstDish).forEach(key => {
        console.log(`  - ${key}: ${JSON.stringify(firstDish[key])}`);
      });
      
    } else {
      console.log('❌ 菜品列表API响应失败:', dishesResponse.data.message);
    }
    
    // 测试管理员API（需要认证）
    console.log('\n3. 测试管理员API（无认证）...');
    try {
      const adminResponse = await axios.get(`${BASE_URL}/api/admin/dishes?page=1&pageSize=3`);
      console.log('✅ 管理员API响应成功（无需认证）');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('ℹ️ 管理员API需要认证（正常）');
      } else {
        console.log('❌ 管理员API错误:', error.response?.data?.message || error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testFixedAPI();
