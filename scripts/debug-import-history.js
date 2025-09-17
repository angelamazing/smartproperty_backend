/**
 * 调试导入历史数据
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');

class ImportHistoryAnalyzer {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection(config.database);
      console.log('✅ 数据库连接成功');
    } catch (error) {
      console.error('❌ 数据库连接失败:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }

  async debugImportHistory() {
    try {
      console.log('🔍 调试导入历史数据...\n');

      // 查询最新的导入记录
      const [rows] = await this.connection.execute(`
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
        WHERE action = 'batch_import_menu'
        ORDER BY createTime DESC
        LIMIT 5
      `);

      console.log(`📊 找到 ${rows.length} 条导入记录:\n`);

      rows.forEach((record, index) => {
        console.log(`${index + 1}. 记录ID: ${record._id}`);
        console.log(`   用户ID: ${record.userId}`);
        console.log(`   资源ID: ${record.resourceId}`);
        console.log(`   创建时间: ${record.createTime}`);
        console.log(`   Details类型: ${typeof record.details}`);
        console.log(`   Details长度: ${record.details ? record.details.length : 0}`);
        
        if (record.details) {
          try {
            const details = JSON.parse(record.details);
            console.log(`   Details内容:`, JSON.stringify(details, null, 2));
          } catch (parseError) {
            console.log(`   Details解析失败: ${parseError.message}`);
            console.log(`   原始Details: ${record.details}`);
          }
        } else {
          console.log(`   Details为空`);
        }
        console.log('   ' + '-'.repeat(50));
      });

      // 检查是否有成功的导入记录
      const [successRows] = await this.connection.execute(`
        SELECT COUNT(*) as count
        FROM activity_logs
        WHERE action = 'batch_import_menu'
        AND details LIKE '%"success":true%'
      `);

      console.log(`\n📈 成功导入记录数: ${successRows[0].count}`);

      // 检查是否有失败的导入记录
      const [failedRows] = await this.connection.execute(`
        SELECT COUNT(*) as count
        FROM activity_logs
        WHERE action = 'batch_import_menu'
        AND details LIKE '%"success":false%'
      `);

      console.log(`📉 失败导入记录数: ${failedRows[0].count}`);

    } catch (error) {
      console.error('❌ 调试过程中发生错误:', error.message);
    }
  }
}

// 运行调试
async function main() {
  const analyzer = new ImportHistoryAnalyzer();
  
  try {
    await analyzer.connect();
    await analyzer.debugImportHistory();
  } catch (error) {
    console.error('❌ 调试失败:', error.message);
  } finally {
    await analyzer.disconnect();
  }
}

main();
