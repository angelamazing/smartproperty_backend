const mysql = require('mysql2/promise');
const config = require('../config/database');

async function debugDishQuery() {
  let connection;
  
  try {
    console.log('🔍 调试菜品查询...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 测试与API相同的查询
    console.log('📋 测试API查询语句...');
    const [dishes] = await connection.execute(`
      SELECT d.*, dc.name as category_name 
      FROM dishes d 
      LEFT JOIN dish_categories dc ON d.categoryId = dc._id 
      WHERE d.status != "deleted"
      ORDER BY d.createTime DESC 
      LIMIT 3
    `);
    
    console.log('📊 查询结果:');
    console.log('记录数:', dishes.length);
    
    if (dishes.length > 0) {
      const dish = dishes[0];
      console.log('\n第一个菜品的字段:');
      Object.keys(dish).forEach(key => {
        console.log(`  - ${key}: ${typeof dish[key]} = ${JSON.stringify(dish[key])}`);
      });
      
      // 特别检查meal_types字段
      if (dish.meal_types !== undefined) {
        console.log('\n✅ meal_types字段存在:', JSON.stringify(dish.meal_types));
      } else {
        console.log('\n❌ meal_types字段不存在');
      }
    }
    
    // 测试简单的SELECT *查询
    console.log('\n📋 测试简单查询...');
    const [simpleDishes] = await connection.execute(`
      SELECT * FROM dishes WHERE status = 'active' LIMIT 1
    `);
    
    if (simpleDishes.length > 0) {
      const dish = simpleDishes[0];
      console.log('简单查询结果字段:');
      Object.keys(dish).forEach(key => {
        console.log(`  - ${key}: ${typeof dish[key]} = ${JSON.stringify(dish[key])}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 调试失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行调试
debugDishQuery();
