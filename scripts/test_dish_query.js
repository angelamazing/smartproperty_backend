const mysql = require('mysql2/promise');
const config = require('../config/database');

async function testDishQuery() {
  let connection;
  
  try {
    console.log('🚀 测试菜品查询...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 测试基本查询
    console.log('\n📋 测试基本菜品查询...');
    const [dishes] = await connection.execute(`
      SELECT d.*, dc.name as category_name 
      FROM dishes d 
      LEFT JOIN dish_categories dc ON d.categoryId = dc._id 
      WHERE d.status = 'active'
      ORDER BY d.createTime DESC 
      LIMIT 3
    `);
    
    console.log('📊 查询结果:');
    dishes.forEach((dish, index) => {
      console.log(`\n${index + 1}. ${dish.name}:`);
      console.log(`   - 价格: ¥${dish.price}`);
      console.log(`   - 分类: ${dish.category_name}`);
      console.log(`   - 餐次类型: ${JSON.stringify(dish.meal_types)}`);
      console.log(`   - 推荐: ${dish.isRecommended ? '是' : '否'}`);
    });
    
    // 测试按餐次类型筛选
    console.log('\n🍽️ 测试按餐次类型筛选...');
    const [breakfastDishes] = await connection.execute(`
      SELECT d.*, dc.name as category_name 
      FROM dishes d 
      LEFT JOIN dish_categories dc ON d.categoryId = dc._id 
      WHERE d.status = 'active' 
      AND JSON_CONTAINS(d.meal_types, ?)
      ORDER BY d.createTime DESC 
      LIMIT 3
    `, ['"breakfast"']);
    
    console.log('📊 早餐菜品:');
    breakfastDishes.forEach((dish, index) => {
      console.log(`  ${index + 1}. ${dish.name} - 餐次: ${JSON.stringify(dish.meal_types)}`);
    });
    
    console.log('\n🎉 查询测试完成！');
    
  } catch (error) {
    console.error('❌ 查询测试失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行测试
testDishQuery();
