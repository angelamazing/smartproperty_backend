const mysql = require('mysql2/promise');
const config = require('../config/database');

/**
 * 调试SQL查询问题
 */
class SQLDebugger {
  constructor() {
    this.db = null;
  }

  async connect() {
    try {
      this.db = await mysql.createConnection({
        host: config.database.host,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        port: config.database.port
      });
      console.log('✅ 数据库连接成功');
      return true;
    } catch (error) {
      console.log('❌ 数据库连接失败:', error.message);
      return false;
    }
  }

  async testBasicQuery() {
    try {
      console.log('\n🔍 测试基本查询...');
      
      // 测试1: 简单的COUNT查询
      const [countResult] = await this.db.execute(`
        SELECT COUNT(*) as total
        FROM activity_logs 
        WHERE userId = ? AND action = ?
      `, ['test-user', 'batch_import_menu']);
      
      console.log('✅ COUNT查询成功:', countResult[0].total);
      
      // 测试2: 带LIMIT的查询
      const [limitResult] = await this.db.execute(`
        SELECT _id, userId, action, createTime
        FROM activity_logs 
        WHERE userId = ? AND action = ?
        ORDER BY createTime DESC
        LIMIT ? OFFSET ?
      `, ['test-user', 'batch_import_menu', parseInt('10'), parseInt('0')]);
      
      console.log('✅ LIMIT查询成功，返回行数:', limitResult.length);
      
      return true;
    } catch (error) {
      console.log('❌ 查询失败:', error.message);
      console.log('错误详情:', error);
      return false;
    }
  }

  async testWithRealData() {
    try {
      console.log('\n🔍 测试真实数据查询...');
      
      // 先插入一条测试数据
      const logId = require('uuid').v4();
      await this.db.execute(`
        INSERT INTO activity_logs (_id, userId, action, resourceType, resourceId, details, ipAddress, createTime)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        logId,
        'test-user',
        'batch_import_menu',
        'menus',
        'test-batch-import',
        JSON.stringify({ test: 'data' }),
        '127.0.0.1'
      ]);
      
      console.log('✅ 测试数据插入成功');
      
      // 现在测试查询
      const [historyRows] = await this.db.execute(`
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
        LIMIT ? OFFSET ?
      `, ['test-user', 'batch_import_menu', 10, 0]);
      
      console.log('✅ 历史查询成功，返回行数:', historyRows.length);
      
      // 测试计数查询
      const [countResult] = await this.db.execute(`
        SELECT COUNT(*) as total
        FROM activity_logs 
        WHERE userId = ? AND action = ?
      `, ['test-user', 'batch_import_menu']);
      
      console.log('✅ 计数查询成功，总数:', countResult[0].total);
      
      // 清理测试数据
      await this.db.execute('DELETE FROM activity_logs WHERE _id = ?', [logId]);
      console.log('✅ 测试数据清理完成');
      
      return true;
    } catch (error) {
      console.log('❌ 真实数据查询失败:', error.message);
      console.log('错误详情:', error);
      return false;
    }
  }

  async checkTableStructure() {
    try {
      console.log('\n🔍 检查表结构...');
      
      const [columns] = await this.db.execute(`
        DESCRIBE activity_logs
      `);
      
      console.log('📋 activity_logs表结构:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
      
      return true;
    } catch (error) {
      console.log('❌ 检查表结构失败:', error.message);
      return false;
    }
  }

  async runDebug() {
    console.log('🧪 开始SQL查询调试\n');

    const connected = await this.connect();
    if (!connected) {
      return;
    }

    // 检查表结构
    await this.checkTableStructure();
    
    // 测试基本查询
    await this.testBasicQuery();
    
    // 测试真实数据查询
    await this.testWithRealData();

    if (this.db) {
      await this.db.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行调试
if (require.main === module) {
  const sqlDebugger = new SQLDebugger();
  sqlDebugger.runDebug().catch(console.error);
}

module.exports = SQLDebugger;
