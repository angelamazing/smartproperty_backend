const mysql = require('mysql2/promise');

async function fixSpecificDishes() {
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
    
    console.log('🔧 修复特定菜品的 meal_types 字段格式...\n');
    
    // 需要修复的菜品ID和对应的餐次类型
    const dishesToFix = [
      { id: 'test-dish-1758013451292-uolk7yma7', name: '白粥', mealTypes: ['breakfast', 'lunch'] },
      { id: 'test-dish-1758013451290-vam2vuvcj', name: '红烧肉', mealTypes: ['lunch', 'dinner'] },
      { id: 'test-dish-1758013451288-yxow53hsb', name: '宫保鸡丁', mealTypes: ['lunch', 'dinner'] },
      { id: 'test-dish-1758013451285-b89qyad80', name: '小笼包', mealTypes: ['breakfast', 'dinner'] }
    ];
    
    for (const dish of dishesToFix) {
      console.log(`\n处理菜品: ${dish.name} (${dish.id})`);
      
      const jsonArray = JSON.stringify(dish.mealTypes);
      console.log(`更新为: ${jsonArray}`);
      
      // 更新数据库
      await connection.execute(
        'UPDATE dishes SET meal_types = ? WHERE _id = ?',
        [jsonArray, dish.id]
      );
      
      console.log('✅ 更新成功');
    }
    
    console.log('\n🎉 所有特定菜品已修复！');
    
    // 验证修复结果
    console.log('\n🔍 验证修复结果:');
    const [verifyDishes] = await connection.execute(`
      SELECT _id, name, meal_types
      FROM dishes 
      WHERE _id IN (
        'test-dish-1758013451292-uolk7yma7',
        'test-dish-1758013451290-vam2vuvcj', 
        'test-dish-1758013451288-yxow53hsb',
        'test-dish-1758013451285-b89qyad80'
      )
      ORDER BY _id DESC
    `);
    
    verifyDishes.forEach((dish, index) => {
      console.log(`${index + 1}. ${dish.name}`);
      console.log(`   meal_types: ${dish.meal_types}`);
      
      try {
        const parsed = JSON.parse(dish.meal_types);
        console.log(`   解析成功: ${JSON.stringify(parsed)}`);
        console.log(`   ✅ 格式正确`);
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
fixSpecificDishes();
