const mysql = require('mysql2/promise');
const config = require('./config/database');

async function checkRoleTableStructure() {
  let connection;
  
  try {
    // 连接数据库
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 检查roles表是否存在
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'roles'
    `);
    
    if (tables.length === 0) {
      console.log('❌ roles表不存在');
      return;
    }
    
    console.log('✅ roles表存在');
    
    // 查看roles表结构
    const [columns] = await connection.execute(`
      DESCRIBE roles
    `);
    
    console.log('\n📋 roles表结构:');
    console.table(columns);
    
    // 查看roles表数据
    const [rows] = await connection.execute(`
      SELECT * FROM roles LIMIT 5
    `);
    
    if (rows.length > 0) {
      console.log('\n📊 roles表数据示例:');
      console.table(rows);
    } else {
      console.log('\n📊 roles表为空');
    }
    
    // 检查permissions表
    const [permissionTables] = await connection.execute(`
      SHOW TABLES LIKE 'permissions'
    `);
    
    if (permissionTables.length > 0) {
      console.log('\n✅ permissions表存在');
      
      const [permissionColumns] = await connection.execute(`
        DESCRIBE permissions
      `);
      
      console.log('\n📋 permissions表结构:');
      console.table(permissionColumns);
    } else {
      console.log('\n❌ permissions表不存在');
    }
    
    // 检查role_permissions表
    const [rolePermissionTables] = await connection.execute(`
      SHOW TABLES LIKE 'role_permissions'
    `);
    
    if (rolePermissionTables.length > 0) {
      console.log('\n✅ role_permissions表存在');
      
      const [rolePermissionColumns] = await connection.execute(`
        DESCRIBE role_permissions
      `);
      
      console.log('\n📋 role_permissions表结构:');
      console.table(rolePermissionColumns);
    } else {
      console.log('\n❌ role_permissions表不存在');
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
checkRoleTableStructure();
