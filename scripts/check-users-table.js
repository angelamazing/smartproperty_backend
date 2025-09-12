const mysql = require('mysql2/promise');
const config = require('../config/database.js').database;

/**
 * 检查users表的结构
 */
async function checkUsersTableStructure() {
  let connection = null;
  try {
    console.log('开始检查users表结构...');
    
    // 创建数据库连接
    connection = await mysql.createConnection(config);
    console.log('✓ 数据库连接成功');
    
    // 查询users表的结构
    const [columns] = await connection.execute('SHOW COLUMNS FROM users');
    
    console.log('\nusers表的列结构:');
    columns.forEach(column => {
      console.log(`- ${column.Field} (${column.Type})`);
    });
    
    // 也可以查询一下departments表，因为查询中涉及到了
    const [deptColumns] = await connection.execute('SHOW COLUMNS FROM departments');
    
    console.log('\ndepartments表的列结构:');
    deptColumns.forEach(column => {
      console.log(`- ${column.Field} (${column.Type})`);
    });
    
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
if (require.main === module) {
  checkUsersTableStructure();
}

module.exports = { checkUsersTableStructure };