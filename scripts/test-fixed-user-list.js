const mysql = require('mysql2/promise');
const config = require('../config/database');
const userService = require('../services/userService');

/**
 * 测试修复后的用户列表API
 */
async function testFixedUserList() {
  try {
    console.log('开始测试修复后的用户列表API...');
    
    // 创建数据库连接
    const db = await mysql.createPool(config.database);
    console.log('数据库连接池创建成功');
    
    // 调用修复后的getUserList方法
    console.log('调用修复后的getUserList方法...');
    const result = await userService.getUserList({}, 1, 10, db);
    
    console.log('\n✓ 修复成功！成功获取用户列表数据：');
    console.log('总记录数:', result.total);
    console.log('当前页码:', result.page);
    console.log('每页大小:', result.pageSize);
    console.log('返回记录数:', result.records.length);
    console.log('\n数据预览（前2条）:', result.records.slice(0, 2));
    
    // 关闭连接
    await db.end();
    console.log('\n✓ 数据库连接已关闭');
    console.log('\n✓ 测试完成！用户列表API修复成功！');
    
  } catch (error) {
    console.error('✗ 测试失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

// 执行测试
if (require.main === module) {
  testFixedUserList();
}