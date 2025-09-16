const mysql = require('mysql2/promise');

async function debugJsonContains() {
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
    
    console.log('🔍 调试 JSON_CONTAINS 函数...\n');
    
    // 测试不同的查询方式
    const testCases = [
      {
        name: '方式1: JSON_CONTAINS(meal_types, JSON_QUOTE(?))',
        query: 'SELECT _id, name, meal_types FROM dishes WHERE JSON_CONTAINS(meal_types, JSON_QUOTE(?))',
        params: ['dinner']
      },
      {
        name: '方式2: JSON_CONTAINS(meal_types, ?)',
        query: 'SELECT _id, name, meal_types FROM dishes WHERE JSON_CONTAINS(meal_types, ?)',
        params: ['"dinner"']
      },
      {
        name: '方式3: JSON_SEARCH(meal_types, "one", ?)',
        query: 'SELECT _id, name, meal_types FROM dishes WHERE JSON_SEARCH(meal_types, "one", ?) IS NOT NULL',
        params: ['dinner']
      },
      {
        name: '方式4: JSON_EXTRACT + LIKE',
        query: 'SELECT _id, name, meal_types FROM dishes WHERE JSON_EXTRACT(meal_types, "$[*]") LIKE ?',
        params: ['%"dinner"%']
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n${testCase.name}:`);
      try {
        const [results] = await connection.execute(testCase.query, testCase.params);
        console.log(`  找到 ${results.length} 个结果:`);
        results.forEach((dish, index) => {
          console.log(`    ${index + 1}. ${dish.name} - ${dish.meal_types}`);
        });
      } catch (error) {
        console.log(`  ❌ 查询失败: ${error.message}`);
      }
    }
    
    // 测试原始数据
    console.log('\n📊 原始数据检查:');
    const [allDishes] = await connection.execute(`
      SELECT _id, name, meal_types, 
             JSON_TYPE(meal_types) as json_type,
             JSON_LENGTH(meal_types) as json_length
      FROM dishes 
      WHERE status != 'deleted'
      ORDER BY _id DESC
    `);
    
    allDishes.forEach((dish, index) => {
      console.log(`${index + 1}. ${dish.name}`);
      console.log(`   meal_types: ${dish.meal_types}`);
      console.log(`   JSON 类型: ${dish.json_type}`);
      console.log(`   JSON 长度: ${dish.json_length}`);
      
      // 手动检查是否包含 dinner
      try {
        const parsed = JSON.parse(dish.meal_types);
        const containsDinner = parsed.includes('dinner');
        console.log(`   手动检查包含 dinner: ${containsDinner}`);
      } catch (e) {
        console.log(`   ❌ 解析失败: ${e.message}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 调试失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行调试
debugJsonContains();
