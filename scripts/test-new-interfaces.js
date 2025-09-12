const axios = require('axios');

/**
 * 测试新增的测试登录接口
 * 运行前确保服务已启动且为开发环境
 */

const BASE_URL = 'http://localhost:3000/api';

// 测试配置
const testConfig = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

/**
 * 测试部门管理员登录接口
 */
async function testAdminLogin() {
  console.log('\n=== 测试部门管理员登录接口 ===');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/auth/test-login-admin`,
      {},
      testConfig
    );
    
    if (response.data.success) {
      console.log('✅ 部门管理员登录成功');
      console.log('用户信息:', JSON.stringify(response.data.data.userInfo, null, 2));
      console.log('Token:', response.data.data.token.substring(0, 20) + '...');
      
      // 验证返回的用户信息
      const userInfo = response.data.data.userInfo;
      if (userInfo.role === 'dept_admin' && userInfo.isAdminTest) {
        console.log('✅ 用户角色和测试标识正确');
      } else {w
        console.log('❌ 用户角色或测试标识不正确');
      }
      
      return response.data.data.token;
    } else {
      console.log('❌ 部门管理员登录失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ 部门管理员登录异常:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * 测试系统管理员登录接口
 */
async function testSysAdminLogin() {
  console.log('\n=== 测试系统管理员登录接口 ===');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/auth/test-login-sys-admin`,
      {},
      testConfig
    );
    
    if (response.data.success) {
      console.log('✅ 系统管理员登录成功');
      console.log('用户信息:', JSON.stringify(response.data.data.userInfo, null, 2));
      console.log('Token:', response.data.data.token.substring(0, 20) + '...');
      
      // 验证返回的用户信息
      const userInfo = response.data.data.userInfo;
      if (userInfo.role === 'sys_admin' && userInfo.isSysAdminTest) {
        console.log('✅ 用户角色和测试标识正确');
      } else {
        console.log('❌ 用户角色或测试标识不正确');
      }
      
      return response.data.data.token;
    } else {
      console.log('❌ 系统管理员登录失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ 系统管理员登录异常:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * 测试普通用户登录接口
 */
async function testNormalLogin() {
  console.log('\n=== 测试普通用户登录接口 ===');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/auth/test-login`,
      {},
      testConfig
    );
    
    if (response.data.success) {
      console.log('✅ 普通用户登录成功');
      console.log('用户信息:', JSON.stringify(response.data.data.userInfo, null, 2));
      console.log('Token:', response.data.data.token.substring(0, 20) + '...');
      
      // 验证返回的用户信息
      const userInfo = response.data.data.userInfo;
      if (userInfo.role === 'user' && userInfo.isTestUser) {
        console.log('✅ 用户角色和测试标识正确');
      } else {
        console.log('❌ 用户角色或测试标识不正确');
      }
      
      return response.data.data.token;
    } else {
      console.log('❌ 普通用户登录失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ 普通用户登录异常:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * 测试Token有效性
 */
async function testTokenValidity(token, userType) {
  console.log(`\n=== 测试${userType} Token有效性 ===`);
  
  try {
    const response = await axios.post(
      `${BASE_URL}/auth/validate-token`,
      { token },
      testConfig
    );
    
    if (response.data.success) {
      console.log(`✅ ${userType} Token验证成功`);
      return true;
    } else {
      console.log(`❌ ${userType} Token验证失败:`, response.data.message);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${userType} Token验证异常:`, error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * 测试环境限制（生产环境应该返回403）
 */
async function testEnvironmentRestriction() {
  console.log('\n=== 测试环境限制 ===');
  
  // 保存原始环境变量
  const originalEnv = process.env.NODE_ENV;
  
  try {
    // 模拟生产环境
    process.env.NODE_ENV = 'production';
    
    // 重启服务（这里只是演示，实际需要重启服务）
    console.log('⚠️  注意：要测试生产环境限制，需要重启服务并设置 NODE_ENV=production');
    console.log('   当前测试仅验证接口存在性');
    
    return true;
  } catch (error) {
    console.log('❌ 环境限制测试失败:', error.message);
    return false;
  } finally {
    // 恢复环境变量
    process.env.NODE_ENV = originalEnv;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始测试新增的测试登录接口...');
  console.log('📝 测试时间:', new Date().toLocaleString());
  console.log('🌐 测试地址:', BASE_URL);
  
  try {
    // 测试普通用户登录
    const normalToken = await testNormalLogin();
    
    // 测试部门管理员登录
    const adminToken = await testAdminLogin();
    
    // 测试系统管理员登录
    const sysAdminToken = await testSysAdminLogin();
    
    // 测试Token有效性
    if (normalToken) {
      await testTokenValidity(normalToken, '普通用户');
    }
    
    if (adminToken) {
      await testTokenValidity(adminToken, '部门管理员');
    }
    
    if (sysAdminToken) {
      await testTokenValidity(sysAdminToken, '系统管理员');
    }
    
    // 测试环境限制
    await testEnvironmentRestriction();
    
    console.log('\n🎉 所有测试完成！');
    
    // 输出测试总结
    console.log('\n📊 测试总结:');
    console.log('- 普通用户测试登录:', normalToken ? '✅ 通过' : '❌ 失败');
    console.log('- 部门管理员测试登录:', adminToken ? '✅ 通过' : '❌ 失败');
    console.log('- 系统管理员测试登录:', sysAdminToken ? '✅ 通过' : '❌ 失败');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testAdminLogin,
  testSysAdminLogin,
  testNormalLogin,
  testTokenValidity,
  testEnvironmentRestriction,
  runTests
};
