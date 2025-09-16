const mysql = require('mysql2/promise');

async function checkDatabaseDirect() {
  let connection;
  
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: 'mysql-demo-mysql.ns-gpaauglf.svc',
      port: 3306,
      user: 'root',
      password: '54bxhv99',
      database: 'smart_property',
      charset: 'utf8mb4',
      timezone: '+08:00'
    });
    
    console.log('🔍 直接查询数据库...\n');
    
    // 直接查询特定菜品
    const [dishes] = await connection.execute(`
      SELECT _id, name, meal_types, 
             HEX(meal_types) as hex_value,
             LENGTH(meal_types) as length_value
      FROM dishes 
      WHERE _id = 'test-dish-1758013451292-uolk7yma7'
    `);
    
    if (dishes.length > 0) {
      const dish = dishes[0];
      console.log(`菜品: ${dish.name}`);
      console.log(`meal_types 原始值: ${dish.meal_types}`);
      console.log(`HEX 值: ${dish.hex_value}`);
      console.log(`长度: ${dish.length_value}`);
      
      // 尝试解析
      try {
        const parsed = JSON.parse(dish.meal_types);
        console.log(`解析成功: ${JSON.stringify(parsed)}`);
      } catch (e) {
        console.log(`解析失败: ${e.message}`);
      }
    } else {
      console.log('未找到菜品');
    }
    
    // 强制更新一次
    console.log('\n🔧 强制更新...');
    await connection.execute(
      'UPDATE dishes SET meal_types = ? WHERE _id = ?',
      ['["breakfast","lunch"]', 'test-dish-1758013451292-uolk7yma7']
    );
    
    // 再次查询
    console.log('\n🔍 更新后查询...');
    const [dishesAfter] = await connection.execute(`
      SELECT _id, name, meal_types
      FROM dishes 
      WHERE _id = 'test-dish-1758013451292-uolk7yma7'
    `);
    
    if (dishesAfter.length > 0) {
      const dish = dishesAfter[0];
      console.log(`meal_types: ${dish.meal_types}`);
      try {
        const parsed = JSON.parse(dish.meal_types);
        console.log(`解析成功: ${JSON.stringify(parsed)}`);
      } catch (e) {
        console.log(`解析失败: ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行检查
checkDatabaseDirect();
