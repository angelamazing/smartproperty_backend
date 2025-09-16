const mysql = require('mysql2/promise');
const config = require('../config/database');
const adminService = require('../services/adminService');

async function testFullUpdateFlow() {
  let connection;
  try {
    console.log('🔍 开始完整测试菜品更新流程...\n');

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
      mealTypes: ['breakfast', 'lunch'], // 测试数据
      updateBy: 'test-user-id'
    };

    console.log('\n2. 准备更新数据:');
    console.log(JSON.stringify(updateData, null, 2));

    // 3. 调用服务层更新
    console.log('\n3. 调用服务层更新...');
    const result = await adminService.updateDish(connection, dish._id, updateData);
    console.log('✅ 服务层更新完成');
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

    // 5. 检查字段映射
    console.log('\n5. 检查字段映射...');
    const [fieldCheck] = await connection.execute(
      'SELECT _id, name, meal_types, createBy, updateTime FROM dishes WHERE _id = ?',
      [dish._id]
    );
    
    const fieldData = fieldCheck[0];
    console.log('📋 字段检查结果:');
    console.log(`   meal_types: ${JSON.stringify(fieldData.meal_types)}`);
    console.log(`   createBy: ${fieldData.createBy}`);
    console.log(`   updateTime: ${fieldData.updateTime}`);

    // 6. 验证结果
    console.log('\n6. 验证结果...');
    if (JSON.stringify(updatedDish.meal_types) === JSON.stringify(['breakfast', 'lunch'])) {
      console.log('✅ mealTypes 更新成功！');
    } else {
      console.log('❌ mealTypes 更新失败！');
      console.log(`   期望: ${JSON.stringify(['breakfast', 'lunch'])}`);
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
testFullUpdateFlow();
