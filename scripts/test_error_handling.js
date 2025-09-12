const {
  AppError,
  BusinessError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  ErrorHandler,
  ERROR_CODES
} = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * 测试错误处理机制
 */
class ErrorHandlingTest {
  
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
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
   * 测试1: AppError基本功能
   */
  async testAppErrorBasic() {
    const error = new AppError('测试错误', 400, 'TEST_ERROR', { field: 'test' });
    
    if (error.message !== '测试错误') {
      throw new Error('错误消息不正确');
    }
    if (error.statusCode !== 400) {
      throw new Error('状态码不正确');
    }
    if (error.errorCode !== 'TEST_ERROR') {
      throw new Error('错误代码不正确');
    }
    if (error.details.field !== 'test') {
      throw new Error('详细信息不正确');
    }
    if (!error.isOperational) {
      throw new Error('isOperational应该为true');
    }
  }

  /**
   * 测试2: BusinessError
   */
  async testBusinessError() {
    const error = new BusinessError('业务错误', 'BUSINESS_ERROR', { orderId: '123' });
    
    if (error.statusCode !== 400) {
      throw new Error('业务错误状态码应该是400');
    }
    if (error.errorCode !== 'BUSINESS_ERROR') {
      throw new Error('业务错误代码不正确');
    }
  }

  /**
   * 测试3: ValidationError
   */
  async testValidationError() {
    const validationErrors = [
      { field: 'email', message: '邮箱格式不正确' },
      { field: 'password', message: '密码长度不足' }
    ];
    
    const error = new ValidationError('参数验证失败', validationErrors);
    
    if (error.statusCode !== 422) {
      throw new Error('验证错误状态码应该是422');
    }
    if (error.errorCode !== 'VALIDATION_ERROR') {
      throw new Error('验证错误代码不正确');
    }
    if (error.details.length !== 2) {
      throw new Error('验证错误详情数量不正确');
    }
  }

  /**
   * 测试4: AuthenticationError
   */
  async testAuthenticationError() {
    const error = new AuthenticationError('Token已过期');
    
    if (error.statusCode !== 401) {
      throw new Error('认证错误状态码应该是401');
    }
    if (error.errorCode !== 'AUTHENTICATION_ERROR') {
      throw new Error('认证错误代码不正确');
    }
  }

  /**
   * 测试5: AuthorizationError
   */
  async testAuthorizationError() {
    const error = new AuthorizationError('需要管理员权限');
    
    if (error.statusCode !== 403) {
      throw new Error('授权错误状态码应该是403');
    }
    if (error.errorCode !== 'AUTHORIZATION_ERROR') {
      throw new Error('授权错误代码不正确');
    }
  }

  /**
   * 测试6: NotFoundError
   */
  async testNotFoundError() {
    const error = new NotFoundError('订单不存在');
    
    if (error.statusCode !== 404) {
      throw new Error('未找到错误状态码应该是404');
    }
    if (error.errorCode !== 'NOT_FOUND') {
      throw new Error('未找到错误代码不正确');
    }
  }

  /**
   * 测试7: ConflictError
   */
  async testConflictError() {
    const error = new ConflictError('订单已确认');
    
    if (error.statusCode !== 409) {
      throw new Error('冲突错误状态码应该是409');
    }
    if (error.errorCode !== 'CONFLICT') {
      throw new Error('冲突错误代码不正确');
    }
  }

  /**
   * 测试8: DatabaseError
   */
  async testDatabaseError() {
    const originalError = new Error('Connection failed');
    const error = new DatabaseError('数据库连接失败', 'DATABASE_ERROR', { operation: 'SELECT' });
    
    if (error.statusCode !== 500) {
      throw new Error('数据库错误状态码应该是500');
    }
    if (error.errorCode !== 'DATABASE_ERROR') {
      throw new Error('数据库错误代码不正确');
    }
  }

  /**
   * 测试9: ExternalServiceError
   */
  async testExternalServiceError() {
    const error = new ExternalServiceError('Redis连接失败', 'REDIS_CONNECTION_FAILED', { host: 'localhost' });
    
    if (error.statusCode !== 502) {
      throw new Error('外部服务错误状态码应该是502');
    }
    if (error.errorCode !== 'REDIS_CONNECTION_FAILED') {
      throw new Error('外部服务错误代码不正确');
    }
  }

  /**
   * 测试10: ErrorHandler.createBusinessError
   */
  async testErrorHandlerCreateBusinessError() {
    const error = ErrorHandler.createBusinessError('订单不存在', 'ORDER_NOT_FOUND', { orderId: '123' });
    
    if (!(error instanceof BusinessError)) {
      throw new Error('应该创建BusinessError实例');
    }
    if (error.message !== '订单不存在') {
      throw new Error('错误消息不正确');
    }
    if (error.errorCode !== 'ORDER_NOT_FOUND') {
      throw new Error('错误代码不正确');
    }
  }

