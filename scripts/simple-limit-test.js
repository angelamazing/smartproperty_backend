const mysql = require('mysql2/promise');
const config = require('../config/database');

async function testLimitQuery() {
  let db;
  try {
    console.log('🔍 测试LIMIT查询...');
    
    db = await mysql.createConnection({
      host: config.database.host,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      port: config.database.port
    });
    
    console.log('✅ 数据库连接成功');
    
    // 测试1: 最简单的LIMIT查询
    console.log('\n测试1: 最简单的LIMIT查询');
    const [result1] = await db.execute(`
      SELECT _id, userId, action, createTime
      FROM activity_logs 
      LIMIT 5
    `);
    console.log('✅ 简单LIMIT查询成功，返回行数:', result1.length);
    
    // 测试2: 带WHERE的LIMIT查询
    console.log('\n测试2: 带WHERE的LIMIT查询');
    const [result2] = await db.execute(`
      SELECT _id, userId, action, createTime
      FROM activity_logs 
      WHERE userId = ?
      LIMIT 5
    `, ['test-user']);
    console.log('✅ WHERE LIMIT查询成功，返回行数:', result2.length);
    
    // 测试3: 带WHERE和ORDER BY的LIMIT查询
    console.log('\n测试3: 带WHERE和ORDER BY的LIMIT查询');
    const [result3] = await db.execute(`
      SELECT _id, userId, action, createTime
      FROM activity_logs 
      WHERE userId = ?
      ORDER BY createTime DESC
      LIMIT 5
    `, ['test-user']);
    console.log('✅ WHERE ORDER BY LIMIT查询成功，返回行数:', result3.length);
    
    // 测试4: 带WHERE、ORDER BY、LIMIT和OFFSET的查询
    console.log('\n测试4: 完整的LIMIT OFFSET查询');
    const [result4] = await db.execute(`
      SELECT _id, userId, action, createTime
      FROM activity_logs 
      WHERE userId = ?
      ORDER BY createTime DESC
      LIMIT ? OFFSET ?
    `, ['test-user', 5, 0]);
    console.log('✅ 完整LIMIT OFFSET查询成功，返回行数:', result4.length);
    
    // 测试5: 使用数字而不是字符串
    console.log('\n测试5: 使用数字参数');
    const [result5] = await db.execute(`
      SELECT _id, userId, action, createTime
      FROM activity_logs 
      WHERE userId = ?
      ORDER BY createTime DESC
      LIMIT ? OFFSET ?
    `, ['test-user', 5, 0]);
    console.log('✅ 数字参数查询成功，返回行数:', result5.length);
    
    console.log('\n🎉 所有测试通过！');
    
  } catch (error) {
    console.log('❌ 测试失败:', error.message);
    console.log('错误详情:', error);
  } finally {
    if (db) {
      await db.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

testLimitQuery();
