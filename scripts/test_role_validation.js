const mysql = require('mysql2/promise');
const config = require('./config/database').database;

async function testRoleValidation() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('🔍 测试角色验证逻辑...');

    // 1. 检查所有角色
    console.log('\n📋 所有角色:');
    const [allRoles] = await connection.execute('SELECT id, name, status FROM roles');
    allRoles.forEach(role => {
      console.log(`  ID: ${role.id}, Name: "${role.name}", Status: ${role.status}`);
    });

    // 2. 测试角色验证查询
    const testRoles = ['admin', 'user', 'sys_admin', 'dept_admin'];
    
    console.log('\n🔍 测试角色验证查询:');
    for (const roleName of testRoles) {
      try {
        const [roleCheck] = await connection.execute(
          'SELECT name FROM roles WHERE name = ? AND status = "active"', 
          [roleName]
        );
        
        if (roleCheck.length > 0) {
          console.log(`  ✅ "${roleName}" - 存在且活跃`);
        } else {
          console.log(`  ❌ "${roleName}" - 不存在或已禁用`);
        }
      } catch (error) {
        console.log(`  ❌ "${roleName}" - 查询失败: ${error.message}`);
      }
    }

    // 3. 检查当前用户的role值
    const userId = 'f65d2db8-3672-46fb-862f-9a7888ad3eb8';
    console.log('\n📋 当前用户role值:');
    const [user] = await connection.execute('SELECT role FROM users WHERE _id = ?', [userId]);
    if (user.length > 0) {
      console.log(`  用户role: "${user[0].role}"`);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

testRoleValidation().catch(console.error);
