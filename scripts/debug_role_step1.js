const mysql = require('mysql2/promise');
const config = require('../config/database');

async function checkRolesTable() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('🔍 第一步：检查数据库roles表结构和数据...');

    // 1. 检查roles表结构
    console.log('\n📋 roles表结构:');
    const [tableInfo] = await connection.execute('DESCRIBE roles');
    tableInfo.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} (${col.Null === 'NO' ? '非空' : '可空'}) [${col.Key}] [默认值: ${col.Default}]`);
    });

    // 2. 检查roles表数据
    console.log('\n📋 roles表数据:');
    const [roles] = await connection.execute('SELECT * FROM roles ORDER BY id');
    if (roles.length > 0) {
      roles.forEach(role => {
        console.log(`  ID: ${role.id}`);
        console.log(`  名称: "${role.name}"`);
        console.log(`  描述: ${role.description}`);
        console.log(`  状态: ${role.status}`);
        console.log(`  创建时间: ${role.create_time}`);
        console.log(`  更新时间: ${role.update_time}`);
        console.log('---');
      });
    } else {
      console.log('  未找到任何角色数据');
    }

    // 3. 检查是否有admin角色
    console.log('\n🔍 检查admin角色:');
    const [adminRole] = await connection.execute('SELECT * FROM roles WHERE name = "admin"');
    if (adminRole.length > 0) {
      console.log('  ✅ 找到admin角色:');
      console.log(`    ID: ${adminRole[0].id}`);
      console.log(`    名称: "${adminRole[0].name}"`);
      console.log(`    状态: ${adminRole[0].status}`);
    } else {
      console.log('  ❌ 未找到admin角色');
    }

    // 4. 检查所有活跃角色
    console.log('\n🔍 检查所有活跃角色:');
    const [activeRoles] = await connection.execute('SELECT name FROM roles WHERE status = "active"');
    if (activeRoles.length > 0) {
      console.log('  活跃角色列表:');
      activeRoles.forEach(role => {
        console.log(`    - "${role.name}"`);
      });
    } else {
      console.log('  没有活跃角色');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkRolesTable().catch(console.error);
