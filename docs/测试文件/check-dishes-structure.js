const mysql = require('mysql2/promise');
const config = require('./config/database');

async function checkDishesStructure() {
  let connection;
  
  try {
    console.log('🔍 检查dishes表结构...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 检查dishes表结构
    console.log('\n📋 检查dishes表结构');
    try {
      const [columns] = await connection.execute('DESCRIBE dishes');
      console.log('dishes表字段:');
      columns.forEach((col, index) => {
        console.log(`  ${index + 1}. ${col.Field} (${col.Type}) ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
    } catch (error) {
      console.log('❌ 检查表结构失败:', error.message);
    }
    
    // 检查dishes表数据示例
    console.log('\n📋 检查dishes表数据示例');
    try {
      const [rows] = await connection.execute('SELECT * FROM dishes LIMIT 1');
      if (rows.length > 0) {
        console.log('字段名:', Object.keys(rows[0]));
        console.log('第一条记录:', rows[0]);
      }
    } catch (error) {
      console.log('❌ 检查表数据失败:', error.message);
    }
    
    // 检查users表结构
    console.log('\n📋 检查users表结构');
    try {
      const [columns] = await connection.execute('DESCRIBE users');
      console.log('users表字段:');
      columns.forEach((col, index) => {
        console.log(`  ${index + 1}. ${col.Field} (${col.Type}) ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
    } catch (error) {
      console.log('❌ 检查users表结构失败:', error.message);
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
checkDishesStructure();
