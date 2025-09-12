const axios = require('axios');
const { createDatabase, createTables, insertSampleData, verifyDatabase } = require('./initDatabase-complete');
const mysql = require('mysql2/promise');
const config = require('../config/database');
const logger = require('../utils/logger');

/**
 * 完整系统测试脚本
 * 测试数据库初始化和所有接口功能
 */

const BASE_URL = 'http://localhost:3000';

// 测试配置
const testConfig = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

/**
 * 测试数据库初始化
 */
async function testDatabaseInit() {
  console.log('\n🗄️ ===== 测试数据库初始化 =====');
  
  try {
    // 连接数据库
    const connection = await mysql.createConnection(config.database);
    
    // 验证数据库结构
    const isValid = await verifyDatabase(connection);
    
    if (isValid) {
      console.log('✅ 数据库结构验证通过');
      
      // 检查示例数据
      const [deptCount] = await connection.execute('SELECT COUNT(*) as count FROM departments');
      const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
      const [venueCount] = await connection.execute('SELECT COUNT(*) as count FROM venues');
      const [tableCount] = await connection.execute('SELECT COUNT(*) as count FROM dining_tables');
      
      console.log('📊 数据统计:');
      console.log(`   - 部门: ${deptCount[0].count} 条`);
      console.log(`   - 用户: ${userCount[0].count} 条`);
      console.log(`   - 场地: ${venueCount[0].count} 条`);
      console.log(`   - 餐桌: ${tableCount[0].count} 条`);
      
      await connection.end();
      return true;
    } else {
      console.log('❌ 数据库结构验证失败');
      await connection.end();
      return false;
    }
  } catch (error) {
    console.error('❌ 数据库测试失败:', error.message);
    return false;
  }
}

/**
 * 测试服务健康状态
 */
async function testServerHealth() {
  console.log('\n🏥 ===== 测试服务健康状态 =====');
  
  try {
    const response = await axios.get(`${BASE_URL}/health`, testConfig);
    
    if (response.data.success) {
      console.log('✅ 服务运行正常');
      console.log(`   - 数据库状态: ${response.data.database}`);
      console.log(`   - 响应时间: ${Date.now() - new Date(response.data.timestamp).getTime()}ms`);
      return true;
    } else {
      console.log('❌ 服务健康检查失败');
      return false;
    }
  } catch (error) {
    console.log('❌ 服务连接失败:', error.message);
    return false;
  }
}

/**
 * 测试认证接口
 */
async function testAuthAPIs() {
  console.log('\n🔐 ===== 测试认证接口 =====');
  
  const results = {
    testLogin: false,
    testLoginAdmin: false,
    testLoginSysAdmin: false
  };
  
  try {
    // 测试普通用户登录
    const normalResponse = await axios.post(`${BASE_URL}/api/auth/test-login`, {}, testConfig);
    if (normalResponse.data.success) {
      console.log('✅ 普通用户测试登录成功');
      results.testLogin = true;
    }
  } catch (error) {
    console.log('❌ 普通用户测试登录失败:', error.response?.data?.message || error.message);
  }
  
  try {
    // 测试部门管理员登录
    const adminResponse = await axios.post(`${BASE_URL}/api/auth/test-login-admin`, {}, testConfig);
    if (adminResponse.data.success) {
      console.log('✅ 部门管理员测试登录成功');
      results.testLoginAdmin = true;
    }
  } catch (error) {
    console.log('❌ 部门管理员测试登录失败:', error.response?.data?.message || error.message);
  }
  
  try {
    // 测试系统管理员登录
    const sysAdminResponse = await axios.post(`${BASE_URL}/api/auth/test-login-sys-admin`, {}, testConfig);
    if (sysAdminResponse.data.success) {
      console.log('✅ 系统管理员测试登录成功');
      results.testLoginSysAdmin = true;
    }
  } catch (error) {
    console.log('❌ 系统管理员测试登录失败:', error.response?.data?.message || error.message);
  }
  
  return results;
}

/**
 * 测试业务接口 (需要Token)
 */
