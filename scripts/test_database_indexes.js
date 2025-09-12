const mysql = require('mysql2/promise');
const config = require('../config/database');
const logger = require('../utils/logger');

/**
 * 测试数据库索引优化
 */
class DatabaseIndexTest {
  
  constructor() {
    this.db = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
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
   * 运行单个测试
   */
  async runTest(testName, testFunction) {
    try {
      logger.info(`开始测试: ${testName}`);
      await testFunction();
      this.testResults.passed++;
      this.testResults.tests.push({ name: testName, status: 'PASSED' });
      logger.info(`✅ 测试通过: ${testName}`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.tests.push({ name: testName, status: 'FAILED', error: error.message });
      logger.error(`❌ 测试失败: ${testName}`, error);
    }
  }

  /**
   * 测试1: 检查现有索引
   */
  async testExistingIndexes() {
    const [rows] = await this.db.execute(`
      SELECT 
        table_name,
        index_name,
        column_name,
        seq_in_index
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE()
      AND table_name IN ('dining_orders', 'dining_confirmation_logs', 'users')
      ORDER BY table_name, index_name, seq_in_index
    `);
    
    if (rows.length === 0) {
      throw new Error('没有找到相关表的索引信息');
    }
    
    logger.info(`找到 ${rows.length} 个索引`);
  }

  /**
   * 测试2: 添加简单索引
   */
  async testAddSimpleIndex() {
    // 尝试添加一个简单的索引
    try {
      await this.db.execute(`
        ALTER TABLE dining_orders ADD INDEX idx_test_optimization (diningDate)
      `);
      logger.info('成功添加测试索引');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        logger.info('测试索引已存在，跳过');
      } else {
        throw error;
      }
    }
  }

  /**
   * 测试3: 查询性能测试
   */
  async testQueryPerformance() {
    const testQueries = [
      {
        name: '按日期查询',
        sql: 'SELECT COUNT(*) FROM dining_orders WHERE diningDate = ?',
        params: ['2024-01-15']
      },
      {
        name: '按状态查询',
        sql: 'SELECT COUNT(*) FROM dining_orders WHERE diningStatus = ?',
        params: ['ordered']
      },
      {
        name: '按用户查询',
        sql: 'SELECT COUNT(*) FROM dining_orders WHERE userId = ?',
        params: ['user1']
      }
    ];
    
    for (const query of testQueries) {
      const startTime = Date.now();
      await this.db.execute(query.sql, query.params);
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      logger.info(`${query.name} 执行时间: ${executionTime}ms`);
      
      if (executionTime > 1000) {
        throw new Error(`${query.name} 执行时间过长: ${executionTime}ms`);
      }
    }
  }

  /**
   * 测试4: 检查表结构
   */
  async testTableStructure() {
    const tables = ['dining_orders', 'dining_confirmation_logs', 'users'];
    
    for (const table of tables) {
      const [rows] = await this.db.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() AND table_name = ?
        ORDER BY ordinal_position
      `, [table]);
      
      if (rows.length === 0) {
        throw new Error(`表 ${table} 不存在`);
      }
      
      logger.info(`表 ${table} 有 ${rows.length} 个字段`);
    }
  }

  /**
   * 测试5: 删除测试索引
   */
  async testRemoveTestIndex() {
    try {
      await this.db.execute(`
        ALTER TABLE dining_orders DROP INDEX idx_test_optimization
      `);
      logger.info('成功删除测试索引');
    } catch (error) {
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        logger.info('测试索引不存在，跳过删除');
      } else {
        throw error;
      }
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    logger.info('开始运行数据库索引测试...');
    
    await this.runTest('检查现有索引', () => this.testExistingIndexes());
    await this.runTest('检查表结构', () => this.testTableStructure());
    await this.runTest('查询性能测试', () => this.testQueryPerformance());
    await this.runTest('添加简单索引', () => this.testAddSimpleIndex());
    await this.runTest('删除测试索引', () => this.testRemoveTestIndex());

    // 输出测试结果
    this.printTestResults();
  }

  /**
   * 输出测试结果
   */
  printTestResults() {
    console.log('\n' + '='.repeat(50));
    console.log('数据库索引测试结果');
    console.log('='.repeat(50));
    console.log(`总测试数: ${this.testResults.passed + this.testResults.failed}`);
    console.log(`通过: ${this.testResults.passed}`);
    console.log(`失败: ${this.testResults.failed}`);
    console.log(`成功率: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(2)}%`);
    
    console.log('\n详细结果:');
    this.testResults.tests.forEach(test => {
      const status = test.status === 'PASSED' ? '✅' : '❌';
      console.log(`${status} ${test.name}`);
      if (test.error) {
        console.log(`   错误: ${test.error}`);
      }
    });
    
    console.log('='.repeat(50));
  }
}

// 运行测试
async function runTests() {
  const tester = new DatabaseIndexTest();
  
  try {
    await tester.init();
    await tester.runAllTests();
  } catch (error) {
    logger.error('测试运行失败:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runTests();
}

module.exports = DatabaseIndexTest;
