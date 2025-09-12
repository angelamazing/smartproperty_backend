const mysql = require('mysql2/promise');
const config = require('../config/database');

async function checkUserTable() {
  let connection;
  try {
    connection = await mysql.createConnection(config.database);
    
    console.log('检查用户表结构...');
    const [columns] = await connection.execute('DESCRIBE users');
    
    console.log('\n用户表字段:');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : ''} ${col.Key ? `(${col.Key})` : ''}`);
    });
    
    console.log('\n检查部门表结构...');
    const [deptColumns] = await connection.execute('DESCRIBE departments');
    
    console.log('\n部门表字段:');
    deptColumns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : ''} ${col.Key ? `(${col.Key})` : ''}`);
    });
    
  } catch (error) {
    console.error('检查表结构失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUserTable();
