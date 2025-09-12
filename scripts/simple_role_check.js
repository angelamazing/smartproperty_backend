const mysql = require('mysql2/promise');
const config = require('./config/database');

async function simpleCheck() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    
    // 检查roles表数据
    const [roles] = await connection.execute('SELECT id, name, status FROM roles');
    console.log('Roles表数据:');
    roles.forEach(role => {
      console.log(`ID: ${role.id}, Name: "${role.name}", Status: ${role.status}`);
    });
    
    // 检查admin角色
    const [admin] = await connection.execute('SELECT * FROM roles WHERE name = "admin"');
    console.log('\nAdmin角色:', admin.length > 0 ? admin[0] : '不存在');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

simpleCheck();
