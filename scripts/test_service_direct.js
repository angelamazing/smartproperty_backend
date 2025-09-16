const mysql = require('mysql2/promise');
const config = require('../config/database');
const adminService = require('../services/adminService');

async function testServiceDirect() {
  let connection;
  
  try {
    console.log('🚀 直接测试服务层函数...\n');
    
    // 创建数据库连接池
    const dbPool = mysql.createPool(config.database);
    console.log('✅ 数据库连接池创建成功');
    
    // 模拟req.db
    const mockReq = { db: dbPool };
    
    // 测试getDishes服务函数
    console.log('📋 测试getDishes服务函数...');
    const result = await adminService.getDishes(mockReq.db, {
      page: 1,
      pageSize: 3,
      filters: {}
    });
    
    console.log('📊 服务层返回结果:');
    console.log('总数:', result.total);
    console.log('菜品列表:');
    result.list.forEach((dish, index) => {
      console.log(`\n${index + 1}. ${dish.name}:`);
      console.log(`   - 价格: ¥${dish.price}`);
      console.log(`   - 分类: ${dish.category_name}`);
      console.log(`   - 餐次类型: ${JSON.stringify(dish.meal_types)}`);
      console.log(`   - 推荐: ${dish.isRecommended ? '是' : '否'}`);
    });
    
    // 测试getDishesByMealType服务函数
    console.log('\n🍽️ 测试getDishesByMealType服务函数...');
    const mealResult = await adminService.getDishesByMealType(mockReq.db, {
      mealType: 'breakfast',
      page: 1,
      pageSize: 3,
      filters: {}
    });
    
    console.log('📊 按餐次类型查询结果:');
    console.log('总数:', mealResult.total);
    console.log('餐次类型:', mealResult.mealType);
    console.log('菜品列表:');
    mealResult.list.forEach((dish, index) => {
      console.log(`\n${index + 1}. ${dish.name}:`);
      console.log(`   - 价格: ¥${dish.price}`);
      console.log(`   - 餐次类型: ${JSON.stringify(dish.meal_types)}`);
    });
    
    console.log('\n🎉 服务层测试完成！');
    
  } catch (error) {
    console.error('❌ 服务层测试失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行测试
testServiceDirect();
