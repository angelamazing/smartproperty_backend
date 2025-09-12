const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// 测试部门代码列表
const departmentCodes = [
  'GEO_DATA',    // 地质数据中心
  'GEO_ENG',     // 地质工程中心
  'ECO_ENV',     // 生态环境中心
  'GEO_ENV',     // 地质环境中心
  'GEO_SURVEY',  // 地质调查中心
  'HUANGMEI',    // 黄梅分站
  'MINING_CO',   // 矿业有限责任公司
  'PROPERTY',    // 物业中心
  'ADMIN',       // 机关科室
  'TECH'         // 技术部
];

async function testDeptAdminLogin(departmentCode) {
  try {
    console.log(`\n=== 测试 ${departmentCode} 部门管理员登录 ===`);
    
    const response = await axios.post(`${BASE_URL}/api/auth/test-login-dept-admin`, {
      departmentCode: departmentCode
    });
    
    if (response.data.success) {
      const { token, userInfo } = response.data.data;
      console.log(`✅ 登录成功:`);
      console.log(`   部门: ${userInfo.department}`);
      console.log(`   管理员: ${userInfo.nickName}`);
      console.log(`   手机号: ${userInfo.phoneNumber}`);
      console.log(`   用户ID: ${userInfo._id}`);
      console.log(`   Token: ${token.substring(0, 50)}...`);
      
      // 测试获取部门成员
      console.log(`\n--- 测试获取部门成员 ---`);
      try {
        const membersResponse = await axios.get(`${BASE_URL}/api/dining/enhanced/dept-members`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (membersResponse.data.success) {
          console.log(`✅ 获取部门成员成功，共 ${membersResponse.data.data.length} 人`);
          membersResponse.data.data.forEach(member => {
            console.log(`   - ${member.name} (${member.role})`);
          });
        } else {
          console.log(`❌ 获取部门成员失败: ${membersResponse.data.message}`);
        }
      } catch (error) {
        console.log(`❌ 获取部门成员失败: ${error.response?.data?.message || error.message}`);
      }
      
    } else {
      console.log(`❌ 登录失败: ${response.data.message}`);
    }
    
  } catch (error) {
    console.log(`❌ 登录失败: ${error.response?.data?.message || error.message}`);
  }
}

async function testAllDepartments() {
  console.log('开始测试所有部门的部门管理员登录...');
  
  for (const deptCode of departmentCodes) {
    await testDeptAdminLogin(deptCode);
    // 添加延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n=== 测试完成 ===');
}

// 如果直接运行此脚本，测试所有部门
if (require.main === module) {
  testAllDepartments().catch(console.error);
}

module.exports = { testDeptAdminLogin, testAllDepartments };
