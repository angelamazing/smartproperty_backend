const mysql = require('mysql2/promise');
const config = require('./config/database');

async function checkDishCategoriesStructure() {
  let connection;
  
  try {
    console.log('🔍 检查dish_categories表结构...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 检查表结构
    console.log('\n📋 检查dish_categories表结构');
    try {
      const [columns] = await connection.execute('DESCRIBE dish_categories');
      console.log('dish_categories表字段:');
      columns.forEach((col, index) => {
        console.log(`  ${index + 1}. ${col.Field} (${col.Type}) ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
    } catch (error) {
      console.log('❌ 检查表结构失败:', error.message);
    }
    
    // 检查表数据
    console.log('\n📋 检查dish_categories表数据');
    try {
      const [rows] = await connection.execute('SELECT * FROM dish_categories LIMIT 3');
      console.log('表数据示例:');
      if (rows.length > 0) {
        console.log('字段名:', Object.keys(rows[0]));
        console.log('第一条记录:', rows[0]);
      }
    } catch (error) {
      console.log('❌ 检查表数据失败:', error.message);
    }
    
    console.log('\n🎉 检查完成！');
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行检查
checkDishCategoriesStructure();
