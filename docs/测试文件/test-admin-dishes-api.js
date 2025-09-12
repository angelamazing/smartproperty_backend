const axios = require('axios');

/**
 * 测试管理员菜品接口
 */

const BASE_URL = 'http://localhost:3000';

async function testAdminDishesAPI() {
  try {
    console.log('🧪 开始测试管理员菜品接口...');
    
    // 测试1: 健康检查
    console.log('\n📋 测试1: 健康检查');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ 服务健康检查成功:', healthResponse.data);
    } catch (error) {
      console.log('❌ 服务健康检查失败:', error.message);
      return;
    }
    
    // 测试2: 获取菜品列表（不需要认证）
    console.log('\n📋 测试2: 获取菜品列表（无认证）');
    try {
      const dishesResponse = await axios.get(`${BASE_URL}/api/admin/dishes?pageSize=100&status=active`);
      console.log('✅ 获取菜品列表成功:', dishesResponse.data);
    } catch (error) {
      if (error.response) {
        console.log('📊 响应状态:', error.response.status);
        console.log('📊 响应数据:', error.response.data);
        
        if (error.response.status === 401) {
          console.log('ℹ️ 需要认证，这是正常的');
        } else if (error.response.status === 500) {
          console.log('❌ 服务器内部错误，需要检查代码');
        }
      } else {
        console.log('❌ 请求失败:', error.message);
      }
    }
    
    // 测试3: 获取菜品分类
    console.log('\n📋 测试3: 获取菜品分类');
    try {
      const categoriesResponse = await axios.get(`${BASE_URL}/api/admin/dishes/categories`);
      console.log('✅ 获取菜品分类成功:', categoriesResponse.data);
    } catch (error) {
      if (error.response) {
        console.log('📊 响应状态:', error.response.status);
        console.log('📊 响应数据:', error.response.data);
      } else {
        console.log('❌ 请求失败:', error.message);
      }
    }
    
    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 等待服务启动
setTimeout(() => {
  testAdminDishesAPI();
}, 3000);

console.log('⏳ 等待3秒让服务启动...');
