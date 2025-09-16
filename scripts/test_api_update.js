const mysql = require('mysql2/promise');
const config = require('../config/database');
const dishService = require('../services/dishService');

async function testApiUpdate() {
  let connection;
  try {
    console.log('🚀 开始测试API更新功能...\n');

    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');

    // 1. 获取一个活跃的菜品
    console.log('\n1. 获取测试菜品...');
    const [dishes] = await connection.execute('SELECT _id, name, meal_types FROM dishes WHERE status = "active" LIMIT 1');
    
    if (dishes.length === 0) {
      console.log('❌ 没有找到活跃的菜品');
      return;
    }

    const dish = dishes[0];
    console.log('📋 当前菜品:');
    console.log(`   ID: ${dish._id}`);
    console.log(`   名称: ${dish.name}`);
    console.log(`   当前 meal_types: ${JSON.stringify(dish.meal_types)}`);

    // 2. 准备更新数据
    const updateData = {
      mealTypes: ['breakfast', 'dinner'], // 测试数据
      name: dish.name // 保持其他字段不变
    };

    console.log('\n2. 准备更新数据:');
    console.log(JSON.stringify(updateData, null, 2));

    // 3. 调用 dishService.updateDish
    console.log('\n3. 调用 dishService.updateDish...');
    const result = await dishService.updateDish(connection, dish._id, updateData, 'test-user-id');
    console.log('✅ dishService 更新完成');
    console.log('📊 服务层返回结果:');
    console.log(JSON.stringify(result, null, 2));

    // 4. 验证数据库中的实际数据
    console.log('\n4. 验证数据库中的实际数据...');
    const [updatedDishes] = await connection.execute(
      'SELECT _id, name, meal_types FROM dishes WHERE _id = ?',
      [dish._id]
    );

    const updatedDish = updatedDishes[0];
    console.log('📋 数据库中的实际数据:');
    console.log(`   meal_types: ${JSON.stringify(updatedDish.meal_types)}`);

    // 5. 验证结果
    console.log('\n5. 验证结果...');
    if (JSON.stringify(updatedDish.meal_types) === JSON.stringify(['breakfast', 'dinner'])) {
      console.log('✅ mealTypes 更新成功！');
    } else {
      console.log('❌ mealTypes 更新失败！');
      console.log(`   期望: ${JSON.stringify(['breakfast', 'dinner'])}`);
      console.log(`   实际: ${JSON.stringify(updatedDish.meal_types)}`);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行测试
testApiUpdate();
