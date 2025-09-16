/**
 * 菜品管理API测试工具
 * 用于测试菜品管理相关的API接口
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let adminToken = '';

// 测试用例配置
const testCases = {
  // 基础测试
  basic: {
    name: '基础功能测试',
    tests: [
      {
        name: '获取所有菜品列表',
        method: 'GET',
        url: '/api/admin/dishes',
        params: { page: 1, pageSize: 5 }
      },
      {
        name: '按餐次类型获取菜品 - 早餐',
        method: 'GET',
        url: '/api/admin/dishes/meal/breakfast',
        params: { page: 1, pageSize: 5 }
      },
      {
        name: '按餐次类型获取菜品 - 午餐',
        method: 'GET',
        url: '/api/admin/dishes/meal/lunch',
        params: { page: 1, pageSize: 5 }
      },
      {
        name: '按餐次类型获取菜品 - 晚餐',
        method: 'GET',
        url: '/api/admin/dishes/meal/dinner',
        params: { page: 1, pageSize: 5 }
      }
    ]
  },
  
  // 筛选测试
  filter: {
    name: '筛选功能测试',
    tests: [
      {
        name: '按餐次类型筛选 - 早餐',
        method: 'GET',
        url: '/api/admin/dishes',
        params: { mealType: 'breakfast', page: 1, pageSize: 5 }
      },
      {
        name: '按关键词搜索',
        method: 'GET',
        url: '/api/admin/dishes',
        params: { keyword: '包子', page: 1, pageSize: 5 }
      },
      {
        name: '按推荐状态筛选',
        method: 'GET',
        url: '/api/admin/dishes',
        params: { isRecommended: true, page: 1, pageSize: 5 }
      }
    ]
  },
  
  // 创建测试
  create: {
    name: '创建菜品测试',
    tests: [
      {
        name: '创建早餐菜品',
        method: 'POST',
        url: '/api/admin/dishes',
        data: {
          name: '测试早餐菜品',
          categoryId: '3e50e11e-3c9c-4a64-a575-8e931ad6b722',
          description: '这是一个测试的早餐菜品',
          price: 12.50,
          mealTypes: ['breakfast'],
          status: 'active',
          isRecommended: true
        }
      },
      {
        name: '创建午餐和晚餐菜品',
        method: 'POST',
        url: '/api/admin/dishes',
        data: {
          name: '测试正餐菜品',
          categoryId: '3e50e11e-3c9c-4a64-a575-8e931ad6b722',
          description: '这是一个测试的正餐菜品',
          price: 25.00,
          mealTypes: ['lunch', 'dinner'],
          status: 'active',
          isRecommended: false
        }
      },
      {
        name: '创建全餐次菜品',
        method: 'POST',
        url: '/api/admin/dishes',
        data: {
          name: '测试全餐次菜品',
          categoryId: '3e50e11e-3c9c-4a64-a575-8e931ad6b722',
          description: '这是一个适用于所有餐次的菜品',
          price: 18.00,
          mealTypes: ['breakfast', 'lunch', 'dinner'],
          status: 'active',
          isRecommended: true
        }
      }
    ]
  }
};

/**
 * 执行单个测试用例
 */
