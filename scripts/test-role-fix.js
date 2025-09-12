const mysql = require('mysql2/promise');
const config = require('../config/database.js').database;

/**
 * 测试修复后的角色列表查询
 */
async function testRoleQuery() {
  let connection;
  
  try {
    console.log('开始测试角色列表查询...');
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port
    });
    
    console.log('✓ 数据库连接成功');
    
    // 执行修复后的角色列表查询
    console.log('执行角色列表查询...');
    const [roles] = await connection.execute(
      `SELECT r.*, COUNT(u._id) as user_count 
       FROM roles r 
      LEFT JOIN users u ON r.name COLLATE utf8mb4_unicode_ci = u.role COLLATE utf8mb4_unicode_ci AND u.status != "deleted"
      WHERE r.status = "active" 
      GROUP BY r.id 
      ORDER BY r.create_time DESC`
    );
    
    console.log('✓ 角色列表查询成功！获取到', roles.length, '个角色');
    console.log('角色列表：');
    roles.forEach((role, index) => {
      console.log(`${index + 1}. ${role.name} (用户数量: ${role.user_count})`);
    });
    
    // 测试直接调用adminService中的getRoles函数
    try {
      console.log('\n测试直接调用adminService.getRoles函数...');
      const adminService = require('../services/adminService.js');
      const dbPool = mysql.createPool({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        port: config.port,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      
      const serviceRoles = await adminService.getRoles(dbPool);
      console.log('✓ adminService.getRoles调用成功！获取到', serviceRoles.length, '个角色');
      
    } catch (serviceError) {
      console.error('✗ adminService.getRoles调用失败:', serviceError);
      console.error('错误详情:', serviceError.message);
      console.error('错误堆栈:', serviceError.stack);
    }
    
  } catch (error) {
    console.error('✗ 测试过程中出现错误:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
  } finally {
    try {
      if (connection) {
        await connection.end();
        console.log('✓ 数据库连接已关闭');
      }
    } catch (closeError) {
      console.error('✗ 关闭数据库连接时出错:', closeError.message);
    }
    
    console.log('\n测试总结：');
    console.log('如果所有测试都通过，说明角色列表查询已成功修复！');
    console.log('系统现在应该可以正常获取角色列表了。');
  }
}

// 执行测试
if (require.main === module) {
  testRoleQuery();
}