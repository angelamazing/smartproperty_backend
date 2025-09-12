const axios = require('axios');

/**
 * 简单的部门管理系统测试
 */

const BASE_URL = 'http://localhost:3000/api';

async function testDepartmentAPI() {
  try {
    console.log('🚀 开始测试部门管理API...\n');
    
    // 1. 测试健康检查
    console.log('1. 测试健康检查...');
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ 服务器健康检查通过:', healthResponse.data.message);
    
    // 2. 测试部门列表接口（不需要认证）
    console.log('\n2. 测试部门列表接口...');
    try {
      const deptResponse = await axios.get(`${BASE_URL}/department/list`);
      console.log('✅ 部门列表接口正常，共', deptResponse.data.data.length, '个部门');
      deptResponse.data.data.forEach((dept, index) => {
        console.log(`   ${index + 1}. ${dept.name} (${dept.code})`);
      });
    } catch (error) {
      console.log('❌ 部门列表接口错误:', error.response?.data?.message || error.message);
    }
    
    // 3. 测试登录接口
    console.log('\n3. 测试登录接口...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/test-login-admin`, {
        phoneNumber: '13800001001',
        password: '123456'
      });
      console.log('✅ 登录成功:', loginResponse.data.data.userInfo.nickName);
      console.log('   角色:', loginResponse.data.data.userInfo.role);
      console.log('   部门:', loginResponse.data.data.userInfo.department);
      
      const token = loginResponse.data.data.token;
      
      // 4. 测试需要认证的部门接口
      console.log('\n4. 测试需要认证的部门接口...');
      const myDeptResponse = await axios.get(`${BASE_URL}/department/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ 获取我的部门信息成功:', myDeptResponse.data.data.departmentName);
      
      // 5. 测试部门管理员专用接口
      console.log('\n5. 测试部门管理员专用接口...');
      const adminInfoResponse = await axios.get(`${BASE_URL}/department/admin/my-info`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ 获取部门管理员信息成功:');
      console.log('   部门:', adminInfoResponse.data.data.departmentName);
      console.log('   成员数量:', adminInfoResponse.data.data.memberCount);
      
      // 6. 测试增强版报餐接口
      console.log('\n6. 测试增强版报餐接口...');
      const membersResponse = await axios.get(`${BASE_URL}/dining/enhanced/dept-members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ 获取部门成员成功，共', membersResponse.data.data.length, '名成员');
      
      const overviewResponse = await axios.get(`${BASE_URL}/dining/enhanced/department-overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ 获取部门报餐概览成功:');
      console.log('   部门:', overviewResponse.data.data.departmentName);
      console.log('   总成员:', overviewResponse.data.data.totalMembers);
      console.log('   今日报餐:', overviewResponse.data.data.todayStats.totalOrders);
      
    } catch (error) {
      console.log('❌ 登录或认证接口错误:', error.response?.data?.message || error.message);
    }
    
    console.log('\n🎉 部门管理系统测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testDepartmentAPI();
