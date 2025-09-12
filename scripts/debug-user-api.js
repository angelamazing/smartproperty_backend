const mysql = require('mysql2/promise');
const config = require('../config/database.js').database;

/**
 * 调试用户列表API，模拟实际请求过程
 */
async function debugUserAPI() {
  let connection = null;
  try {
    console.log('开始调试用户列表API...');
    
    // 创建数据库连接
    connection = await mysql.createConnection(config);
    console.log('✓ 数据库连接成功');
    
    // 完全模拟adminService.getUsers函数的参数
    const page = 1;
    const pageSize = 20;
    const filters = {}; // 空过滤器，与实际API调用一致
    
    // 完全复制adminService.js中的getUsers函数实现
    let whereClause = 'WHERE u.status != "deleted"';
    const params = [];
    
    if (filters.keyword) {
      whereClause += ' AND (u.nickName LIKE ? OR u.phoneNumber LIKE ? OR u.email LIKE ?)';
      const keyword = `%${filters.keyword}%`;
      params.push(keyword, keyword, keyword);
    }
    
    if (filters.role) {
      whereClause += ' AND u.role = ?';
      params.push(filters.role);
    }
    
    if (filters.status) {
      whereClause += ' AND u.status = ?';
      params.push(filters.status);
    }
    
    if (filters.departmentId) {
      whereClause += ' AND u.departmentId = ?';
      params.push(filters.departmentId);
    }
    
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
    
    // 尝试执行主查询 - 完全复制adminService.js中的SQL
    const offset = (page - 1) * pageSize;
    const finalParams = [...params, pageSize, offset];
    
    console.log('\n准备执行主查询:');
    console.log('SQL语句:', `SELECT u.*, d.name as department_name FROM users u LEFT JOIN departments d ON u.departmentId = d._id ${whereClause} ORDER BY u.createTime DESC LIMIT ? OFFSET ?`);
    console.log('参数数组:', finalParams);
    console.log('参数类型:', finalParams.map(p => typeof p));
    
    try {
      // 使用准备好的语句执行查询
      const [users] = await connection.execute(
        `SELECT u.*, d.name as department_name 
         FROM users u 
         LEFT JOIN departments d ON u.departmentId = d._id 
         ${whereClause} 
         ORDER BY u.createTime DESC 
         LIMIT ? OFFSET ?`,
        finalParams
      );
      console.log('✓ 主查询执行成功！获取到', users.length, '个用户');
      console.log('用户列表样例:', users.slice(0, 2));
      
      // 验证结果
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      console.log('\n处理后的安全用户列表:', safeUsers.slice(0, 2));
      console.log('✓ API调用模拟成功！');
      
    } catch (error) {
      console.error('✗ 主查询执行失败:', error.message);
      console.error('错误详情:', error);
      
      // 尝试不同的参数绑定方式
      console.log('\n尝试使用直接值而不是参数绑定...');
      try {
        const [users] = await connection.execute(
          `SELECT u.*, d.name as department_name 
           FROM users u 
           LEFT JOIN departments d ON u.departmentId = d._id 
           ${whereClause} 
           ORDER BY u.createTime DESC 
           LIMIT ${pageSize} OFFSET ${offset}`
        );
        console.log('✓ 直接值方式执行成功！获取到', users.length, '个用户');
        console.log('这表明SQL语句本身是正确的，但参数绑定可能有问题');
      } catch (err) {
        console.error('✗ 直接值方式也执行失败:', err.message);
        console.log('这表明SQL语句本身可能存在问题');
      }
    }
    
  } catch (error) {
    console.error('✗ 调试过程中出现错误:', error.message);
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

// 执行调试
if (require.main === module) {
  debugUserAPI();
}

module.exports = { debugUserAPI };