const mysql = require('mysql2/promise');
const config = require('../config/database');

async function testMealTypeFeatures() {
  let connection;
  
  try {
    console.log('🚀 开始测试菜品餐次类型功能...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 1. 测试获取所有菜品（包含meal_types字段）
    console.log('\n📋 测试获取所有菜品...');
    const [allDishes] = await connection.execute(`
      SELECT _id, name, meal_types, JSON_LENGTH(meal_types) as meal_count
      FROM dishes 
      WHERE status = 'active'
      LIMIT 5
    `);
    
    console.log('📊 菜品列表:');
    allDishes.forEach((dish, index) => {
      console.log(`  ${index + 1}. ${dish.name} - 餐次: ${JSON.stringify(dish.meal_types)} (${dish.meal_count} 个)`);
    });
    
    // 2. 测试按餐次类型筛选菜品
    console.log('\n🍽️ 测试按餐次类型筛选菜品...');
    
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    for (const mealType of mealTypes) {
      const [dishes] = await connection.execute(`
        SELECT _id, name, meal_types
        FROM dishes 
        WHERE status = 'active' 
        AND JSON_CONTAINS(meal_types, ?)
        LIMIT 3
      `, [`"${mealType}"`]);
      
      console.log(`\n${mealType.toUpperCase()}菜品 (${dishes.length} 个):`);
      dishes.forEach((dish, index) => {
        console.log(`  ${index + 1}. ${dish.name}`);
      });
    }
    
    // 3. 测试创建带餐次类型的菜品
    console.log('\n➕ 测试创建带餐次类型的菜品...');
    
    const testDishId = 'test-dish-' + Date.now();
    const testMealTypes = ['breakfast', 'lunch'];
    
    await connection.execute(`
      INSERT INTO dishes (
        _id, name, categoryId, description, price, 
        meal_types, status, isRecommended, createTime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      testDishId,
      '测试餐次菜品',
      'fb195e2c-ed19-4ee7-a169-5e4f2db2af33', // 使用现有分类ID
      '这是一个测试菜品，适用于早餐和午餐',
      12.50,
      JSON.stringify(testMealTypes),
      'active',
      1
    ]);
    
    console.log('✅ 测试菜品创建成功');
    
    // 4. 验证创建的菜品
    const [createdDish] = await connection.execute(`
      SELECT _id, name, meal_types, JSON_LENGTH(meal_types) as meal_count
      FROM dishes 
      WHERE _id = ?
    `, [testDishId]);
    
    if (createdDish.length > 0) {
      const dish = createdDish[0];
      console.log(`📋 创建的菜品: ${dish.name}`);
      console.log(`🍽️ 适用餐次: ${JSON.stringify(dish.meal_types)} (${dish.meal_count} 个)`);
    }
    
    // 5. 测试更新菜品餐次类型
    console.log('\n✏️ 测试更新菜品餐次类型...');
    
    const newMealTypes = ['breakfast', 'lunch', 'dinner'];
    await connection.execute(`
      UPDATE dishes 
      SET meal_types = ?, updateTime = NOW()
      WHERE _id = ?
    `, [JSON.stringify(newMealTypes), testDishId]);
    
    console.log('✅ 菜品餐次类型更新成功');
    
    // 6. 验证更新结果
    const [updatedDish] = await connection.execute(`
      SELECT _id, name, meal_types, JSON_LENGTH(meal_types) as meal_count
      FROM dishes 
      WHERE _id = ?
    `, [testDishId]);
    
    if (updatedDish.length > 0) {
      const dish = updatedDish[0];
      console.log(`📋 更新后的菜品: ${dish.name}`);
      console.log(`🍽️ 适用餐次: ${JSON.stringify(dish.meal_types)} (${dish.meal_count} 个)`);
    }
    
    // 7. 测试按餐次类型统计
    console.log('\n📊 测试按餐次类型统计...');
    
    const [stats] = await connection.execute(`
      SELECT 
        'breakfast' as meal_type,
        COUNT(*) as dish_count
      FROM dishes 
      WHERE status = 'active' 
      AND JSON_CONTAINS(meal_types, '"breakfast"')
      
      UNION ALL
      
      SELECT 
        'lunch' as meal_type,
        COUNT(*) as dish_count
      FROM dishes 
      WHERE status = 'active' 
      AND JSON_CONTAINS(meal_types, '"lunch"')
      
      UNION ALL
      
      SELECT 
        'dinner' as meal_type,
        COUNT(*) as dish_count
      FROM dishes 
      WHERE status = 'active' 
      AND JSON_CONTAINS(meal_types, '"dinner"')
    `);
    
    console.log('📈 餐次类型统计:');
    stats.forEach(stat => {
      console.log(`  ${stat.meal_type}: ${stat.dish_count} 个菜品`);
    });
    
    // 8. 清理测试数据
    console.log('\n🧹 清理测试数据...');
    await connection.execute('DELETE FROM dishes WHERE _id = ?', [testDishId]);
    console.log('✅ 测试数据清理完成');
    
    console.log('\n🎉 所有测试完成！菜品餐次类型功能正常工作。');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行测试
testMealTypeFeatures();
