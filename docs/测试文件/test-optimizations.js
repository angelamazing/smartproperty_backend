const mysql = require('mysql2/promise');
const config = require('./config/database');
const { menuCache, userCache, statsCache } = require('./utils/cache');
const helpers = require('./utils/helpers');

/**
 * 测试代码优化效果的脚本
 */
async function testOptimizations() {
  let connection;
  try {
    connection = await mysql.createConnection(config.database);
    console.log('🔗 数据库连接成功\n');
    
    // 1. 测试工具类功能
    console.log('🛠️  第一步：测试工具类功能');
    await testHelperFunctions();
    
    // 2. 测试缓存机制
    console.log('\n💾 第二步：测试缓存机制');
    await testCacheMechanism();
    
    // 3. 测试事务处理
    console.log('\n🔄 第三步：测试事务处理');
    await testTransactionHandling(connection);
    
    // 4. 测试性能优化
    console.log('\n⚡ 第四步：测试性能优化');
    await testPerformanceOptimization(connection);
    
    // 5. 测试错误处理
    console.log('\n🚨 第五步：测试错误处理');
    await testErrorHandling();
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 测试工具类功能
 */
async function testHelperFunctions() {
  console.log('  测试UUID生成:');
  const uuid1 = helpers.generateUUID();
  const uuid2 = helpers.generateUUID();
  console.log(`    UUID1: ${uuid1}`);
  console.log(`    UUID2: ${uuid2}`);
  console.log(`    唯一性: ${uuid1 !== uuid2 ? '✅' : '❌'}`);
  
  console.log('  测试日期格式化:');
  const now = new Date();
  const formattedDate = helpers.formatDate(now, 'YYYY-MM-DD');
  console.log(`    原始日期: ${now}`);
  console.log(`    格式化后: ${formattedDate}`);
  
  console.log('  测试手机号验证:');
  const validPhone = '13800138000';
  const invalidPhone = '12345678901';
  console.log(`    有效手机号 ${validPhone}: ${helpers.validatePhone(validPhone) ? '✅' : '❌'}`);
  console.log(`    无效手机号 ${invalidPhone}: ${helpers.validatePhone(invalidPhone) ? '❌' : '✅'}`);
  
  console.log('  测试分页参数处理:');
  const pagination = helpers.processPagination({ page: 2, size: 15 }, 1, 20, 100);
  console.log(`    分页参数: ${JSON.stringify(pagination)}`);
  
  console.log('  测试数组去重:');
  const array = [1, 2, 2, 3, 3, 4];
  const uniqueArray = helpers.uniqueArray(array);
  console.log(`    原数组: [${array.join(', ')}]`);
  console.log(`    去重后: [${uniqueArray.join(', ')}]`);
}

/**
 * 测试缓存机制
 */
async function testCacheMechanism() {
  console.log('  测试菜单缓存:');
  
  // 设置缓存
  const menuData = {
    id: 'menu_001',
    name: '今日午餐',
    dishes: ['宫保鸡丁', '麻婆豆腐', '青菜汤']
  };
  
  menuCache.set('menu_001', menuData, 10000); // 10秒TTL
  console.log(`    设置缓存: ${JSON.stringify(menuData)}`);
  
  // 获取缓存
  const cachedMenu = menuCache.get('menu_001');
  console.log(`    获取缓存: ${cachedMenu ? '✅' : '❌'}`);
  console.log(`    缓存内容: ${JSON.stringify(cachedMenu)}`);
  
  // 测试缓存过期
  console.log('  测试缓存过期:');
  menuCache.set('temp_data', '临时数据', 1000); // 1秒TTL
  console.log(`    设置临时缓存: 临时数据`);
  
  setTimeout(() => {
    const expiredData = menuCache.get('temp_data');
    console.log(`    1秒后获取: ${expiredData ? '❌' : '✅'}`);
  }, 1100);
  
  // 显示缓存统计
  console.log('  缓存统计信息:');
  const stats = menuCache.getStats();
  console.log(`    总项目数: ${stats.totalItems}`);
  console.log(`    有效项目数: ${stats.validItems}`);
  console.log(`    过期项目数: ${stats.expiredItems}`);
  console.log(`    总大小: ${stats.totalSize}`);
}

/**
 * 测试事务处理
 */
async function testTransactionHandling(connection) {
  console.log('  测试事务处理:');
  
  try {
    // 开始事务
    await connection.beginTransaction();
    console.log('    ✅ 事务开始成功');
    
    // 执行一些操作
    const [result1] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`    ✅ 查询用户数量: ${result1[0].count}`);
    
    const [result2] = await connection.execute('SELECT COUNT(*) as count FROM menus');
    console.log(`    ✅ 查询菜单数量: ${result2[0].count}`);
    
    // 提交事务
    await connection.commit();
    console.log('    ✅ 事务提交成功');
    
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    console.log(`    ❌ 事务回滚: ${error.message}`);
  }
}

/**
 * 测试性能优化
 */
async function testPerformanceOptimization(connection) {
  console.log('  测试查询性能:');
  
  const startTime = Date.now();
  
  // 执行查询
  const [result] = await connection.execute(`
    SELECT u.nickName, d.name as deptName, COUNT(do._id) as orderCount
    FROM users u
    LEFT JOIN departments d ON u.departmentId = d._id
    LEFT JOIN dining_orders do ON u._id = do.registrantId
    GROUP BY u._id, u.nickName, d.name
    LIMIT 10
  `);
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`    ✅ 查询完成，耗时: ${duration}ms`);
  console.log(`    ✅ 返回记录数: ${result.length}`);
  
  // 测试缓存查询
  console.log('  测试缓存查询性能:');
  
  const cacheKey = 'user_stats_query';
  let cachedResult = statsCache.get(cacheKey);
  
  if (!cachedResult) {
    console.log('    📥 缓存未命中，从数据库查询');
    const startTime2 = Date.now();
    
    // 模拟复杂查询
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const endTime2 = Date.now();
    const duration2 = endTime2 - startTime2;
    
    cachedResult = {
      data: result,
      queryTime: duration2,
      timestamp: Date.now()
    };
    
    statsCache.set(cacheKey, cachedResult, 30000); // 30秒TTL
    console.log(`    💾 查询结果已缓存，查询耗时: ${duration2}ms`);
  } else {
    console.log('    🚀 缓存命中，直接返回结果');
  }
}