  /**
   * 测试11: ErrorHandler.createValidationError
   */
  async testErrorHandlerCreateValidationError() {
    const validationErrors = [
      { field: 'email', message: '邮箱格式不正确' }
    ];
    const error = ErrorHandler.createValidationError('参数验证失败', validationErrors);
    
    if (!(error instanceof ValidationError)) {
      throw new Error('应该创建ValidationError实例');
    }
    if (error.details.length !== 1) {
      throw new Error('验证错误详情数量不正确');
    }
  }

  /**
   * 测试12: ErrorHandler.createDatabaseError
   */
  async testErrorHandlerCreateDatabaseError() {
    const originalError = new Error('Connection timeout');
    const error = ErrorHandler.createDatabaseError(originalError, '查询用户信息');
    
    if (!(error instanceof DatabaseError)) {
      throw new Error('应该创建DatabaseError实例');
    }
    if (!error.message.includes('查询用户信息')) {
      throw new Error('错误消息应该包含操作名称');
    }
    if (error.details.operation !== '查询用户信息') {
      throw new Error('详细信息应该包含操作名称');
    }
  }

  /**
   * 测试13: ErrorHandler.asyncHandler
   */
  async testErrorHandlerAsyncHandler() {
    const asyncFunction = async (req, res, next) => {
      throw new Error('异步错误');
    };
    
    const wrappedFunction = ErrorHandler.asyncHandler(asyncFunction);
    
    let errorCaught = false;
    const mockReq = {};
    const mockRes = {};
    const mockNext = (err) => {
      if (err && err.message === '异步错误') {
        errorCaught = true;
      }
    };
    
    await wrappedFunction(mockReq, mockRes, mockNext);
    
    if (!errorCaught) {
      throw new Error('异步错误应该被捕获');
    }
  }

  /**
   * 测试14: 错误JSON序列化
   */
  async testErrorToJSON() {
    const error = new BusinessError('测试错误', 'TEST_ERROR', { field: 'test' });
    const json = error.toJSON();
    
    if (json.name !== 'BusinessError') {
      throw new Error('JSON中的name不正确');
    }
    if (json.message !== '测试错误') {
      throw new Error('JSON中的message不正确');
    }
    if (json.statusCode !== 400) {
      throw new Error('JSON中的statusCode不正确');
    }
    if (json.errorCode !== 'TEST_ERROR') {
      throw new Error('JSON中的errorCode不正确');
    }
    if (!json.timestamp) {
      throw new Error('JSON中应该有timestamp');
    }
  }

  /**
   * 测试15: ERROR_CODES常量
   */
  async testErrorCodes() {
    if (!ERROR_CODES.ORDER_NOT_FOUND) {
      throw new Error('ERROR_CODES.ORDER_NOT_FOUND应该存在');
    }
    if (!ERROR_CODES.VALIDATION_ERROR) {
      throw new Error('ERROR_CODES.VALIDATION_ERROR应该存在');
    }
    if (!ERROR_CODES.AUTHENTICATION_ERROR) {
      throw new Error('ERROR_CODES.AUTHENTICATION_ERROR应该存在');
    }
    if (!ERROR_CODES.DATABASE_ERROR) {
      throw new Error('ERROR_CODES.DATABASE_ERROR应该存在');
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    logger.info('开始运行错误处理机制测试...');
    
    await this.runTest('AppError基本功能', () => this.testAppErrorBasic());
    await this.runTest('BusinessError', () => this.testBusinessError());
    await this.runTest('ValidationError', () => this.testValidationError());
    await this.runTest('AuthenticationError', () => this.testAuthenticationError());
    await this.runTest('AuthorizationError', () => this.testAuthorizationError());
    await this.runTest('NotFoundError', () => this.testNotFoundError());
    await this.runTest('ConflictError', () => this.testConflictError());
    await this.runTest('DatabaseError', () => this.testDatabaseError());
    await this.runTest('ExternalServiceError', () => this.testExternalServiceError());
    await this.runTest('ErrorHandler.createBusinessError', () => this.testErrorHandlerCreateBusinessError());
    await this.runTest('ErrorHandler.createValidationError', () => this.testErrorHandlerCreateValidationError());
    await this.runTest('ErrorHandler.createDatabaseError', () => this.testErrorHandlerCreateDatabaseError());
    await this.runTest('ErrorHandler.asyncHandler', () => this.testErrorHandlerAsyncHandler());
    await this.runTest('错误JSON序列化', () => this.testErrorToJSON());
    await this.runTest('ERROR_CODES常量', () => this.testErrorCodes());

    // 输出测试结果
    this.printTestResults();
  }

  /**
   * 输出测试结果
   */
  printTestResults() {
    console.log('\n' + '='.repeat(50));
    console.log('错误处理机制测试结果');
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
  const tester = new ErrorHandlingTest();
  await tester.runAllTests();
}

// 如果直接运行此脚本
if (require.main === module) {
  runTests();
}

module.exports = ErrorHandlingTest;
