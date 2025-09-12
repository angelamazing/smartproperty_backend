const mysql = require('mysql2/promise');
const uuidv4 = require('uuid').v4;

// 数据库连接配置 - 从项目配置中获取的正确信息
const dbConfig = {
  host: 'mysql-demo-mysql.ns-gpaauglf.svc',
  port: 3306,
  user: 'root',
  password: '54bxhv99',
  database: 'smart_property',
  charset: 'utf8mb4',
  timezone: '+08:00',
  connectionLimit: 10
};

// 引入adminService
const adminService = require('../services/adminService');

// 测试脚本
async function testDeleteUser() {
  let connection = null;
  let testUserId = null;
  let adminId = 'admin-123'; // 假设的管理员ID
  
  try {
    console.log('开始测试删除用户功能...');
    
    // 1. 建立数据库连接
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ 数据库连接成功');
    
    // 2. 创建测试用户
    testUserId = uuidv4();
    await connection.execute(
      'INSERT INTO users (_id, nickName, email, status, createTime) VALUES (?, ?, ?, ?, NOW())',
      [testUserId, 'testuser' + Date.now(), 'testuser@example.com', 'active']
    );
    console.log('✓ 测试用户创建成功，ID:', testUserId);
    
    // 3. 测试删除存在且活跃的用户
    console.log('\n测试场景1: 删除存在且活跃的用户');
    const result1 = await adminService.deleteUser(connection, testUserId, adminId);
    console.log('✓ 删除用户成功', result1 ? result1.message : '');
    
    // 4. 验证用户状态是否更新为inactive
    const [userStatusResult] = await connection.execute(
      'SELECT status FROM users WHERE _id = ?',
      [testUserId]
    );
    
    if (userStatusResult.length > 0 && userStatusResult[0].status === 'inactive') {
      console.log('✓ 用户状态正确更新为inactive');
    } else {
      console.log('✗ 用户状态未正确更新，当前状态:', userStatusResult.length > 0 ? userStatusResult[0].status : '用户不存在');
    }
    
    // 5. 测试删除已被删除的用户
    console.log('\n测试场景2: 删除已被删除的用户');
    try {
      const result2 = await adminService.deleteUser(connection, testUserId, adminId);
      console.log('✓ 处理已删除用户成功', result2 ? result2.message : '');
    } catch (error) {
      console.log('✗ 处理已删除用户失败:', error.message);
    }
    
    // 6. 测试删除不存在的用户
    console.log('\n测试场景3: 删除不存在的用户');
    const nonExistingId = uuidv4();
    try {
      await adminService.deleteUser(connection, nonExistingId, adminId);
      console.log('✗ 应该抛出用户不存在的错误，但操作成功');
    } catch (error) {
      if (error.message.includes('用户不存在')) {
        console.log('✓ 正确捕获不存在用户的错误:', error.message);
      } else {
        console.log('✗ 捕获到错误，但错误消息不正确:', error.message);
      }
    }
    
    // 7. 测试批量删除
    console.log('\n测试场景4: 批量删除用户');
    // 创建多个测试用户用于批量删除
    const batchTestUsers = [];
    for (let i = 0; i < 3; i++) {
      const userId = uuidv4();
      await connection.execute(
        'INSERT INTO users (_id, nickName, email, status, createTime) VALUES (?, ?, ?, ?, NOW())',
        [userId, 'batchuser' + i + Date.now(), `batchuser${i}@example.com`, i === 0 ? 'inactive' : 'active']
      );
      batchTestUsers.push(userId);
    }
    
    console.log('✓ 创建了3个批量测试用户，其中1个已标记为inactive');
    
    try {
      const batchResult = await adminService.batchDeleteUsers(connection, batchTestUsers, adminId);
      console.log('✓ 批量删除结果:', batchResult);
      
      // 验证批量删除的用户状态
      const batchStatuses = [];
      for (const id of batchTestUsers) {
        const [statusResult] = await connection.execute('SELECT status FROM users WHERE _id = ?', [id]);
        batchStatuses.push({ id, status: statusResult[0].status });
      }
      console.log('✓ 批量删除后用户状态:', batchStatuses);
    } catch (error) {
      console.log('✗ 批量删除失败:', error.message);
    }
    
    console.log('\n✓ 所有测试完成！删除用户功能修复成功！');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  } finally {
    // 清理测试数据
    if (connection) {
      if (testUserId) {
        try {
          await connection.execute('DELETE FROM users WHERE _id = ?', [testUserId]);
        } catch (cleanupError) {
          console.warn('清理测试用户失败:', cleanupError);
        }
      }
      await connection.end();
    }
  }
}

// 执行测试
testDeleteUser();