const mysql = require('mysql2/promise');
const config = require('../config/database');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * 数据库索引优化脚本
 * 执行索引优化SQL，提升查询性能
 */
class DatabaseIndexOptimizer {
  
  constructor() {
    this.db = null;
    this.optimizationResults = {
      success: 0,
      failed: 0,
      skipped: 0,
      operations: []
    };
  }

  /**
   * 初始化数据库连接
   */
  async init() {
    try {
      this.db = mysql.createPool(config.database);
      logger.info('数据库连接池创建成功');
    } catch (error) {
      logger.error('数据库连接失败:', error);
      throw error;
    }
  }

  /**
   * 清理数据库连接
   */
  async cleanup() {
    if (this.db) {
      await this.db.end();
      logger.info('数据库连接已关闭');
    }
  }

  /**
   * 检查索引是否存在
   * @param {string} tableName - 表名
   * @param {string} indexName - 索引名
   * @returns {boolean} 索引是否存在
   */
  async checkIndexExists(tableName, indexName) {
    try {
      const [rows] = await this.db.execute(`
        SELECT COUNT(*) as count 
        FROM information_schema.statistics 
        WHERE table_schema = DATABASE() 
        AND table_name = ? 
        AND index_name = ?
      `, [tableName, indexName]);
      
      return rows[0].count > 0;
    } catch (error) {
      logger.warn(`检查索引存在性失败: ${tableName}.${indexName}`, error);
      return false;
    }
  }

  /**
   * 执行单个索引操作
   * @param {string} sql - SQL语句
   * @param {string} operation - 操作描述
   */
  async executeIndexOperation(sql, operation) {
    try {
      logger.info(`执行索引操作: ${operation}`);
      
      // 提取表名和索引名
      const tableMatch = sql.match(/ALTER TABLE (\w+) ADD INDEX (\w+)/);
      if (tableMatch) {
        const [, tableName, indexName] = tableMatch;
        
        // 检查索引是否已存在
        const exists = await this.checkIndexExists(tableName, indexName);
        if (exists) {
          logger.info(`索引已存在，跳过: ${tableName}.${indexName}`);
          this.optimizationResults.skipped++;
          this.optimizationResults.operations.push({
            operation,
            status: 'SKIPPED',
            reason: '索引已存在'
          });
          return;
        }
      }
      
      await this.db.execute(sql);
      logger.info(`索引操作成功: ${operation}`);
      this.optimizationResults.success++;
      this.optimizationResults.operations.push({
        operation,
        status: 'SUCCESS'
      });
    } catch (error) {
      logger.error(`索引操作失败: ${operation}`, error);
      this.optimizationResults.failed++;
      this.optimizationResults.operations.push({
        operation,
        status: 'FAILED',
        error: error.message
      });
    }
  }

