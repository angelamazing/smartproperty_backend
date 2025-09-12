const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const { getUserList } = require('../services/userService');

// 数据库连接配置
const dbConfig = {
  host: 'mysql-demo-mysql.ns-gpaauglf.svc',
  port: 3306,
  user: 'root',
  password: '54bxhv99',
  database: 'smart_property',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 测试函数
async function testUserListFilter() {
  let db = null;
  let tempUserId = null;
  let activeUserId = null;
  
  try {
    // 创建数据库连接
    db = await mysql.createPool(dbConfig);
    console.log('✓ 数据库连接成功');
    
    // 创建一个临时用户并设置为inactive状态
    tempUserId = uuidv4();
    const testUserName = `测试用户_${Date.now()}`;
    
    await db.execute(
      'INSERT INTO users (_id, nickName, status, createTime, updateTime) VALUES (?, ?, ?, NOW(), NOW())',
      [tempUserId, testUserName, 'inactive']
    );
    console.log(`✓ 创建临时inactive用户: ${testUserName}`);
    
    // 创建一个活跃用户用于对比
    const activeUserId = uuidv4();
    const activeUserName = `活跃用户_${Date.now()}`;
    
    await db.execute(
      'INSERT INTO users (_id, nickName, status, createTime, updateTime) VALUES (?, ?, ?, NOW(), NOW())',
      [activeUserId, activeUserName, 'active']
    );
    console.log(`✓ 创建临时active用户: ${activeUserName}`);
    
    // 测试1: 不指定status筛选条件，应该只返回active用户
    console.log('\n测试1: 不指定status筛选条件');
    const result1 = await getUserList({}, 1, 10, db);
    
    const inactiveUserFound = result1.records.some(user => user._id === tempUserId);
    const activeUserFound = result1.records.some(user => user._id === activeUserId);
    
    if (!inactiveUserFound && activeUserFound) {
      console.log('✓ 修复成功！默认情况下，inactive用户不会显示在列表中');
    } else {
      console.log('✗ 修复失败！默认情况下，inactive用户仍显示在列表中');
      console.log(`  inactive用户是否在列表中: ${inactiveUserFound}`);
      console.log(`  active用户是否在列表中: ${activeUserFound}`);
    }
    
    // 测试2: 明确指定status为inactive，应该能找到该用户
    console.log('\n测试2: 明确指定status为inactive');
    const result2 = await getUserList({ status: 'inactive' }, 1, 10, db);
    
    const inactiveUserFoundWithFilter = result2.records.some(user => user._id === tempUserId);
    
    if (inactiveUserFoundWithFilter) {
      console.log('✓ 验证成功！明确指定status为inactive时，可以找到该用户');
    } else {
      console.log('✗ 验证失败！明确指定status为inactive时，找不到该用户');
    }
    
    // 测试3: 明确指定status为active，应该只返回active用户
    console.log('\n测试3: 明确指定status为active');
    const result3 = await getUserList({ status: 'active' }, 1, 10, db);
    
    const inactiveUserFoundWithActiveFilter = result3.records.some(user => user._id === tempUserId);
    const activeUserFoundWithActiveFilter = result3.records.some(user => user._id === activeUserId);
    
    if (!inactiveUserFoundWithActiveFilter && activeUserFoundWithActiveFilter) {
      console.log('✓ 验证成功！明确指定status为active时，只返回active用户');
    } else {
      console.log('✗ 验证失败！明确指定status为active时，结果不正确');
      console.log(`  inactive用户是否在列表中: ${inactiveUserFoundWithActiveFilter}`);
      console.log(`  active用户是否在列表中: ${activeUserFoundWithActiveFilter}`);
    }
    
  } catch (error) {
    console.error('✗ 测试过程中发生错误:', error);
  } finally {
    // 清理临时数据
    if (db && tempUserId) {
      try {
        await db.execute('DELETE FROM users WHERE _id = ?', [tempUserId]);
        await db.execute('DELETE FROM users WHERE _id = ?', [activeUserId]);
        console.log('\n✓ 清理临时数据成功');
      } catch (cleanupError) {
        console.error('✗ 清理临时数据失败:', cleanupError);
      }
    }
    
    // 关闭数据库连接
    if (db) {
      db.end();
      console.log('✓ 数据库连接已关闭');
    }
    
    console.log('\n测试完成！');
  }
}

// 运行测试
console.log('开始测试用户列表状态过滤功能...\n');
testUserListFilter();