/**
 * 检查activity_logs表结构
 */

const mysql = require('mysql2/promise');
const config = require('../config/database');

class TableStructureChecker {
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

  async checkTableStructure() {
    try {
      console.log('🔍 检查activity_logs表结构...\n');

      // 查看表结构
      const [columns] = await this.connection.execute(`
        DESCRIBE activity_logs
      `);

      console.log('📋 表结构:');
      columns.forEach(col => {
        console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });

      // 查看details字段的具体内容
      console.log('\n🔍 查看details字段内容:');
      const [rows] = await this.connection.execute(`
        SELECT _id, details, JSON_TYPE(details) as details_type
        FROM activity_logs
        WHERE action = 'batch_import_menu'
        ORDER BY createTime DESC
        LIMIT 2
      `);

      rows.forEach((row, index) => {
        console.log(`\n${index + 1}. 记录ID: ${row._id}`);
        console.log(`   Details类型: ${row.details_type}`);
        console.log(`   Details值: ${typeof row.details}`);
        console.log(`   Details内容: ${JSON.stringify(row.details, null, 2)}`);
      });

      // 尝试直接查询JSON字段
      console.log('\n🔍 尝试查询JSON字段:');
      const [jsonRows] = await this.connection.execute(`
        SELECT 
          _id,
          JSON_EXTRACT(details, '$.summary') as summary,
          JSON_EXTRACT(details, '$.success') as success,
          JSON_EXTRACT(details, '$.failed') as failed
        FROM activity_logs
        WHERE action = 'batch_import_menu'
        ORDER BY createTime DESC
        LIMIT 1
      `);

      if (jsonRows.length > 0) {
        const row = jsonRows[0];
        console.log(`\n📊 JSON字段解析:`);
        console.log(`   Summary: ${JSON.stringify(row.summary, null, 2)}`);
        console.log(`   Success: ${JSON.stringify(row.success, null, 2)}`);
        console.log(`   Failed: ${JSON.stringify(row.failed, null, 2)}`);
      }

    } catch (error) {
      console.error('❌ 检查过程中发生错误:', error.message);
    }
  }
}

// 运行检查
async function main() {
  const checker = new TableStructureChecker();
  
  try {
    await checker.connect();
    await checker.checkTableStructure();
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await checker.disconnect();
  }
}

main();
