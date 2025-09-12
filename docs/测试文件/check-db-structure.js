const mysql = require('mysql2/promise');
const config = require('./config/database');

async function checkDatabaseStructure() {
  let connection;
  
  try {
    console.log('🔍 检查数据库表结构...');
    
    // 创建连接
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 检查users表结构
    console.log('\n📋 检查users表结构...');
    const [columns] = await connection.execute('DESCRIBE users');
    
    console.log('users表字段列表:');
    columns.forEach((col, index) => {
      console.log(`  ${index + 1}. ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `KEY: ${col.Key}` : ''}`);
    });
    
    // 检查users表数据示例
    console.log('\n📋 检查users表数据示例...');
    const [users] = await connection.execute('SELECT * FROM users LIMIT 1');
    
    if (users.length > 0) {
      console.log('用户数据示例:');
      const user = users[0];
      Object.keys(user).forEach(key => {
        console.log(`  ${key}: ${user[key]}`);
      });
    } else {
      console.log('users表中没有数据');
    }
    
    // 检查其他相关表
    console.log('\n📋 检查其他相关表...');
    const [tables] = await connection.execute('SHOW TABLES');
    
    console.log('数据库中的所有表:');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`  ${index + 1}. ${tableName}`);
    });
    
  } catch (error) {
    console.error('❌ 检查数据库结构失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行检查
if (require.main === module) {
  checkDatabaseStructure();
}

module.exports = {
  checkDatabaseStructure
};
