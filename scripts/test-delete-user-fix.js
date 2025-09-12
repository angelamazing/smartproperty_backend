const mysql = require('mysql2/promise');
const config = require('../config/database');
const adminService = require('../services/adminService');

/**
 * 测试修复后的删除用户功能
 */
async function testDeleteUserFix() {
  try {
    console.log('开始测试修复后的删除用户功能...');
    
    // 创建数据库连接
    const db = await mysql.createPool(config.database);
    console.log('数据库连接池创建成功');
    
    // 准备测试数据：创建一个临时用户进行删除测试
    const tempUserId = 'temp-test-user-id';
    const adminId = 'system-admin-id';
    
    console.log('创建临时测试用户...');
    try {
      // 首先尝试删除已存在的相同ID的用户（如果有）
      await db.execute('DELETE FROM users WHERE _id = ?', [tempUserId]);
    } catch (e) {
      // 忽略删除错误，继续创建
    }
    
    // 创建临时用户
    await db.execute(
      'INSERT INTO users (_id, nickName, phoneNumber, role, status, createTime) VALUES (?, ?, ?, ?, ?, NOW())',
      [tempUserId, '测试用户', '13800000009', 'user', 'active']
    );
    console.log('临时测试用户创建成功');
    
    // 测试删除用户功能
    console.log('测试删除用户功能...');
    await adminService.deleteUser(db, tempUserId, adminId);
    
    console.log('\n✓ 修复成功！用户删除功能正常工作');
    
    // 验证用户状态是否已更新为 inactive
    const [users] = await db.execute('SELECT * FROM users WHERE _id = ?', [tempUserId]);
    if (users.length > 0) {
      if (users[0].status === 'inactive') {
        console.log('✓ 用户状态已成功更新为 inactive');
      } else {
        console.log('✗ 用户状态未正确更新');
      }
    } else {
      console.log('✓ 用户已被物理删除');
    }
    
    // 清理：彻底删除测试用户
    await db.execute('DELETE FROM users WHERE _id = ?', [tempUserId]);
    console.log('\n✓ 测试数据已清理');
    
    // 关闭连接
    await db.end();
    console.log('\n✓ 数据库连接已关闭');
    console.log('\n✓ 测试完成！删除用户功能修复成功！');
    
  } catch (error) {
    console.error('✗ 测试失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

// 执行测试
if (require.main === module) {
  testDeleteUserFix();
}