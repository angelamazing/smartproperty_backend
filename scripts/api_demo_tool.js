/**
 * 菜品管理API演示工具
 * 展示API接口的使用方法和响应格式
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

/**
 * 显示API接口文档
 */
function showAPIDocumentation() {
  console.log('📚 菜品管理API接口文档');
  console.log('='.repeat(60));
  
  console.log('\n🔗 基础信息:');
  console.log('基础URL: http://your-domain.com/api/admin/dishes');
  console.log('认证方式: Bearer Token');
  console.log('数据格式: JSON');
  
  console.log('\n📋 核心接口:');
  console.log('='.repeat(40));
  
  console.log('\n1. 获取菜品列表（支持餐次筛选）');
  console.log('GET /api/admin/dishes?mealType=breakfast&page=1&pageSize=10');
  console.log('参数:');
  console.log('  - mealType: 餐次类型 (breakfast/lunch/dinner)');
  console.log('  - page: 页码 (默认1)');
  console.log('  - pageSize: 每页数量 (默认20)');
  console.log('  - keyword: 搜索关键词');
  console.log('  - categoryId: 分类ID');
  console.log('  - status: 状态筛选');
  
  console.log('\n2. 按餐次类型获取菜品');
  console.log('GET /api/admin/dishes/meal/breakfast?page=1&pageSize=10');
  console.log('路径参数:');
  console.log('  - breakfast: 早餐');
  console.log('  - lunch: 午餐');
  console.log('  - dinner: 晚餐');
  
  console.log('\n3. 创建菜品');
  console.log('POST /api/admin/dishes');
  console.log('请求体示例:');
  console.log(JSON.stringify({
    name: "宫保鸡丁",
    categoryId: "cat-001",
    description: "经典川菜，麻辣鲜香",
    price: 25.50,
    mealTypes: ["lunch", "dinner"],
    status: "active",
    isRecommended: true
  }, null, 2));
  
  console.log('\n4. 更新菜品');
  console.log('PUT /api/admin/dishes/:dishId');
  console.log('请求体示例:');
  console.log(JSON.stringify({
    name: "宫保鸡丁（更新）",
    mealTypes: ["breakfast", "lunch", "dinner"],
    price: 28.00
  }, null, 2));
  
  console.log('\n🍽️ 餐次类型说明:');
  console.log('='.repeat(40));
  console.log('breakfast: 早餐 - 包子、粥类、豆浆等');
  console.log('lunch: 午餐 - 正餐、热菜、汤品等');
  console.log('dinner: 晚餐 - 正餐、热菜、汤品等');
  
  console.log('\n💻 前端代码示例:');
  console.log('='.repeat(40));
  
  console.log('\n// 获取早餐菜品');
  console.log('const getBreakfastDishes = async () => {');
  console.log('  const response = await fetch(\'/api/admin/dishes/meal/breakfast\', {');
  console.log('    headers: { \'Authorization\': `Bearer ${token}` }');
  console.log('  });');
  console.log('  return response.json();');
  console.log('};');
  
  console.log('\n// 创建菜品');
  console.log('const createDish = async (dishData) => {');
  console.log('  const response = await fetch(\'/api/admin/dishes\', {');
  console.log('    method: \'POST\',');
  console.log('    headers: {');
  console.log('      \'Authorization\': `Bearer ${token}`');
  console.log('      \'Content-Type\': \'application/json\'');
  console.log('    },');
  console.log('    body: JSON.stringify(dishData)');
  console.log('  });');
  console.log('  return response.json();');
  console.log('};');
  
  console.log('\n// 更新菜品餐次类型');
  console.log('const updateDishMealTypes = async (dishId, mealTypes) => {');
  console.log('  const response = await fetch(`/api/admin/dishes/${dishId}`, {');
  console.log('    method: \'PUT\',');
  console.log('    headers: {');
  console.log('      \'Authorization\': `Bearer ${token}`');
  console.log('      \'Content-Type\': \'application/json\'');
  console.log('    },');
  console.log('    body: JSON.stringify({ mealTypes })');
  console.log('  });');
  console.log('  return response.json();');
  console.log('};');
}

/**
 * 显示响应数据格式
 */
