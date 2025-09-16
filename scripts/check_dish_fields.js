const mysql = require('mysql2/promise');
const config = require('../config/database');

async function checkDishFields() {
  let connection;
  
  try {
    console.log('🚀 检查菜品表字段...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 检查表结构
    console.log('📋 检查表结构...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'smart_property' 
      AND TABLE_NAME = 'dishes'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('📊 菜品表字段:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_COMMENT ? `// ${col.COLUMN_COMMENT}` : ''}`);
    });
    
    // 检查是否有meal_types字段
    const mealTypesColumn = columns.find(col => col.COLUMN_NAME === 'meal_types');
    if (mealTypesColumn) {
      console.log('\n✅ meal_types字段存在');
    } else {
      console.log('\n❌ meal_types字段不存在');
    }
    
    // 测试查询单个菜品
    console.log('\n📋 测试查询单个菜品...');
    const [dishes] = await connection.execute(`
      SELECT * FROM dishes WHERE status = 'active' LIMIT 1
    `);
    
    if (dishes.length > 0) {
      const dish = dishes[0];
      console.log('📊 菜品字段:');
      Object.keys(dish).forEach(key => {
        console.log(`  - ${key}: ${typeof dish[key]} = ${JSON.stringify(dish[key])}`);
      });
    }
    
    console.log('\n🎉 字段检查完成！');
    
  } catch (error) {
    console.error('❌ 字段检查失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行检查
checkDishFields();
