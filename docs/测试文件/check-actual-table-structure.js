const mysql = require('mysql2/promise');
const config = require('./config/database');

async function checkActualTableStructure() {
  let connection;
  
  try {
    console.log('🔍 检查实际表结构...');
    
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 检查roles表
    console.log('\n📋 检查roles表...');
    try {
      const [columns] = await connection.execute('DESCRIBE roles');
      console.log('roles表字段:');
      columns.forEach(col => {
        console.log(`  ${col.Field} (${col.Type}) ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
      
      // 检查主键
      const primaryKeys = columns.filter(col => col.Key === 'PRI');
      console.log('\n主键字段:', primaryKeys.map(col => col.Field));
      
    } catch (error) {
      console.log('❌ roles表不存在:', error.message);
    }
    
    // 检查dishes表
    console.log('\n📋 检查dishes表...');
    try {
      const [columns] = await connection.execute('DESCRIBE dishes');
      console.log('dishes表字段:');
      columns.forEach(col => {
        console.log(`  ${col.Field} (${col.Type}) ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
      
      // 检查主键
      const primaryKeys = columns.filter(col => col.Key === 'PRI');
      console.log('\n主键字段:', primaryKeys.map(col => col.Field));
      
    } catch (error) {
      console.log('❌ dishes表不存在:', error.message);
    }
    
    // 检查dish_categories表
    console.log('\n📋 检查dish_categories表...');
    try {
      const [columns] = await connection.execute('DESCRIBE dish_categories');
      console.log('dish_categories表字段:');
      columns.forEach(col => {
        console.log(`  ${col.Field} (${col.Type}) ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
      
      // 检查主键
      const primaryKeys = columns.filter(col => col.Key === 'PRI');
      console.log('\n主键字段:', primaryKeys.map(col => col.Field));
      
    } catch (error) {
      console.log('❌ dish_categories表不存在:', error.message);
    }
    
    // 检查users表结构（作为参考）
    console.log('\n📋 检查users表（作为参考）...');
    try {
      const [columns] = await connection.execute('DESCRIBE users');
      console.log('users表主键字段:');
      const primaryKeys = columns.filter(col => col.Key === 'PRI');
      console.log(primaryKeys.map(col => col.Field));
      
    } catch (error) {
      console.log('❌ users表不存在:', error.message);
    }
    
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
checkActualTableStructure();