function showResponseFormat() {
  console.log('\n📊 响应数据格式:');
  console.log('='.repeat(40));
  
  console.log('\n1. 菜品列表响应:');
  console.log(JSON.stringify({
    success: true,
    message: "获取菜品列表成功",
    data: {
      list: [
        {
          _id: "dish-001",
          name: "小笼包",
          description: "经典上海小笼包，皮薄馅大",
          price: "8.00",
          categoryId: "cat-001",
          categoryName: "汤类",
          image: "https://example.com/xiaolongbao.jpg",
          calories: 200,
          protein: "8.50",
          fat: "5.20",
          carbohydrate: "25.00",
          tags: ["经典", "上海"],
          status: "active",
          isRecommended: 1,
          meal_types: ["breakfast"],
          createTime: "2025-09-16T01:04:11.000Z",
          updateTime: "2025-09-16T01:04:11.000Z",
          createBy: "admin-001"
        }
      ],
      pagination: {
        page: 1,
        size: 20,
        total: 15,
        totalPages: 1
      }
    }
  }, null, 2));
  
  console.log('\n2. 按餐次类型获取菜品响应:');
  console.log(JSON.stringify({
    success: true,
    message: "获取早餐菜品列表成功",
    data: {
      list: [
        {
          _id: "dish-001",
          name: "小笼包",
          price: "8.00",
          meal_types: ["breakfast"],
          isRecommended: 1,
          categoryName: "汤类"
        }
      ],
      total: 5,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      mealType: "breakfast"
    }
  }, null, 2));
  
  console.log('\n3. 创建菜品响应:');
  console.log(JSON.stringify({
    success: true,
    message: "创建菜品成功",
    data: {
      id: "dish-002",
      name: "宫保鸡丁",
      price: 25.50,
      status: "active",
      mealTypes: ["lunch", "dinner"]
    }
  }, null, 2));
}

/**
 * 显示错误处理
 */
function showErrorHandling() {
  console.log('\n⚠️ 错误处理:');
  console.log('='.repeat(40));
  
  console.log('\n常见错误码:');
  console.log('400 - 参数验证失败');
  console.log('401 - 缺少访问令牌');
  console.log('403 - 权限不足');
  console.log('404 - 菜品不存在');
  console.log('500 - 服务器内部错误');
  
  console.log('\n错误响应格式:');
  console.log(JSON.stringify({
    success: false,
    message: "错误描述",
    error: "详细错误信息"
  }, null, 2));
  
  console.log('\n前端错误处理示例:');
  console.log('try {');
  console.log('  const response = await fetch(\'/api/admin/dishes\', {');
  console.log('    headers: { \'Authorization\': `Bearer ${token}` }');
  console.log('  });');
  console.log('  const data = await response.json();');
  console.log('  ');
  console.log('  if (data.success) {');
  console.log('    console.log(\'成功:\', data.data);');
  console.log('  } else {');
  console.log('    console.error(\'错误:\', data.message);');
  console.log('  }');
  console.log('} catch (error) {');
  console.log('  console.error(\'请求失败:\', error.message);');
  console.log('}');
}

/**
 * 测试服务器连接
 */
async function testServerConnection() {
  try {
    console.log('\n🔍 测试服务器连接...');
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 服务器连接正常:', response.data.message);
    return true;
  } catch (error) {
    console.log('❌ 服务器连接失败:', error.message);
    return false;
  }
}

/**
 * 显示使用建议
 */
function showUsageTips() {
  console.log('\n💡 使用建议:');
  console.log('='.repeat(40));
  
  console.log('\n1. 餐次类型验证:');
  console.log('   - 确保 mealTypes 数组中的值都是有效的');
  console.log('   - 支持的值: ["breakfast", "lunch", "dinner"]');
  
  console.log('\n2. 价格格式:');
  console.log('   - 价格字段为数字类型，不要传字符串');
  console.log('   - 示例: price: 25.50 (正确)');
  console.log('   - 示例: price: "25.50" (错误)');
  
  console.log('\n3. 分页处理:');
  console.log('   - 建议实现分页组件处理大量数据');
  console.log('   - 默认每页20条，最大100条');
  
  console.log('\n4. 错误处理:');
  console.log('   - 实现统一的错误处理机制');
  console.log('   - 根据错误码显示相应的用户提示');
  
  console.log('\n5. 用户体验:');
  console.log('   - 提供餐次类型的可视化选择界面');
  console.log('   - 考虑对菜品列表进行适当缓存');
  console.log('   - 实现加载状态和错误状态提示');
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 菜品管理API演示工具');
  console.log('='.repeat(60));
  
  // 测试服务器连接
  const serverOk = await testServerConnection();
  if (!serverOk) {
    console.log('\n❌ 服务器连接失败，无法进行演示');
    return;
  }
  
  // 显示API文档
  showAPIDocumentation();
  
  // 显示响应格式
  showResponseFormat();
  
  // 显示错误处理
  showErrorHandling();
  
  // 显示使用建议
  showUsageTips();
  
  console.log('\n🎉 演示完成！');
  console.log('\n📝 更多详细信息请查看:');
  console.log('- 菜品管理API接口文档.md');
  console.log('- 菜品管理API快速对接指南.md');
}

// 运行演示
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  showAPIDocumentation,
  showResponseFormat,
  showErrorHandling,
  showUsageTips,
  testServerConnection
};
