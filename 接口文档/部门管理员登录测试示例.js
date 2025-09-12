/**
 * 部门管理员登录测试示例
 * 展示如何使用新的指定部门登录接口
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// 部门代码映射
const DEPARTMENTS = {
  'GEO_DATA': '地质数据中心',
  'GEO_ENG': '地质工程中心', 
  'ECO_ENV': '生态环境中心',
  'GEO_ENV': '地质环境中心',
  'GEO_SURVEY': '地质调查中心',
  'HUANGMEI': '黄梅分站',
  'MINING_CO': '矿业有限责任公司',
  'PROPERTY': '物业中心',
  'ADMIN': '机关科室',
  'TECH': '技术部'
};

/**
 * 指定部门管理员登录
 * @param {string} departmentCode - 部门代码
 */
async function loginDeptAdmin(departmentCode) {
  try {
    console.log(`\n=== ${DEPARTMENTS[departmentCode]} 管理员登录 ===`);
    
    const response = await axios.post(`${BASE_URL}/api/auth/test-login-dept-admin`, {
      departmentCode: departmentCode
    });
    
    if (response.data.success) {
      const { token, userInfo } = response.data.data;
      console.log(`✅ 登录成功`);
      console.log(`   部门: ${userInfo.department}`);
      console.log(`   管理员: ${userInfo.nickName}`);
      console.log(`   手机号: ${userInfo.phoneNumber}`);
      console.log(`   权限: ${userInfo.permissions.join(', ')}`);
      
      return { token, userInfo };
    } else {
      console.log(`❌ 登录失败: ${response.data.message}`);
      return null;
    }
    
  } catch (error) {
    console.log(`❌ 登录失败: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

/**
 * 测试部门报餐功能
 * @param {string} token - 认证Token
 * @param {string} departmentName - 部门名称
 */
async function testDepartmentDining(token, departmentName) {
  try {
    console.log(`\n--- 测试 ${departmentName} 报餐功能 ---`);
    
    // 1. 获取部门成员
    console.log('1. 获取部门成员...');
    const membersResponse = await axios.get(`${BASE_URL}/api/dining/enhanced/dept-members`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (membersResponse.data.success) {
      const members = membersResponse.data.data;
      console.log(`✅ 获取到 ${members.length} 名成员`);
      
      // 2. 选择前2名成员进行报餐测试
      const selectedMembers = members.slice(0, 2);
      console.log(`2. 为 ${selectedMembers.map(m => m.name).join(', ')} 报餐...`);
      
      const orderData = {
        date: new Date().toISOString().split('T')[0], // 今天
        mealType: 'lunch',
        members: selectedMembers.map(m => ({ userId: m._id })),
        remark: `${departmentName}测试报餐`
      };
      
      const orderResponse = await axios.post(`${BASE_URL}/api/dining/enhanced/department-order`, orderData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (orderResponse.data.success) {
        console.log(`✅ 报餐成功: ${orderResponse.data.message}`);
      } else {
        console.log(`❌ 报餐失败: ${orderResponse.data.message}`);
      }
      
    } else {
      console.log(`❌ 获取部门成员失败: ${membersResponse.data.message}`);
    }
    
  } catch (error) {
    console.log(`❌ 测试报餐功能失败: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * 测试所有部门的登录和报餐功能
 */
async function testAllDepartments() {
  console.log('开始测试所有部门的登录和报餐功能...\n');
  
  for (const [code, name] of Object.entries(DEPARTMENTS)) {
    const loginResult = await loginDeptAdmin(code);
    
    if (loginResult) {
      await testDepartmentDining(loginResult.token, name);
    }
    
    // 添加延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n=== 所有测试完成 ===');
}

/**
 * 测试单个部门
 * @param {string} departmentCode - 部门代码
 */
async function testSingleDepartment(departmentCode) {
  if (!DEPARTMENTS[departmentCode]) {
    console.log(`❌ 无效的部门代码: ${departmentCode}`);
    console.log(`可用部门代码: ${Object.keys(DEPARTMENTS).join(', ')}`);
    return;
  }
  
  const loginResult = await loginDeptAdmin(departmentCode);
  if (loginResult) {
    await testDepartmentDining(loginResult.token, DEPARTMENTS[departmentCode]);
  }
}

// 使用示例
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // 测试指定部门
    await testSingleDepartment(args[0]);
  } else {
    // 测试所有部门
    await testAllDepartments();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  loginDeptAdmin,
  testDepartmentDining,
  testAllDepartments,
  testSingleDepartment,
  DEPARTMENTS
};