async function testBusinessAPIs() {
  console.log('\n💼 ===== 测试业务接口 =====');
  
  let token = null;
  const results = {
    getToken: false,
    userStats: false,
    systemStats: false,
    menuList: false
  };
  
  try {
    // 获取测试Token
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/test-login`, {}, testConfig);
    if (loginResponse.data.success) {
      token = loginResponse.data.data.token;
      results.getToken = true;
      console.log('✅ 获取测试Token成功');
    }
  } catch (error) {
    console.log('❌ 获取测试Token失败');
    return results;
  }
  
  const authConfig = {
    ...testConfig,
    headers: {
      ...testConfig.headers,
      'Authorization': `Bearer ${token}`
    }
  };
  
  try {
    // 测试用户统计接口
    const statsResponse = await axios.get(`${BASE_URL}/api/user/stats`, authConfig);
    if (statsResponse.data.success) {
      console.log('✅ 用户统计接口测试成功');
      results.userStats = true;
    }
  } catch (error) {
    console.log('❌ 用户统计接口测试失败:', error.response?.data?.message || error.message);
  }
  
  try {
    // 测试系统统计接口
    const systemStatsResponse = await axios.get(`${BASE_URL}/api/system/today-stats`, authConfig);
    if (systemStatsResponse.data.success) {
      console.log('✅ 系统统计接口测试成功');
      results.systemStats = true;
    }
  } catch (error) {
    console.log('❌ 系统统计接口测试失败:', error.response?.data?.message || error.message);
  }
  
  try {
    // 测试菜单接口
    const menuResponse = await axios.get(`${BASE_URL}/api/dining/menu?date=2024-01-15&mealType=lunch`, authConfig);
    if (menuResponse.data.success) {
      console.log('✅ 菜单接口测试成功');
      results.menuList = true;
    }
  } catch (error) {
    console.log('❌ 菜单接口测试失败:', error.response?.data?.message || error.message);
  }
  
  return results;
}

/**
 * 测试数据库CRUD操作
 */
async function testDatabaseOperations() {
  console.log('\n📝 ===== 测试数据库操作 =====');
  
  const results = {
    insert: false,
    select: false,
    update: false,
    delete: false
  };
  
  try {
    const connection = await mysql.createConnection(config.database);
    
    // 测试插入
    const testId = require('uuid').v4();
    await connection.query(
      `INSERT INTO system_configs (_id, configKey, configValue, dataType, category, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [testId, 'test.key', 'test_value', 'string', 'test', '测试配置']
    );
    console.log('✅ 数据插入测试成功');
    results.insert = true;
    
    // 测试查询
    const [rows] = await connection.query(
      'SELECT * FROM system_configs WHERE configKey = ?',
      ['test.key']
    );
    if (rows.length > 0) {
      console.log('✅ 数据查询测试成功');
      results.select = true;
    }
    
    // 测试更新
    await connection.query(
      'UPDATE system_configs SET configValue = ? WHERE configKey = ?',
      ['updated_value', 'test.key']
    );
    console.log('✅ 数据更新测试成功');
    results.update = true;
    
    // 测试删除
    await connection.query(
      'DELETE FROM system_configs WHERE configKey = ?',
      ['test.key']
    );
    console.log('✅ 数据删除测试成功');
    results.delete = true;
    
    await connection.end();
  } catch (error) {
    console.error('❌ 数据库操作测试失败:', error.message);
  }
  
  return results;
}

/**
 * 生成测试报告
 */
function generateTestReport(dbTest, healthTest, authResults, businessResults, dbOpResults) {
  console.log('\n📊 ===== 测试报告汇总 =====');
  
  // 数据库测试
  console.log(`🗄️  数据库初始化: ${dbTest ? '✅ 通过' : '❌ 失败'}`);
  
  // 服务健康测试
  console.log(`🏥 服务健康检查: ${healthTest ? '✅ 通过' : '❌ 失败'}`);
  
  // 认证接口测试
  console.log('🔐 认证接口测试:');
  console.log(`   - 普通用户登录: ${authResults.testLogin ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   - 部门管理员登录: ${authResults.testLoginAdmin ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   - 系统管理员登录: ${authResults.testLoginSysAdmin ? '✅ 通过' : '❌ 失败'}`);
  
  // 业务接口测试
  console.log('💼 业务接口测试:');
  console.log(`   - Token获取: ${businessResults.getToken ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   - 用户统计: ${businessResults.userStats ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   - 系统统计: ${businessResults.systemStats ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   - 菜单查询: ${businessResults.menuList ? '✅ 通过' : '❌ 失败'}`);
  
  // 数据库操作测试
  console.log('📝 数据库操作测试:');
  console.log(`   - 数据插入: ${dbOpResults.insert ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   - 数据查询: ${dbOpResults.select ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   - 数据更新: ${dbOpResults.update ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   - 数据删除: ${dbOpResults.delete ? '✅ 通过' : '❌ 失败'}`);
  
  // 计算通过率
  const totalTests = 12;
  const passedTests = [
    dbTest,
    healthTest,
    ...Object.values(authResults),
    ...Object.values(businessResults),
    ...Object.values(dbOpResults)
  ].filter(Boolean).length;
  
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log('\n🎯 总体结果:');
  console.log(`   - 通过测试: ${passedTests}/${totalTests}`);
  console.log(`   - 通过率: ${passRate}%`);
  console.log(`   - 测试状态: ${passRate >= 80 ? '🎉 优秀' : passRate >= 60 ? '⚠️  良好' : '❌ 需要改进'}`);
  
  return passRate >= 80;
}

/**
 * 主测试函数
 */
async function runCompleteTest() {
  console.log('🚀 智慧物业管理系统 - 完整系统测试');
  console.log(`📅 测试时间: ${new Date().toLocaleString()}`);
  console.log(`🌐 测试地址: ${BASE_URL}`);
  console.log('='.repeat(50));
  
  try {
    // 1. 测试数据库初始化
    const dbTest = await testDatabaseInit();
    
    // 2. 测试服务健康状态
    const healthTest = await testServerHealth();
    
    // 3. 测试认证接口
    const authResults = await testAuthAPIs();
    
    // 4. 测试业务接口
    const businessResults = await testBusinessAPIs();
    
    // 5. 测试数据库操作
    const dbOpResults = await testDatabaseOperations();
    
    // 6. 生成测试报告
    const success = generateTestReport(dbTest, healthTest, authResults, businessResults, dbOpResults);
    
    console.log('\n🏁 测试完成!');
    
    if (success) {
      console.log('🎉 恭喜！系统运行正常，可以投入使用。');
    } else {
      console.log('⚠️  系统存在问题，请检查错误信息并修复。');
    }
    
    return success;
  } catch (error) {
    console.error('❌ 测试过程中发生严重错误:', error.message);
    return false;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runCompleteTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ 测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = {
  testDatabaseInit,
  testServerHealth,
  testAuthAPIs,
  testBusinessAPIs,
  testDatabaseOperations,
  runCompleteTest
};
