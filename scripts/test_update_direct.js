const mysql = require('mysql2/promise');
const config = require('../config/database');
const adminService = require('../services/adminService');

async function testUpdateMealTypes() {
  let connection;
  try {
    console.log('🚀 开始测试 mealTypes 更新功能...\n');

    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');

    // 1. 获取一个活跃的菜品
    console.log('\n1. 获取菜品信息...');
    const [dishes] = await connection.execute('SELECT _id, name, meal_types FROM dishes WHERE status = "active" LIMIT 1');
    
    if (dishes.length === 0) {
      console.log('❌ 没有找到菜品');
      return;
    }

    const dish = dishes[0];
    console.log('📋 当前菜品:');
    console.log(`   ID: ${dish._id}`);
    console.log(`   名称: ${dish.name}`);
    console.log(`   当前 meal_types: ${JSON.stringify(dish.meal_types)}`);

    // 2. 测试更新 mealTypes
    console.log('\n2. 测试更新 mealTypes...');
    const updateData = {
      mealTypes: ['breakfast', 'lunch'], // 测试数据
      updateBy: 'test-user-id'
    };

    console.log('📝 更新数据:', JSON.stringify(updateData, null, 2));

    // 调用服务层更新
    const result = await adminService.updateDish(connection, dish._id, updateData);
    console.log('✅ 更新成功');
    console.log('📊 更新结果:', result);

    // 3. 验证更新结果
    console.log('\n3. 验证更新结果...');
    const [updatedDishes] = await connection.execute(
      'SELECT _id, name, meal_types FROM dishes WHERE _id = ?',
      [dish._id]
    );

    const updatedDish = updatedDishes[0];
    console.log('📋 更新后的菜品:');
    console.log(`   meal_types: ${JSON.stringify(updatedDish.meal_types)}`);

    if (JSON.stringify(updatedDish.meal_types) === JSON.stringify(['breakfast', 'lunch'])) {
      console.log('✅ mealTypes 更新成功！');
    } else {
      console.log('❌ mealTypes 更新失败！');
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
testUpdateMealTypes();
