const axios = require('axios');
const config = require('../config/database');

const BASE_URL = 'http://localhost:3000';

// 测试用的管理员Token（需要先登录获取）
let adminToken = '';

/**
 * 测试登录获取管理员Token
 */
async function loginAsAdmin() {
  try {
    console.log('🔐 登录获取管理员Token...');
    
    const response = await axios.post(`${BASE_URL}/api/auth/phone-password-login`, {
      phoneNumber: '13800138000', // 使用测试管理员账号
      password: '123456'
    });
    
    if (response.data.success) {
      adminToken = response.data.data.token;
      console.log('✅ 登录成功，Token获取完成');
      return true;
    } else {
      console.error('❌ 登录失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 登录请求失败:', error.message);
    return false;
  }
}

/**
 * 测试获取所有菜品列表
 */
async function testGetAllDishes() {
  try {
    console.log('\n📋 测试获取所有菜品列表...');
    
    const response = await axios.get(`${BASE_URL}/api/admin/dishes`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { page: 1, pageSize: 5 }
    });
    
    if (response.data.success) {
      console.log('✅ 获取菜品列表成功');
      console.log(`📊 总数: ${response.data.data.total}`);
      console.log('📋 菜品列表:');
      response.data.data.list.forEach((dish, index) => {
        console.log(`  ${index + 1}. ${dish.name} - 餐次: ${JSON.stringify(dish.meal_types)}`);
      });
      return true;
    } else {
      console.error('❌ 获取菜品列表失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * 测试按餐次类型获取菜品
 */
async function testGetDishesByMealType(mealType) {
  try {
    console.log(`\n🍽️ 测试获取${mealType}菜品...`);
    
    const response = await axios.get(`${BASE_URL}/api/admin/dishes/meal/${mealType}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { page: 1, pageSize: 10 }
    });
    
    if (response.data.success) {
      console.log(`✅ 获取${mealType}菜品成功`);
      console.log(`📊 总数: ${response.data.data.total}`);
      console.log('📋 菜品列表:');
      response.data.data.list.forEach((dish, index) => {
        console.log(`  ${index + 1}. ${dish.name} - 价格: ¥${dish.price}`);
      });
      return true;
    } else {
      console.error(`❌ 获取${mealType}菜品失败:`, response.data.message);
      return false;
    }
  } catch (error) {
    console.error(`❌ 请求失败:`, error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * 测试创建带餐次类型的菜品
 */
async function testCreateDishWithMealTypes() {
  try {
    console.log('\n➕ 测试创建带餐次类型的菜品...');
    
    const dishData = {
      name: '测试早餐菜品',
      categoryId: 'fb195e2c-ed19-4ee7-a169-5e4f2db2af33', // 使用现有分类ID
      description: '这是一个测试的早餐菜品',
      price: 15.50,
      mealTypes: ['breakfast'], // 只适用于早餐
      status: 'active',
      isRecommended: true
    };
    
    const response = await axios.post(`${BASE_URL}/api/admin/dishes`, dishData, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ 创建菜品成功');
      console.log('📋 菜品信息:', response.data.data);
      return response.data.data.id;
    } else {
      console.error('❌ 创建菜品失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * 测试更新菜品餐次类型
 */
async function testUpdateDishMealTypes(dishId) {
  try {
    console.log('\n✏️ 测试更新菜品餐次类型...');
    
    const updateData = {
      mealTypes: ['breakfast', 'lunch'], // 更新为早餐和午餐
      updateBy: 'test-admin'
    };
    
    const response = await axios.put(`${BASE_URL}/api/admin/dishes/${dishId}`, updateData, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ 更新菜品成功');
      console.log('📋 更新后信息:', response.data.data);
      return true;
    } else {
      console.error('❌ 更新菜品失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * 测试按餐次类型筛选菜品
 */
async function testFilterDishesByMealType() {
  try {
    console.log('\n🔍 测试按餐次类型筛选菜品...');
    
    const response = await axios.get(`${BASE_URL}/api/admin/dishes`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { 
        page: 1, 
        pageSize: 10,
        mealType: 'breakfast' // 只获取早餐菜品
      }
    });
    
    if (response.data.success) {
      console.log('✅ 按餐次类型筛选成功');
      console.log(`📊 早餐菜品总数: ${response.data.data.total}`);
      console.log('📋 早餐菜品列表:');
      response.data.data.list.forEach((dish, index) => {
        console.log(`  ${index + 1}. ${dish.name} - 餐次: ${JSON.stringify(dish.meal_types)}`);
      });
      return true;
    } else {
      console.error('❌ 按餐次类型筛选失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始测试菜品餐次类型功能...\n');
  
  // 1. 登录获取Token
  const loginSuccess = await loginAsAdmin();
  if (!loginSuccess) {
    console.error('❌ 无法获取管理员Token，测试终止');
    return;
  }
  
  // 2. 测试获取所有菜品
  await testGetAllDishes();
  
  // 3. 测试按餐次类型获取菜品
  await testGetDishesByMealType('breakfast');
  await testGetDishesByMealType('lunch');
  await testGetDishesByMealType('dinner');
  
  // 4. 测试创建带餐次类型的菜品
  const dishId = await testCreateDishWithMealTypes();
  if (dishId) {
    // 5. 测试更新菜品餐次类型
    await testUpdateDishMealTypes(dishId);
  }
  
  // 6. 测试按餐次类型筛选菜品
  await testFilterDishesByMealType();
  
  console.log('\n🎉 所有测试完成！');
}

// 运行测试
runTests().catch(console.error);
