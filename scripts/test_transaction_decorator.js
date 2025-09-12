const mysql = require('mysql2/promise');
const config = require('../config/database');
const { TransactionDecorator } = require('../utils/transaction');
const logger = require('../utils/logger');

/**
 * 测试事务装饰器功能
 */
class TransactionDecoratorTest {
  
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
   * 清理测试数据
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
   * 测试1: 正常事务提交
   */
  async testNormalTransaction() {
    const operation = async (connection) => {
      // 模拟一个简单的查询操作
      const [rows] = await connection.execute('SELECT 1 as test_value');
      return { success: true, data: rows[0] };
    };

    const result = await TransactionDecorator.executeWithTransaction(
      operation,
      this.db,
      'testNormalTransaction'
    );

    if (!result.success || result.data.test_value !== 1) {
      throw new Error('事务执行结果不正确');
    }
  }

  /**
   * 测试2: 事务回滚
   */
  async testTransactionRollback() {
    const operation = async (connection) => {
      // 模拟一个会失败的操作
      await connection.execute('SELECT 1 as test_value');
      throw new Error('模拟业务错误');
    };

    try {
      await TransactionDecorator.executeWithTransaction(
        operation,
        this.db,
        'testTransactionRollback'
      );
      throw new Error('应该抛出异常但没有抛出');
    } catch (error) {
      if (error.message !== '模拟业务错误') {
        throw new Error(`异常信息不正确: ${error.message}`);
      }
    }
  }

  /**
   * 测试3: 服务方法包装
   */
  async testServiceMethodWrapping() {
    // 创建一个测试服务
    const testService = {
      async testMethod(param1, param2, db) {
        const connection = db; // 这里应该是事务连接
        const [rows] = await connection.execute('SELECT ? as param1, ? as param2', [param1, param2]);
        return { success: true, data: rows[0] };
      }
    };

    // 包装服务方法
    const wrappedService = TransactionDecorator.wrapServiceMethods(testService, ['testMethod']);

    const result = await wrappedService.testMethod('value1', 'value2', this.db);

    if (!result.success || result.data.param1 !== 'value1' || result.data.param2 !== 'value2') {
      throw new Error('服务方法包装结果不正确');
    }
  }

  /**
   * 测试4: 连接管理
   */
  async testConnectionManagement() {
    let connectionCount = 0;
    const originalGetConnection = this.db.getConnection;
    
    // 模拟连接获取
    this.db.getConnection = async function() {
      connectionCount++;
      return await originalGetConnection.call(this);
    };

    const operation = async (connection) => {
      return { success: true };
    };

    await TransactionDecorator.executeWithTransaction(
      operation,
      this.db,
      'testConnectionManagement'
    );

    // 恢复原始方法
    this.db.getConnection = originalGetConnection;

    if (connectionCount !== 1) {
      throw new Error(`连接获取次数不正确: ${connectionCount}`);
    }
  }

  /**
   * 测试5: 错误处理
   */
  async testErrorHandling() {
    const operation = async (connection) => {
      // 模拟数据库错误
      await connection.execute('SELECT * FROM non_existent_table');
    };

    try {
      await TransactionDecorator.executeWithTransaction(
        operation,
        this.db,
        'testErrorHandling'
      );
      throw new Error('应该抛出异常但没有抛出');
    } catch (error) {
      // 应该捕获到数据库错误
      if (!error.message.includes('non_existent_table')) {
        throw new Error(`错误处理不正确: ${error.message}`);
      }
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    logger.info('开始运行事务装饰器测试...');
    
    await this.runTest('正常事务提交', () => this.testNormalTransaction());
    await this.runTest('事务回滚', () => this.testTransactionRollback());
    await this.runTest('服务方法包装', () => this.testServiceMethodWrapping());
    await this.runTest('连接管理', () => this.testConnectionManagement());
    await this.runTest('错误处理', () => this.testErrorHandling());

    // 输出测试结果
    this.printTestResults();
  }

  /**
   * 输出测试结果
   */
  printTestResults() {
    console.log('\n' + '='.repeat(50));
    console.log('事务装饰器测试结果');
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
  const tester = new TransactionDecoratorTest();
  
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

module.exports = TransactionDecoratorTest;
