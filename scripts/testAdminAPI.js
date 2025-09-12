const axios = require('axios');
const config = require('../config/database');
const logger = require('../utils/logger');

/**
 * 管理员系统接口测试脚本
 * 测试所有管理员相关的API接口
 */

// 测试配置
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
  
  // 测试用户凭据
  testAdmin: {
    phoneNumber: '13800000001',
    password: 'admin123'
  },
  
  testUser: {
    phoneNumber: '13800000002', 
    password: 'admin123'
  }
};

// HTTP客户端
const apiClient = axios.create({
  baseURL: TEST_CONFIG.baseURL,
  timeout: TEST_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 测试状态
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

let adminToken = null;
let userToken = null;

/**
 * 测试工具函数
 */
class TestHelper {
  static async test(name, testFunction) {
    testResults.total++;
    console.log(`\n🧪 测试: ${name}`);
    
    try {
      await testFunction();
      testResults.passed++;
      console.log(`✅ 通过: ${name}`);
    } catch (error) {
      testResults.failed++;
      testResults.errors.push({
        test: name,
        error: error.message,
        details: error.response?.data || error.stack
      });
      console.error(`❌ 失败: ${name}`);
      console.error(`   错误: ${error.message}`);
      if (error.response?.data) {
        console.error(`   响应: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  }

  static setAuthToken(token) {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  }

  static async assertResponse(response, expectedStatus = 200) {
    if (response.status !== expectedStatus) {
      throw new Error(`期望状态码 ${expectedStatus}，实际 ${response.status}`);
    }

    const data = response.data;
    if (!data.success && expectedStatus < 400) {
      throw new Error(`接口返回失败: ${data.message}`);
    }

    return data;
  }

  static async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 1. 认证相关测试
 */
async function testAuthentication() {
  console.log('\n📋 === 认证相关测试 ===');

  // 测试管理员登录
  await TestHelper.test('管理员登录', async () => {
    const response = await apiClient.post('/auth/login', {
      phoneNumber: TEST_CONFIG.testAdmin.phoneNumber,
      password: TEST_CONFIG.testAdmin.password
    });

    const data = await TestHelper.assertResponse(response);
    if (!data.data.token) {
      throw new Error('登录响应中缺少token');
    }

    adminToken = data.data.token;
    console.log(`   管理员Token获取成功: ${adminToken.substring(0, 20)}...`);
  });

  // 测试普通用户登录
  await TestHelper.test('普通管理员登录', async () => {
    const response = await apiClient.post('/auth/login', {
      phoneNumber: TEST_CONFIG.testUser.phoneNumber,
      password: TEST_CONFIG.testUser.password
    });

    const data = await TestHelper.assertResponse(response);
    if (!data.data.token) {
      throw new Error('登录响应中缺少token');
    }

    userToken = data.data.token;
    console.log(`   普通管理员Token获取成功: ${userToken.substring(0, 20)}...`);
  });

  // 测试无权限访问
  await TestHelper.test('无权限访问管理员接口', async () => {
    TestHelper.setAuthToken(null);
    
    try {
      await apiClient.get('/admin/system-stats');
      throw new Error('应该返回401错误');
    } catch (error) {
      if (error.response?.status !== 401) {
        throw new Error(`期望401错误，实际 ${error.response?.status}`);
      }
    }
  });
}

/**
 * 2. 系统统计测试
 */
async function testSystemStats() {
  console.log('\n📊 === 系统统计测试 ===');
  TestHelper.setAuthToken(adminToken);

  await TestHelper.test('获取系统统计数据', async () => {
    const response = await apiClient.get('/admin/system-stats');
    const data = await TestHelper.assertResponse(response);
    
    if (!data.data || typeof data.data.totalUsers === 'undefined') {
      throw new Error('系统统计数据格式错误');
    }
    
    console.log(`   总用户数: ${data.data.totalUsers}`);
    console.log(`   今日订单: ${data.data.todayOrders}`);
    console.log(`   总场地数: ${data.data.totalVenues}`);
  });

  await TestHelper.test('获取系统状态', async () => {
    const response = await apiClient.get('/admin/system/status');
    const data = await TestHelper.assertResponse(response);
    
    if (!data.data || !data.data.status) {
      throw new Error('系统状态数据格式错误');
    }
    
    console.log(`   API状态: ${data.data.status.apiStatus ? '正常' : '异常'}`);
    console.log(`   数据库状态: ${data.data.status.dbStatus ? '正常' : '异常'}`);
  });
}

/**
 * 3. 用户管理测试
 */
async function testUserManagement() {
  console.log('\n👥 === 用户管理测试 ===');
  TestHelper.setAuthToken(adminToken);

  let createdUserId = null;

  await TestHelper.test('获取用户列表', async () => {
    const response = await apiClient.get('/admin/users?page=1&pageSize=10');
    const data = await TestHelper.assertResponse(response);
    
    if (!data.data || !Array.isArray(data.data.list)) {
      throw new Error('用户列表数据格式错误');
    }
    
    console.log(`   用户总数: ${data.data.total}`);
    console.log(`   当前页用户数: ${data.data.list.length}`);
  });

  await TestHelper.test('创建用户', async () => {
    const newUser = {
      realName: '测试用户',
      phoneNumber: `138${Date.now().toString().slice(-8)}`, // 生成唯一手机号
      email: 'test@example.com',
      password: 'test123',
      role: 'user',
      status: 'active',
      department: '技术部'
    };

    const response = await apiClient.post('/admin/users', newUser);
    const data = await TestHelper.assertResponse(response);
    
    if (!data.data || !data.data.id) {
      throw new Error('创建用户响应格式错误');
    }
    
    createdUserId = data.data.id;
    console.log(`   创建用户ID: ${createdUserId}`);
  });

  if (createdUserId) {
    await TestHelper.test('获取用户详情', async () => {
      const response = await apiClient.get(`/admin/users/${createdUserId}`);
      const data = await TestHelper.assertResponse(response);
      
      if (!data.data || data.data.id !== createdUserId) {
        throw new Error('用户详情数据错误');
      }
      
      console.log(`   用户姓名: ${data.data.realName}`);
      console.log(`   用户角色: ${data.data.role}`);
    });

    await TestHelper.test('更新用户状态', async () => {
      const response = await apiClient.put(`/admin/users/${createdUserId}/status`, {
        status: 'inactive',
        reason: '测试用户状态更新'
      });
      
      await TestHelper.assertResponse(response);
      console.log(`   用户状态已更新为 inactive`);
    });

    await TestHelper.test('删除用户', async () => {
      const response = await apiClient.delete(`/admin/users/${createdUserId}`);
      await TestHelper.assertResponse(response);
      console.log(`   用户已删除`);
    });
  }
}

/**
 * 4. 菜品管理测试
 */
async function testDishManagement() {
  console.log('\n🍽️ === 菜品管理测试 ===');
  TestHelper.setAuthToken(adminToken);

  let categoryId = null;
  let dishId = null;

  await TestHelper.test('获取菜品分类', async () => {
    const response = await apiClient.get('/admin/dishes/categories');
    const data = await TestHelper.assertResponse(response);
    
    if (!Array.isArray(data.data)) {
      throw new Error('菜品分类数据格式错误');
    }
    
    if (data.data.length > 0) {
      categoryId = data.data[0]._id;
      console.log(`   分类总数: ${data.data.length}`);
      console.log(`   第一个分类: ${data.data[0].name}`);
    }
  });

  if (categoryId) {
    await TestHelper.test('创建菜品', async () => {
      const newDish = {
        name: '测试菜品',
        categoryId: categoryId,
        description: '这是一个测试菜品',
        price: 15.80,
        calories: 250,
        protein: 20,
        fat: 10,
        carbohydrate: 30,
        tags: ['测试', '美味'],
        status: 'active',
        isRecommended: false
      };

      const response = await apiClient.post('/admin/dishes', newDish);
      const data = await TestHelper.assertResponse(response);
      
      if (!data.data || !data.data.id) {
        throw new Error('创建菜品响应格式错误');
      }
      
      dishId = data.data.id;
      console.log(`   创建菜品ID: ${dishId}`);
    });
  }

  await TestHelper.test('获取菜品列表', async () => {
    const response = await apiClient.get('/admin/dishes?page=1&pageSize=10');
    const data = await TestHelper.assertResponse(response);
    
    if (!data.data || !Array.isArray(data.data.list)) {
      throw new Error('菜品列表数据格式错误');
    }
    
    console.log(`   菜品总数: ${data.data.total}`);
  });

  if (dishId) {
    await TestHelper.test('更新菜品状态', async () => {
      const response = await apiClient.put(`/admin/dishes/${dishId}/status`, {
        status: 'inactive'
      });
      
      await TestHelper.assertResponse(response);
      console.log(`   菜品状态已更新为 inactive`);
    });

    await TestHelper.test('删除菜品', async () => {
      const response = await apiClient.delete(`/admin/dishes/${dishId}`);
      await TestHelper.assertResponse(response);
      console.log(`   菜品已删除`);
    });
  }
}

/**
 * 5. 场地管理测试
 */
async function testVenueManagement() {
  console.log('\n🏟️ === 场地管理测试 ===');
  TestHelper.setAuthToken(adminToken);

  let venueId = null;

  await TestHelper.test('获取场地列表', async () => {
    const response = await apiClient.get('/admin/venues?page=1&pageSize=10');
    const data = await TestHelper.assertResponse(response);
    
    if (!data.data || !Array.isArray(data.data.list)) {
      throw new Error('场地列表数据格式错误');
    }
    
    console.log(`   场地总数: ${data.data.total}`);
    
    if (data.data.list.length > 0) {
      venueId = data.data.list[0]._id;
      console.log(`   第一个场地: ${data.data.list[0].name}`);
    }
  });

  await TestHelper.test('创建场地', async () => {
    const newVenue = {
      name: '测试会议室',
      type: 'meeting',
      description: '测试会议室，用于接口测试',
      location: '测试楼层',
      capacity: 10,
      pricePerHour: 100,
      features: ['投影仪', '白板', '空调'],
      openTime: '08:00',
      closeTime: '18:00',
      workingDays: [1, 2, 3, 4, 5],
      advanceBookingDays: 7,
      minBookingHours: 1,
      maxBookingHours: 4,
      requireApproval: true,
      allowCancellation: true,
      status: 'active'
    };

    const response = await apiClient.post('/admin/venues', newVenue);
    const data = await TestHelper.assertResponse(response);
    
    if (!data.data || !data.data.id) {
      throw new Error('创建场地响应格式错误');
    }
    
    const createdVenueId = data.data.id;
    console.log(`   创建场地ID: ${createdVenueId}`);
  });

  if (venueId) {
    await TestHelper.test('获取场地时间安排', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiClient.get(`/admin/venues/${venueId}/schedule?date=${today}`);
      const data = await TestHelper.assertResponse(response);
      
      if (!Array.isArray(data.data)) {
        throw new Error('场地时间安排数据格式错误');
      }
      
      console.log(`   时间段数量: ${data.data.length}`);
    });
  }
}

/**
 * 6. 菜单管理测试
 */
async function testMenuManagement() {
  console.log('\n📋 === 菜单管理测试 ===');
  TestHelper.setAuthToken(adminToken);

  await TestHelper.test('保存菜单草稿', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];

    const menuDraft = {
      date: date,
      mealType: 'lunch',
      description: '测试菜单',
      dishes: [
        {
          dishId: 'test_dish_1',
          name: '测试菜品1',
          category: '热菜',
          price: 18.00
        }
      ]
    };

    const response = await apiClient.post('/admin/menu/draft', menuDraft);
    const data = await TestHelper.assertResponse(response);
    
    console.log(`   草稿菜单日期: ${data.data.date}`);
    console.log(`   餐次类型: ${data.data.mealType}`);
  });

  await TestHelper.test('获取菜单历史', async () => {
    const response = await apiClient.get('/admin/menu/history?page=1&pageSize=5');
    const data = await TestHelper.assertResponse(response);
    
    if (!data.data || !Array.isArray(data.data.list)) {
      throw new Error('菜单历史数据格式错误');
    }
    
    console.log(`   菜单历史总数: ${data.data.total}`);
  });

  await TestHelper.test('获取菜单模板', async () => {
    const response = await apiClient.get('/admin/menu/templates');
    const data = await TestHelper.assertResponse(response);
    
    if (!Array.isArray(data.data)) {
      throw new Error('菜单模板数据格式错误');
    }
    
    console.log(`   模板数量: ${data.data.length}`);
  });
}

/**
 * 7. 预约管理测试
 */
async function testReservationManagement() {
  console.log('\n📅 === 预约管理测试 ===');
  TestHelper.setAuthToken(adminToken);

  await TestHelper.test('获取预约列表', async () => {
    const response = await apiClient.get('/admin/reservations?page=1&pageSize=10');
    const data = await TestHelper.assertResponse(response);
    
    if (!data.data || !Array.isArray(data.data.list)) {
      throw new Error('预约列表数据格式错误');
    }
    
    console.log(`   预约总数: ${data.data.total}`);
  });
}

/**
 * 8. 系统配置测试
 */
async function testSystemConfig() {
  console.log('\n⚙️ === 系统配置测试 ===');
  TestHelper.setAuthToken(adminToken);

  await TestHelper.test('获取系统配置', async () => {
    const response = await apiClient.get('/admin/system/config');
    const data = await TestHelper.assertResponse(response);
    
    if (!data.data || typeof data.data !== 'object') {
      throw new Error('系统配置数据格式错误');
    }
    
    console.log(`   配置项数量: ${Object.keys(data.data).length}`);
  });

  await TestHelper.test('获取验证方案', async () => {
    const response = await apiClient.get('/admin/system/verification-schemes');
    const data = await TestHelper.assertResponse(response);
    
    if (!Array.isArray(data.data)) {
      throw new Error('验证方案数据格式错误');
    }
    
    console.log(`   验证方案数量: ${data.data.length}`);
  });
}

/**
 * 9. 数据统计测试
 */
async function testDataStats() {
  console.log('\n📊 === 数据统计测试 ===');
  TestHelper.setAuthToken(adminToken);

  await TestHelper.test('获取综合统计', async () => {
    const response = await apiClient.get('/admin/stats/overall');
    const data = await TestHelper.assertResponse(response);
    
    if (!data.data || typeof data.data.totalUsers === 'undefined') {
      throw new Error('综合统计数据格式错误');
    }
    
    console.log(`   用户统计: ${data.data.totalUsers}`);
    console.log(`   订单统计: ${data.data.totalOrders}`);
  });

  await TestHelper.test('获取用餐统计', async () => {
    const response = await apiClient.get('/admin/stats/dining');
    const data = await TestHelper.assertResponse(response);
    
    if (!data.data || typeof data.data.todayCount === 'undefined') {
      throw new Error('用餐统计数据格式错误');
    }
    
    console.log(`   今日用餐: ${data.data.todayCount}`);
    console.log(`   本周用餐: ${data.data.weekCount}`);
  });
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始管理员系统API测试...\n');
  console.log(`测试目标: ${TEST_CONFIG.baseURL}`);
  
  const startTime = Date.now();
  
  try {
    // 运行所有测试
    await testAuthentication();
    await testSystemStats();
    await testUserManagement();
    await testDishManagement();
    await testVenueManagement();
    await testMenuManagement();
    await testReservationManagement();
    await testSystemConfig();
    await testDataStats();
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生严重错误:', error.message);
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // 输出测试结果
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));
  console.log(`总测试数: ${testResults.total}`);
  console.log(`通过数量: ${testResults.passed} ✅`);
  console.log(`失败数量: ${testResults.failed} ❌`);
  console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  console.log(`测试耗时: ${duration}秒`);
  
  if (testResults.errors.length > 0) {
    console.log('\n🔍 失败详情:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}`);
      console.log(`   错误: ${error.error}`);
      if (error.details) {
        console.log(`   详情: ${JSON.stringify(error.details, null, 2)}`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  // 设置退出码
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

// 运行测试
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  TestHelper,
  TEST_CONFIG
};