async function runTest(testCase) {
  try {
    console.log(`\n🧪 执行测试: ${testCase.name}`);
    
    const config = {
      method: testCase.method,
      url: `${BASE_URL}${testCase.url}`,
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (testCase.params) {
      config.params = testCase.params;
    }
    
    if (testCase.data) {
      config.data = testCase.data;
    }
    
    const response = await axios(config);
    
    if (response.data.success) {
      console.log(`✅ ${testCase.name} - 成功`);
      
      // 显示关键数据
      if (response.data.data && response.data.data.list) {
        console.log(`   📊 返回 ${response.data.data.list.length} 条记录`);
        if (response.data.data.list.length > 0) {
          const firstItem = response.data.data.list[0];
          console.log(`   📋 示例: ${firstItem.name} - 餐次: ${JSON.stringify(firstItem.meal_types)}`);
        }
      } else if (response.data.data && response.data.data.id) {
        console.log(`   📋 创建成功: ${response.data.data.name} - 餐次: ${JSON.stringify(response.data.data.mealTypes)}`);
      }
      
      return { success: true, data: response.data };
    } else {
      console.log(`❌ ${testCase.name} - 失败: ${response.data.message}`);
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    console.log(`❌ ${testCase.name} - 错误: ${error.response?.data?.message || error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 执行测试套件
 */
async function runTestSuite(suiteName) {
  const suite = testCases[suiteName];
  if (!suite) {
    console.log(`❌ 测试套件 ${suiteName} 不存在`);
    return;
  }
  
  console.log(`\n🚀 开始执行测试套件: ${suite.name}`);
  console.log('='.repeat(50));
  
  const results = [];
  for (const testCase of suite.tests) {
    const result = await runTest(testCase);
    results.push({ ...testCase, result });
    
    // 等待1秒避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 统计结果
  const successCount = results.filter(r => r.result.success).length;
  const totalCount = results.length;
  
  console.log('\n📊 测试结果统计:');
  console.log(`✅ 成功: ${successCount}/${totalCount}`);
  console.log(`❌ 失败: ${totalCount - successCount}/${totalCount}`);
  
  return results;
}

/**
 * 获取管理员Token（模拟登录）
 */
async function getAdminToken() {
  try {
    console.log('🔐 获取管理员Token...');
    
    // 这里需要根据实际的登录接口调整
    const response = await axios.post(`${BASE_URL}/api/auth/phone-password-login`, {
      phoneNumber: '13800138000',
      password: '123456'
    });
    
    if (response.data.success) {
      adminToken = response.data.data.token;
      console.log('✅ Token获取成功');
      return true;
    } else {
      console.log('❌ Token获取失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ 登录失败:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * 显示API使用示例
 */
function showAPIExamples() {
  console.log('\n📚 API使用示例:');
  console.log('='.repeat(50));
  
  console.log('\n1. 获取早餐菜品:');
  console.log('GET /api/admin/dishes/meal/breakfast?page=1&pageSize=10');
  
  console.log('\n2. 创建菜品:');
  console.log('POST /api/admin/dishes');
  console.log(JSON.stringify({
    name: "宫保鸡丁",
    categoryId: "cat-001",
    price: 25.50,
    mealTypes: ["lunch", "dinner"]
  }, null, 2));
  
  console.log('\n3. 按餐次筛选:');
  console.log('GET /api/admin/dishes?mealType=breakfast&keyword=包子');
  
  console.log('\n4. 更新菜品餐次类型:');
  console.log('PUT /api/admin/dishes/dish-001');
  console.log(JSON.stringify({
    mealTypes: ["breakfast", "lunch", "dinner"]
  }, null, 2));
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 菜品管理API测试工具');
  console.log('='.repeat(50));
  
  // 检查服务器状态
  try {
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 服务器状态正常:', healthResponse.data.message);
  } catch (error) {
    console.log('❌ 服务器连接失败:', error.message);
    return;
  }
  
  // 获取Token
  const tokenSuccess = await getAdminToken();
  if (!tokenSuccess) {
    console.log('❌ 无法获取管理员Token，测试终止');
    return;
  }
  
  // 显示使用示例
  showAPIExamples();
  
  // 执行测试
  console.log('\n🧪 开始执行测试...');
  
  // 基础功能测试
  await runTestSuite('basic');
  
  // 筛选功能测试
  await runTestSuite('filter');
  
  // 创建功能测试
  await runTestSuite('create');
  
  console.log('\n🎉 所有测试完成！');
  console.log('\n💡 提示: 如果测试失败，请检查:');
  console.log('1. 服务器是否正常运行');
  console.log('2. 数据库连接是否正常');
  console.log('3. 管理员账号是否正确');
  console.log('4. API接口是否已正确部署');
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runTest,
  runTestSuite,
  getAdminToken,
  showAPIExamples
};
