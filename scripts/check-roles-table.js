const mysql = require('mysql2/promise');
const config = require('../config/database.js').database;

/**
 * 检查roles表的结构
 */
async function checkRolesTableStructure() {
  let connection = null;
  try {
    console.log('开始检查roles表结构...');
    
    // 创建数据库连接
    connection = await mysql.createConnection(config);
    console.log('✓ 数据库连接成功');
    
    // 查询roles表的结构
    const [columns] = await connection.execute('SHOW COLUMNS FROM roles');
    
    console.log('\nroles表的列结构:');
    columns.forEach(column => {
      console.log(`- ${column.Field} (${column.Type})`);
    });
    
    // 尝试获取表的索引信息
    const [indexes] = await connection.execute('SHOW INDEX FROM roles');
    
    if (indexes.length > 0) {
      console.log('\nroles表的索引信息:');
      indexes.forEach(index => {
        console.log(`- ${index.Key_name} (${index.Column_name})`);
      });
    }
    
  } catch (error) {
    console.error('✗ 检查过程中出现错误:', error.message);
    console.error('错误详情:', error);
  } finally {
    // 关闭数据库连接
    if (connection) {
      try {
        await connection.end();
        console.log('✓ 数据库连接已关闭');
      } catch (err) {
        console.error('✗ 关闭数据库连接时出错:', err.message);
      }
    }
  }
}

// 执行检查
checkRolesTableStructure();