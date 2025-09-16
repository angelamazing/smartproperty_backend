const mysql = require('mysql2/promise');

async function fixMealTypesFormat() {
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
    
    console.log('🔧 修复 meal_types 字段格式...\n');
    
    // 查询所有需要修复的菜品
    const [dishes] = await connection.execute(`
      SELECT _id, name, meal_types
      FROM dishes 
      WHERE status != 'deleted' 
      AND meal_types IS NOT NULL 
      AND meal_types != ''
      AND meal_types NOT LIKE '["%]'
    `);
    
    console.log(`📊 找到 ${dishes.length} 个需要修复的菜品:`);
    
    for (const dish of dishes) {
      console.log(`\n处理菜品: ${dish.name}`);
      console.log(`原始值: ${dish.meal_types}`);
      
      // 将逗号分隔的字符串转换为JSON数组
      const mealTypesArray = dish.meal_types.split(',').map(type => type.trim());
      const jsonArray = JSON.stringify(mealTypesArray);
      
      console.log(`转换后: ${jsonArray}`);
      
      // 更新数据库
      await connection.execute(
        'UPDATE dishes SET meal_types = ? WHERE _id = ?',
        [jsonArray, dish._id]
      );
      
      console.log('✅ 更新成功');
    }
    
    console.log('\n🎉 所有 meal_types 字段已修复！');
    
    // 验证修复结果
    console.log('\n🔍 验证修复结果:');
    const [verifyDishes] = await connection.execute(`
      SELECT _id, name, meal_types,
             JSON_TYPE(meal_types) as json_type,
             JSON_LENGTH(meal_types) as json_length
      FROM dishes 
      WHERE status != 'deleted'
      ORDER BY _id DESC
    `);
    
    verifyDishes.forEach((dish, index) => {
      console.log(`${index + 1}. ${dish.name}`);
      console.log(`   meal_types: ${dish.meal_types}`);
      console.log(`   JSON 类型: ${dish.json_type}`);
      console.log(`   JSON 长度: ${dish.json_length}`);
      
      try {
        const parsed = JSON.parse(dish.meal_types);
        console.log(`   解析成功: ${JSON.stringify(parsed)}`);
      } catch (e) {
        console.log(`   ❌ 解析失败: ${e.message}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行修复
fixMealTypesFormat();
