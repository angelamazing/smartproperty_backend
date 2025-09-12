const mysql = require('mysql2/promise');
const config = require('../config/database.js').database;

/**
 * 测试用户列表查询功能
 * 模拟adminService.getUsers函数的实现，以诊断SQL参数绑定问题
 */
async function testUserQuery() {
  let connection = null;
  try {
    console.log('开始测试用户列表查询功能...');
    
    // 创建数据库连接
    connection = await mysql.createConnection(config);
    console.log('✓ 数据库连接成功');
    
    // 模拟getUsers函数的参数
    const page = 1;
    const pageSize = 20;
    const filters = {}; // 空过滤器
    
    // 构建WHERE子句和参数数组
    let whereClause = 'WHERE u.status != "deleted"';
    const params = [];
    
    // 模拟getUsers函数中的逻辑
    console.log('构建的WHERE子句:', whereClause);
    console.log('参数数组:', params);
    
    // 尝试执行COUNT查询
    try {
      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM users u ${whereClause}`,
        params
      );
      console.log('✓ COUNT查询执行成功，总数:', countResult[0].total);
    } catch (error) {
      console.error('✗ COUNT查询执行失败:', error.message);
      console.error('错误详情:', error);
    }
    
    // 尝试执行主查询
    const offset = (page - 1) * pageSize;
    try {
      const [users] = await connection.execute(
        `SELECT u.*, d.name as department_name 
         FROM users u 
         LEFT JOIN departments d ON u.departmentId = d._id 
         ${whereClause} 
         ORDER BY u.createTime DESC 
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      console.log('✓ 主查询执行成功，获取到', users.length, '个用户');
      console.log('用户列表样例:', users.slice(0, 2));
    } catch (error) {
      console.error('✗ 主查询执行失败:', error.message);
      console.error('错误详情:', error);
      console.log('SQL语句:', `SELECT u.*, d.name as department_name FROM users u LEFT JOIN departments d ON u.departmentId = d._id ${whereClause} ORDER BY u.createTime DESC LIMIT ? OFFSET ?`);
      console.log('参数:', [...params, pageSize, offset]);
    }
    
    // 尝试修复方案：检查ORDER BY子句
    console.log('\n尝试修复方案...');
    try {
      const [users] = await connection.execute(
        `SELECT u.*, d.name as department_name 
         FROM users u 
         LEFT JOIN departments d ON u.departmentId = d._id 
         ${whereClause} 
         ORDER BY u.createTime DESC 
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      console.log('✓ 修复方案测试成功！');
    } catch (error) {
      console.error('✗ 修复方案测试失败:', error.message);
    }
    
  } catch (error) {
    console.error('✗ 测试过程中出现错误:', error.message);
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

// 执行测试
if (require.main === module) {
  testUserQuery();
}

module.exports = { testUserQuery };