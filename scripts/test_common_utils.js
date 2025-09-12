const CommonUtils = require('../utils/common');
const { BusinessError, NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * 测试公共函数工具类
 */
class CommonUtilsTest {
  
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
   * 测试1: validateOrderStatus
   */
  async testValidateOrderStatus() {
    // 测试正常订单
    const normalOrder = { status: 'confirmed', diningStatus: 'ordered' };
    CommonUtils.validateOrderStatus(normalOrder, 'dined', '确认就餐');

    // 测试订单不存在
    try {
      CommonUtils.validateOrderStatus(null, 'dined', '确认就餐');
      throw new Error('应该抛出NotFoundError');
    } catch (error) {
      if (!(error instanceof NotFoundError)) {
        throw new Error('应该抛出NotFoundError');
      }
    }

    // 测试已取消订单
    try {
      const cancelledOrder = { status: 'cancelled', diningStatus: 'ordered' };
      CommonUtils.validateOrderStatus(cancelledOrder, 'dined', '确认就餐');
      throw new Error('应该抛出BusinessError');
    } catch (error) {
      if (!(error instanceof BusinessError)) {
        throw new Error('应该抛出BusinessError');
      }
    }

    // 测试已确认订单
    try {
      const confirmedOrder = { status: 'confirmed', diningStatus: 'dined' };
      CommonUtils.validateOrderStatus(confirmedOrder, 'dined', '确认就餐');
      throw new Error('应该抛出ConflictError');
    } catch (error) {
      if (!(error instanceof ConflictError)) {
        throw new Error('应该抛出ConflictError');
      }
    }
  }

  /**
   * 测试2: validateUserPermission
   */
  async testValidateUserPermission() {
    // 测试正常用户
    const normalUser = { id: '1', role: 'dept_admin' };
    CommonUtils.validateUserPermission(normalUser, ['dept_admin', 'sys_admin'], '管理操作');

    // 测试未登录用户
    try {
      CommonUtils.validateUserPermission(null, ['dept_admin'], '管理操作');
      throw new Error('应该抛出BusinessError');
    } catch (error) {
      if (!(error instanceof BusinessError)) {
        throw new Error('应该抛出BusinessError');
      }
    }

    // 测试权限不足
    try {
      const normalUser = { id: '1', role: 'user' };
      CommonUtils.validateUserPermission(normalUser, ['dept_admin'], '管理操作');
      throw new Error('应该抛出BusinessError');
    } catch (error) {
      if (!(error instanceof BusinessError)) {
        throw new Error('应该抛出BusinessError');
      }
    }
  }

  /**
   * 测试3: getMealTypeName
   */
  async testGetMealTypeName() {
    if (CommonUtils.getMealTypeName('breakfast') !== '早餐') {
      throw new Error('早餐名称不正确');
    }
    if (CommonUtils.getMealTypeName('lunch') !== '午餐') {
      throw new Error('午餐名称不正确');
    }
    if (CommonUtils.getMealTypeName('dinner') !== '晚餐') {
      throw new Error('晚餐名称不正确');
    }
    if (CommonUtils.getMealTypeName('unknown') !== 'unknown') {
      throw new Error('未知餐次名称处理不正确');
    }
  }

  /**
   * 测试4: getStatusText
   */
  async testGetStatusText() {
    // 测试订单状态
    if (CommonUtils.getStatusText('pending', 'order') !== '待确认') {
      throw new Error('订单状态文本不正确');
    }
    if (CommonUtils.getStatusText('confirmed', 'order') !== '已确认') {
      throw new Error('订单状态文本不正确');
    }

    // 测试就餐状态
    if (CommonUtils.getStatusText('ordered', 'dining') !== '已报餐') {
      throw new Error('就餐状态文本不正确');
    }
    if (CommonUtils.getStatusText('dined', 'dining') !== '已就餐') {
      throw new Error('就餐状态文本不正确');
    }
  }

  /**
   * 测试5: formatTime
   */
  async testFormatTime() {
    const testDate = new Date('2024-01-15 12:30:45');
    
    if (CommonUtils.formatTime(testDate) !== '2024-01-15 12:30:45') {
      throw new Error('默认时间格式不正确');
    }
    
    if (CommonUtils.formatTime(testDate, 'YYYY-MM-DD') !== '2024-01-15') {
      throw new Error('自定义时间格式不正确');
    }
    
    if (CommonUtils.formatTime(null) !== null) {
      throw new Error('null时间处理不正确');
    }
  }

  /**
   * 测试6: validateUsersDepartment
   */
  async testValidateUsersDepartment() {
    const users = [
      { nickName: '张三', departmentId: 'dept1' },
      { nickName: '李四', departmentId: 'dept1' },
      { nickName: '王五', departmentId: 'dept2' }
    ];

    // 测试有效用户
    const validResult = CommonUtils.validateUsersDepartment(users.slice(0, 2), 'dept1');
    if (!validResult.valid) {
      throw new Error('有效用户验证失败');
    }

    // 测试无效用户
    const invalidResult = CommonUtils.validateUsersDepartment(users, 'dept1');
    if (invalidResult.valid) {
      throw new Error('无效用户验证失败');
    }
    if (!invalidResult.invalidUsers.includes('王五')) {
      throw new Error('无效用户列表不正确');
    }
  }

  /**
   * 测试7: checkDuplicateOrders
   */
  async testCheckDuplicateOrders() {
    const memberIds = ['user1', 'user2', 'user3'];
    const existingOrders = [
      { memberIds: JSON.stringify(['user1', 'user4']) },
      { memberIds: JSON.stringify(['user5']) }
    ];

    // 测试有重复
    const duplicateResult = CommonUtils.checkDuplicateOrders(memberIds, existingOrders);
    if (!duplicateResult.hasDuplicates) {
      throw new Error('重复检查失败');
    }
    if (!duplicateResult.duplicateMemberIds.includes('user1')) {
      throw new Error('重复用户列表不正确');
    }

    // 测试无重复
    const noDuplicateResult = CommonUtils.checkDuplicateOrders(['user6', 'user7'], existingOrders);
    if (noDuplicateResult.hasDuplicates) {
      throw new Error('无重复检查失败');
    }
  }

  /**
   * 测试8: generateConfirmationLog
   */
  async testGenerateConfirmationLog() {
    const log = CommonUtils.generateConfirmationLog('order1', 'user1', '张三', 'manual', '测试备注');
    
    if (log.orderId !== 'order1') {
      throw new Error('订单ID不正确');
    }
    if (log.userId !== 'user1') {
      throw new Error('用户ID不正确');
    }
    if (log.userName !== '张三') {
      throw new Error('用户姓名不正确');
    }
    if (log.confirmationType !== 'manual') {
      throw new Error('确认类型不正确');
    }
    if (log.remark !== '测试备注') {
      throw new Error('备注不正确');
    }
    if (!log.confirmationTime) {
      throw new Error('确认时间不正确');
    }
  }

  /**
   * 测试9: calculateStats
   */
  async testCalculateStats() {
    const records = [
      { diningStatus: 'ordered' },
      { diningStatus: 'dined' },
      { diningStatus: 'dined' },
      { diningStatus: 'cancelled' }
    ];

    const stats = CommonUtils.calculateStats(records);
    
    if (stats.total !== 4) {
      throw new Error('总数量不正确');
    }
    if (stats.ordered !== 1) {
      throw new Error('已报餐数量不正确');
    }
    if (stats.dined !== 2) {
      throw new Error('已就餐数量不正确');
    }
    if (stats.cancelled !== 1) {
      throw new Error('已取消数量不正确');
    }
    if (stats.confirmationRate !== '50.00') {
      throw new Error('确认率不正确');
    }
  }

  /**
   * 测试10: processPagination
   */
  async testProcessPagination() {
    const query1 = { page: '2', size: '10' };
    const pagination1 = CommonUtils.processPagination(query1);
    
    if (pagination1.page !== 2) {
      throw new Error('页码不正确');
    }
    if (pagination1.size !== 10) {
      throw new Error('页大小不正确');
    }
    if (pagination1.offset !== 10) {
      throw new Error('偏移量不正确');
    }

    const query2 = { page: '0', size: '200' };
    const pagination2 = CommonUtils.processPagination(query2, 1, 20, 100);
    
    if (pagination2.page !== 1) {
      throw new Error('默认页码不正确');
    }
    if (pagination2.size !== 100) {
      throw new Error('最大页大小限制不正确');
    }
  }

  /**
   * 测试11: generatePaginationResponse
   */
  async testGeneratePaginationResponse() {
    const records = ['record1', 'record2', 'record3'];
    const response = CommonUtils.generatePaginationResponse(records, 25, 2, 10);
    
    if (response.records.length !== 3) {
      throw new Error('记录数量不正确');
    }
    if (response.pagination.page !== 2) {
      throw new Error('页码不正确');
    }
    if (response.pagination.total !== 25) {
      throw new Error('总数量不正确');
    }
    if (response.pagination.totalPages !== 3) {
      throw new Error('总页数不正确');
    }
    if (!response.pagination.hasMore) {
      throw new Error('hasMore不正确');
    }
    if (!response.pagination.hasPrev) {
      throw new Error('hasPrev不正确');
    }
  }

  /**
   * 测试12: safeParseJSON
   */
  async testSafeParseJSON() {
    // 测试有效JSON
    const validJSON = '{"name": "test", "value": 123}';
    const parsed = CommonUtils.safeParseJSON(validJSON);
    if (parsed.name !== 'test' || parsed.value !== 123) {
      throw new Error('有效JSON解析失败');
    }

    // 测试无效JSON
    const invalidJSON = '{"name": "test", "value": 123';
    const defaultResult = CommonUtils.safeParseJSON(invalidJSON, 'default');
    if (defaultResult !== 'default') {
      throw new Error('无效JSON默认值处理失败');
    }
  }

  /**
   * 测试13: deepClone
   */
  async testDeepClone() {
    const original = {
      name: 'test',
      value: 123,
      nested: {
        array: [1, 2, 3],
        date: new Date('2024-01-15')
      }
    };

    const cloned = CommonUtils.deepClone(original);
    
    if (cloned === original) {
      throw new Error('深度克隆失败，应该是不同的对象');
    }
    
    if (cloned.name !== original.name) {
      throw new Error('克隆后属性值不正确');
    }
    
    if (cloned.nested === original.nested) {
      throw new Error('嵌套对象克隆失败');
    }
    
    if (cloned.nested.array === original.nested.array) {
      throw new Error('嵌套数组克隆失败');
    }
  }

  /**
   * 测试14: validatePhone
   */
  async testValidatePhone() {
    if (!CommonUtils.validatePhone('13812345678')) {
      throw new Error('有效手机号验证失败');
    }
    
    if (CommonUtils.validatePhone('12345678901')) {
      throw new Error('无效手机号验证失败');
    }
    
    if (CommonUtils.validatePhone('1381234567')) {
      throw new Error('短手机号验证失败');
    }
  }

  /**
   * 测试15: validateEmail
   */
  async testValidateEmail() {
    if (!CommonUtils.validateEmail('test@example.com')) {
      throw new Error('有效邮箱验证失败');
    }
    
    if (CommonUtils.validateEmail('invalid-email')) {
      throw new Error('无效邮箱验证失败');
    }
    
    if (CommonUtils.validateEmail('test@')) {
      throw new Error('不完整邮箱验证失败');
    }
  }

  /**
   * 测试16: maskPhone
   */
  async testMaskPhone() {
    if (CommonUtils.maskPhone('13812345678') !== '138****5678') {
      throw new Error('手机号脱敏失败');
    }
    
    if (CommonUtils.maskPhone('12345678901') !== '12345678901') {
      throw new Error('无效手机号脱敏处理不正确');
    }
  }

  /**
   * 测试17: maskEmail
   */
  async testMaskEmail() {
    if (CommonUtils.maskEmail('test@example.com') !== 'te**@example.com') {
      throw new Error('邮箱脱敏失败');
    }
    
    if (CommonUtils.maskEmail('ab@example.com') !== 'ab@example.com') {
      throw new Error('短邮箱脱敏处理不正确');
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    logger.info('开始运行公共函数工具类测试...');
    
    await this.runTest('validateOrderStatus', () => this.testValidateOrderStatus());
    await this.runTest('validateUserPermission', () => this.testValidateUserPermission());
    await this.runTest('getMealTypeName', () => this.testGetMealTypeName());
    await this.runTest('getStatusText', () => this.testGetStatusText());
    await this.runTest('formatTime', () => this.testFormatTime());
    await this.runTest('validateUsersDepartment', () => this.testValidateUsersDepartment());
    await this.runTest('checkDuplicateOrders', () => this.testCheckDuplicateOrders());
    await this.runTest('generateConfirmationLog', () => this.testGenerateConfirmationLog());
    await this.runTest('calculateStats', () => this.testCalculateStats());
    await this.runTest('processPagination', () => this.testProcessPagination());
    await this.runTest('generatePaginationResponse', () => this.testGeneratePaginationResponse());
    await this.runTest('safeParseJSON', () => this.testSafeParseJSON());
    await this.runTest('deepClone', () => this.testDeepClone());
    await this.runTest('validatePhone', () => this.testValidatePhone());
    await this.runTest('validateEmail', () => this.testValidateEmail());
    await this.runTest('maskPhone', () => this.testMaskPhone());
    await this.runTest('maskEmail', () => this.testMaskEmail());

    // 输出测试结果
    this.printTestResults();
  }

  /**
   * 输出测试结果
   */
  printTestResults() {
    console.log('\n' + '='.repeat(50));
    console.log('公共函数工具类测试结果');
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
  const tester = new CommonUtilsTest();
  await tester.runAllTests();
}

// 如果直接运行此脚本
if (require.main === module) {
  runTests();
}

module.exports = CommonUtilsTest;