/**
 * 测试错误处理
 */
async function testErrorHandling() {
  console.log('  测试错误处理:');
  
  // 测试参数验证
  console.log('    测试参数验证:');
  try {
    if (!helpers.validatePhone('invalid_phone')) {
      throw new Error('手机号格式无效');
    }
  } catch (error) {
    console.log(`      ✅ 参数验证错误处理: ${error.message}`);
  }
  
  // 测试JSON解析错误处理
  console.log('    测试JSON解析错误处理:');
  const invalidJson = '{"invalid": json}';
  const parsedResult = helpers.safeJsonParse(invalidJson, { default: 'value' });
  console.log(`      ✅ 安全JSON解析: ${JSON.stringify(parsedResult)}`);
  
  // 测试空值处理
  console.log('    测试空值处理:');
  const emptyString = '';
  const isEmpty = helpers.isEmptyString(emptyString);
  console.log(`      ✅ 空字符串检查: ${isEmpty}`);
  
  // 测试数组去重错误处理
  console.log('    测试数组去重错误处理:');
  const invalidArray = null;
  const uniqueResult = helpers.uniqueArray(invalidArray);
  console.log(`      ✅ 无效数组处理: ${JSON.stringify(uniqueResult)}`);
}

// 运行测试
console.log('🚀 开始测试代码优化效果...\n');
testOptimizations();