  /**
   * 解析SQL文件并执行索引操作
   */
  async executeIndexOptimization() {
    try {
      const sqlFile = path.join(__dirname, '../sql/optimize_database_indexes.sql');
      const sqlContent = fs.readFileSync(sqlFile, 'utf8');
      
      // 分割SQL语句
      const sqlStatements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('/*') && stmt.includes('ALTER TABLE'));
      
      logger.info(`找到 ${sqlStatements.length} 个索引操作语句`);
      
      for (let i = 0; i < sqlStatements.length; i++) {
        const sql = sqlStatements[i];
        if (sql.includes('ALTER TABLE') && sql.includes('ADD INDEX')) {
          const operation = `索引操作 ${i + 1}`;
          await this.executeIndexOperation(sql, operation);
          
          // 添加延迟，避免对数据库造成过大压力
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      logger.error('执行索引优化失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前索引信息
   */
  async getCurrentIndexInfo() {
    try {
      const [rows] = await this.db.execute(`
        SELECT 
          table_name,
          index_name,
          column_name,
          seq_in_index,
          non_unique
        FROM information_schema.statistics 
        WHERE table_schema = DATABASE()
        ORDER BY table_name, index_name, seq_in_index
      `);
      
      return rows;
    } catch (error) {
      logger.error('获取索引信息失败:', error);
      return [];
    }
  }

  /**
   * 分析查询性能
   */
  async analyzeQueryPerformance() {
    try {
      logger.info('分析查询性能...');
      
      // 测试常用查询的性能
      const testQueries = [
        {
          name: '按日期餐次状态查询',
          sql: 'SELECT * FROM dining_orders WHERE diningDate = ? AND mealType = ? AND diningStatus = ?',
          params: ['2024-01-15', 'lunch', 'ordered']
        },
        {
          name: '按用户日期查询',
          sql: 'SELECT * FROM dining_orders WHERE userId = ? AND diningDate = ?',
          params: ['user1', '2024-01-15']
        },
        {
          name: '按部门日期查询',
          sql: 'SELECT * FROM dining_orders WHERE deptId = ? AND diningDate = ?',
          params: ['dept1', '2024-01-15']
        }
      ];
      
      const performanceResults = [];
      
      for (const query of testQueries) {
        try {
          const startTime = Date.now();
          await this.db.execute(query.sql, query.params);
          const endTime = Date.now();
          
          performanceResults.push({
            query: query.name,
            executionTime: endTime - startTime,
            status: 'SUCCESS'
          });
        } catch (error) {
          performanceResults.push({
            query: query.name,
            executionTime: null,
            status: 'FAILED',
            error: error.message
          });
        }
      }
      
      return performanceResults;
    } catch (error) {
      logger.error('分析查询性能失败:', error);
      return [];
    }
  }

  /**
   * 生成优化报告
   */
  generateOptimizationReport(indexInfo, performanceResults) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalOperations: this.optimizationResults.success + this.optimizationResults.failed + this.optimizationResults.skipped,
        successful: this.optimizationResults.success,
        failed: this.optimizationResults.failed,
        skipped: this.optimizationResults.skipped,
        successRate: ((this.optimizationResults.success / (this.optimizationResults.success + this.optimizationResults.failed)) * 100).toFixed(2) + '%'
      },
      indexInfo: {
        totalIndexes: indexInfo.length,
        tables: [...new Set(indexInfo.map(idx => idx.table_name))].length
      },
      performanceResults,
      operations: this.optimizationResults.operations
    };
    
    return report;
  }

  /**
   * 运行完整的索引优化流程
   */
  async runOptimization() {
    try {
      logger.info('开始数据库索引优化...');
      
      // 1. 获取优化前的索引信息
      logger.info('获取当前索引信息...');
      const beforeIndexInfo = await this.getCurrentIndexInfo();
      
      // 2. 执行索引优化
      logger.info('执行索引优化操作...');
      await this.executeIndexOptimization();
      
      // 3. 获取优化后的索引信息
      logger.info('获取优化后索引信息...');
      const afterIndexInfo = await this.getCurrentIndexInfo();
      
      // 4. 分析查询性能
      logger.info('分析查询性能...');
      const performanceResults = await this.analyzeQueryPerformance();
      
      // 5. 生成优化报告
      const report = this.generateOptimizationReport(afterIndexInfo, performanceResults);
      
      // 6. 输出报告
      this.printOptimizationReport(report);
      
      return report;
    } catch (error) {
      logger.error('索引优化失败:', error);
      throw error;
    }
  }

  /**
   * 输出优化报告
   */
  printOptimizationReport(report) {
    console.log('\n' + '='.repeat(60));
    console.log('数据库索引优化报告');
    console.log('='.repeat(60));
    console.log(`优化时间: ${report.timestamp}`);
    console.log(`总操作数: ${report.summary.totalOperations}`);
    console.log(`成功: ${report.summary.successful}`);
    console.log(`失败: ${report.summary.failed}`);
    console.log(`跳过: ${report.summary.skipped}`);
    console.log(`成功率: ${report.summary.successRate}`);
    
    console.log('\n索引统计:');
    console.log(`总索引数: ${report.indexInfo.totalIndexes}`);
    console.log(`涉及表数: ${report.indexInfo.tables}`);
    
    console.log('\n查询性能测试:');
    report.performanceResults.forEach(result => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      const time = result.executionTime ? `${result.executionTime}ms` : 'N/A';
      console.log(`${status} ${result.query}: ${time}`);
    });
    
    console.log('\n详细操作结果:');
    report.operations.forEach(op => {
      const status = op.status === 'SUCCESS' ? '✅' : op.status === 'SKIPPED' ? '⏭️' : '❌';
      console.log(`${status} ${op.operation}`);
      if (op.error) {
        console.log(`   错误: ${op.error}`);
      }
      if (op.reason) {
        console.log(`   原因: ${op.reason}`);
      }
    });
    
    console.log('='.repeat(60));
  }
}

// 运行优化
async function runOptimization() {
  const optimizer = new DatabaseIndexOptimizer();
  
  try {
    await optimizer.init();
    await optimizer.runOptimization();
  } catch (error) {
    logger.error('索引优化失败:', error);
    process.exit(1);
  } finally {
    await optimizer.cleanup();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runOptimization();
}

module.exports = DatabaseIndexOptimizer;
