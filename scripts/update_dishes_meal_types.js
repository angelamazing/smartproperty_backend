const mysql = require('mysql2/promise');
const config = require('../config/database');
const logger = require('../utils/logger');

async function updateDishesTable() {
  let connection;
  
  try {
    // 创建数据库连接
    connection = await mysql.createConnection(config.database);

    console.log('🔗 数据库连接成功');

    // 检查字段是否已存在
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'smart_property' 
      AND TABLE_NAME = 'dishes' 
      AND COLUMN_NAME = 'meal_types'
    `);

    if (columns.length > 0) {
      console.log('✅ meal_types 字段已存在，跳过添加');
    } else {
      // 添加餐次类型字段
      console.log('📝 添加 meal_types 字段...');
      await connection.execute(`
        ALTER TABLE dishes 
        ADD COLUMN meal_types JSON COMMENT '适用餐次类型，数组格式：["breakfast", "lunch", "dinner"]' 
        AFTER isRecommended
      `);
      console.log('✅ meal_types 字段添加成功');
    }

    // 为现有菜品设置默认餐次类型
    console.log('🔄 为现有菜品设置默认餐次类型...');
    const [result] = await connection.execute(`
      UPDATE dishes 
      SET meal_types = JSON_ARRAY('breakfast', 'lunch', 'dinner') 
      WHERE meal_types IS NULL
    `);
    console.log(`✅ 更新了 ${result.affectedRows} 条记录`);

    // 添加索引
    console.log('📊 添加索引...');
    try {
      await connection.execute(`
        ALTER TABLE dishes 
        ADD INDEX idx_meal_types ((CAST(meal_types AS CHAR(255) ARRAY)))
      `);
      console.log('✅ 索引添加成功');
    } catch (indexError) {
      if (indexError.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️ 索引已存在，跳过');
      } else {
        throw indexError;
      }
    }

    // 验证数据
    console.log('🔍 验证数据...');
    const [dishes] = await connection.execute(`
      SELECT 
        _id, 
        name, 
        meal_types,
        JSON_LENGTH(meal_types) as meal_count
      FROM dishes 
      LIMIT 5
    `);

    console.log('📋 示例数据:');
    dishes.forEach(dish => {
      console.log(`  - ${dish.name}: ${JSON.stringify(dish.meal_types)} (${dish.meal_count} 个餐次)`);
    });

    console.log('🎉 数据库更新完成！');

  } catch (error) {
    console.error('❌ 数据库更新失败:', error.message);
    logger.error('更新菜品表失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 执行更新
updateDishesTable();
