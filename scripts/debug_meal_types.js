const mysql = require('mysql2/promise');

async function debugMealTypes() {
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
    
    console.log('🔍 检查数据库中的 meal_types 字段格式...\n');
    
    // 查询所有菜品的 meal_types 字段
    const [dishes] = await connection.execute(`
      SELECT _id, name, meal_types, 
             JSON_TYPE(meal_types) as json_type,
             JSON_LENGTH(meal_types) as json_length
      FROM dishes 
      WHERE status != 'deleted'
      ORDER BY _id DESC
    `);
    
    console.log('📊 菜品 meal_types 字段分析:');
    console.log('='.repeat(80));
    
    dishes.forEach((dish, index) => {
      console.log(`${index + 1}. ${dish.name}`);
      console.log(`   ID: ${dish._id}`);
      console.log(`   meal_types 原始值: ${dish.meal_types}`);
      console.log(`   JSON 类型: ${dish.json_type}`);
      console.log(`   JSON 长度: ${dish.json_length}`);
      
      // 尝试解析 JSON
      try {
        const parsed = JSON.parse(dish.meal_types);
        console.log(`   解析后的值: ${JSON.stringify(parsed)}`);
        console.log(`   是否包含 dinner: ${parsed.includes('dinner')}`);
        console.log(`   是否包含 breakfast: ${parsed.includes('breakfast')}`);
        console.log(`   是否包含 lunch: ${parsed.includes('lunch')}`);
      } catch (e) {
        console.log(`   ❌ JSON 解析失败: ${e.message}`);
      }
      console.log('');
    });
    
    console.log('='.repeat(80));
    
    // 测试 JSON_CONTAINS 函数
    console.log('\n🧪 测试 JSON_CONTAINS 函数:');
    
    const testQueries = [
      { type: 'dinner', query: 'SELECT COUNT(*) as count FROM dishes WHERE JSON_CONTAINS(meal_types, ?)' },
      { type: 'breakfast', query: 'SELECT COUNT(*) as count FROM dishes WHERE JSON_CONTAINS(meal_types, ?)' },
      { type: 'lunch', query: 'SELECT COUNT(*) as count FROM dishes WHERE JSON_CONTAINS(meal_types, ?)' }
    ];
    
    for (const test of testQueries) {
      try {
        const [result] = await connection.execute(test.query, [`"${test.type}"`]);
        console.log(`${test.type}: ${result[0].count} 个菜品`);
      } catch (e) {
        console.log(`${test.type}: 查询失败 - ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行调试
debugMealTypes();
