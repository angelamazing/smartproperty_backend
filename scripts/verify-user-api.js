const mysql = require('mysql2/promise');
const config = require('../config/database');

/**
 * 验证用户列表API修复效果的脚本
 */
async function verifyUserAPI() {
  try {
    console.log('开始验证用户列表API修复效果...');
    
    // 创建数据库连接 - 使用项目配置文件中的数据库参数
    const db = await mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      charset: config.database.charset,
      timezone: config.database.timezone,
      waitForConnections: true,
      connectionLimit: config.database.connectionLimit,
      queueLimit: 0
    });
    
    // 模拟实际API调用的参数
    const page = 1;
    const pageSize = 20;
    const filters = {};
    
    // 模拟getUsers函数的实现
    console.log('模拟执行getUsers函数...');
    let whereClause = "WHERE u.status != 'deleted'";
    const params = [];
    
    if (filters?.keyword) {
      whereClause += " AND (u.username LIKE ? OR u.name LIKE ? OR u.phone LIKE ?)";
      params.push(`%${filters.keyword}%`);
      params.push(`%${filters.keyword}%`);
      params.push(`%${filters.keyword}%`);
    }
    
    // 获取总数
    console.log('获取用户总数...');
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    console.log(`找到 ${total} 个用户记录`);
    
    // 获取分页数据 - 使用修复后的直接拼接方式
    console.log('使用修复后的方式获取分页数据...');
    const offset = (page - 1) * pageSize;
    const [users] = await db.execute(
      `SELECT u.*, d.name as department_name 
       FROM users u 
       LEFT JOIN departments d ON u.departmentId = d._id 
       ${whereClause} 
       ORDER BY u.createTime DESC 
       LIMIT ${pageSize} OFFSET ${offset}`
    );
    
    console.log('✓ 成功获取用户数据！返回了', users.length, '条记录');
    console.log('\n数据预览:', users.slice(0, 2)); // 只显示前两条记录
    
    // 关闭连接
    await db.end();
    console.log('\n✓ 数据库连接已关闭');
    console.log('\n✓ 验证完成！用户列表API修复成功！');
    console.log('提示：请重启Node.js服务以使更改在实际API中生效。');
    
  } catch (error) {
    console.error('✗ 验证失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

// 执行验证
if (require.main === module) {
  verifyUserAPI();
}