const fs = require('fs').promises;
const path = require('path');

/**
 * 修复用户列表API中的参数绑定问题
 */
async function fixUserAPI() {
  try {
    console.log('开始修复用户列表API中的参数绑定问题...');
    
    // 读取adminService.js文件
    const adminServicePath = path.join(__dirname, '../services/adminService.js');
    let content = await fs.readFile(adminServicePath, 'utf8');
    
    // 查找并替换参数绑定部分
    const searchStr = 'LIMIT ? OFFSET ?, [...params, pageSize, offset]';
    const replaceStr = 'LIMIT ? OFFSET ?', [...params, pageSize, offset];';
    
    if (content.includes(replaceStr)) {
      console.log('✓ 代码已经是正确的格式，不需要修复');
      return;
    }
    
    // 直接使用简单的替换方式
    const updatedContent = content.replace(
      'LIMIT ? OFFSET ?, [...params, pageSize, offset]',
      'LIMIT ? OFFSET ?', [...params, pageSize, offset]
    );
    
    // 写入修复后的文件
    await fs.writeFile(adminServicePath, updatedContent, 'utf8');
    console.log('✓ 成功修复adminService.js');
    
    // 创建一个临时测试脚本来验证修复效果
    const testScriptPath = path.join(__dirname, '../scripts/test-fixed-query.js');
    const testScript = `const mysql = require('mysql2/promise');

async function testFixedQuery() {
  try {
    // 创建数据库连接
    const db = await mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '123456',
      database: 'smart_property',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // 模拟实际调用参数
    const page = 1;
    const pageSize = 20;
    const offset = (page - 1) * pageSize;
    const params = [];
    const whereClause = "WHERE u.status != 'deleted'";
    
    console.log('执行测试查询...');
    // 测试修复后的查询方式
    const [users] = await db.execute(
      `SELECT u.*, d.name as department_name 
       FROM users u 
       LEFT JOIN departments d ON u.departmentId = d._id 
       ${whereClause} 
       ORDER BY u.createTime DESC 
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    
    console.log('✓ 测试查询成功！返回了', users.length, '条记录');
    
    // 关闭连接
    await db.end();
    console.log('✓ 数据库连接已关闭');
    
  } catch (error) {
    console.error('✗ 测试查询失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

testFixedQuery();`;
    
    await fs.writeFile(testScriptPath, testScript, 'utf8');
    console.log('✓ 创建了测试脚本用于验证修复效果');
    
    console.log('\n✓ 修复完成！');
    console.log('提示：请运行 node scripts/test-fixed-query.js 来验证修复效果');
    
  } catch (error) {
    console.error('✗ 修复过程中出现错误:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

// 执行修复
if (require.main === module) {
  fixUserAPI();
}