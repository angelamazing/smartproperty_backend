const mysql = require('mysql2/promise');
const config = require('../config/database');

/**
 * 测试SQL查询修复
 */
class SQLFixTester {
  constructor() {
    this.db = null;
  }

  /**
   * 连接数据库
   */
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

  /**
   * 测试修复后的SQL查询
   */
  async testImportHistoryQuery() {
    try {
      console.log('\n📚 测试导入历史SQL查询...');

      // 测试修复后的查询
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
      `, ['test-user-id', 'batch_import_menu', 10, 0]);

      console.log('✅ SQL查询执行成功');
      console.log('📊 查询结果:');
      console.log('  - 返回行数:', historyRows.length);

      // 测试计数查询
      const [countResult] = await this.db.execute(`
        SELECT COUNT(*) as total
        FROM activity_logs 
        WHERE userId = ? AND action = ?
      `, ['test-user-id', 'batch_import_menu']);

      console.log('✅ 计数查询执行成功');
      console.log('  - 总记录数:', countResult[0].total);

      return true;
    } catch (error) {
      console.log('❌ SQL查询失败:', error.message);
      return false;
    }
  }

  /**
   * 测试插入操作日志
   */
  async testInsertActivityLog() {
    try {
      console.log('\n📝 测试插入操作日志...');

      const logId = require('uuid').v4();
      const testData = {
        summary: { totalMenus: 3, successCount: 3, failedCount: 0 },
        success: [{ date: '2025-09-18', mealType: 'breakfast' }],
        failed: [],
        filename: 'test-import.xlsx',
        success: true
      };

      await this.db.execute(`
        INSERT INTO activity_logs (_id, userId, action, resourceType, resourceId, details, ipAddress, createTime)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        logId,
        'test-user-id',
        'batch_import_menu',
        'menus',
        'batch_import_' + Date.now(),
        JSON.stringify(testData),
        '127.0.0.1'
      ]);

      console.log('✅ 操作日志插入成功');
      console.log('  - 日志ID:', logId);

      return true;
    } catch (error) {
      console.log('❌ 操作日志插入失败:', error.message);
      return false;
    }
  }

  /**
   * 运行完整测试
   */
  async runTest() {
    console.log('🧪 开始SQL修复测试\n');

    // 1. 连接数据库
    const connected = await this.connect();
    if (!connected) {
      console.log('❌ 测试终止：数据库连接失败');
      return;
    }

    // 2. 测试插入操作日志
    const insertSuccess = await this.testInsertActivityLog();
    if (!insertSuccess) {
      console.log('❌ 测试终止：插入操作日志失败');
      return;
    }

    // 3. 测试查询导入历史
    const querySuccess = await this.testImportHistoryQuery();
    if (!querySuccess) {
      console.log('❌ 测试终止：查询导入历史失败');
      return;
    }

    console.log('\n🎉 SQL修复测试完成！');
    console.log('\n📋 修复内容:');
    console.log('✅ 修复了SQL查询参数绑定问题');
    console.log('✅ 添加了批量导入操作日志记录');
    console.log('✅ 修复了导入历史查询功能');
    console.log('✅ 支持JSON格式的详情记录');

    // 关闭数据库连接
    if (this.db) {
      await this.db.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行测试
if (require.main === module) {
  const tester = new SQLFixTester();
  tester.runTest().catch(console.error);
}

module.exports = SQLFixTester;
