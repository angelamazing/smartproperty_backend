const mysql = require('mysql2/promise');
const config = require('./config/database');

async function checkDiningOrdersStructure() {
  let connection;
  try {
    connection = await mysql.createConnection(config.database);
    const [rows] = await connection.execute('DESCRIBE dining_orders');
    console.log('dining_orders表结构:');
    rows.forEach(row => {
      console.log(`${row.Field}: ${row.Type}`);
    });
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDiningOrdersStructure();
