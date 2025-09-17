const mysql = require('mysql2/promise');
const config = require('../config/database');

async function testFixedQuery() {
  let db;
  try {
    console.log('🔍 测试修复后的查询...');
    
    db = await mysql.createConnection({
      host: config.database.host,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      port: config.database.port
    });
    
    console.log('✅ 数据库连接成功');
    
    // 测试修复后的查询
    const page = 1;
    const pageSize = 10;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    console.log(`\n测试参数: page=${page}, pageSize=${pageSize}, offset=${offset}`);
    
    const [historyRows] = await db.execute(`
      SELECT 
        _id,
        userId,
        action,
        resourceType,
        resourceId,
        details,
        ipAddress,
        createTime
      FROM activity_logs 
      WHERE userId = ? AND action = ?
      ORDER BY createTime DESC
      LIMIT ${parseInt(pageSize)} OFFSET ${offset}
    `, ['test-user', 'batch_import_menu']);
    
    console.log('✅ 修复后的查询成功，返回行数:', historyRows.length);
    
    // 测试计数查询
    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total
      FROM activity_logs 
      WHERE userId = ? AND action = ?
    `, ['test-user', 'batch_import_menu']);
    
    console.log('✅ 计数查询成功，总数:', countResult[0].total);
    
    console.log('\n🎉 修复验证成功！');
    
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

testFixedQuery();

