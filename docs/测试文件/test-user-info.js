const axios = require('axios');

/**
 * 检查用户信息的测试脚本
 */

const BASE_URL = 'http://localhost:3000/api';

async function checkUserInfo() {
  try {
    console.log('🔐 登录部门管理员...');
    
    const loginResponse = await axios.post(`${BASE_URL}/auth/test-login-admin`, {
      phoneNumber: '13800001001',
      password: '123456'
    });
    
    if (loginResponse.data.success) {
      const userInfo = loginResponse.data.data.userInfo;
      console.log('✅ 登录成功');
      console.log('用户信息:', {
        _id: userInfo._id,
        nickName: userInfo.nickName,
        department: userInfo.department,
        departmentId: userInfo.departmentId,
        role: userInfo.role
      });
      
      const token = loginResponse.data.data.token;
      
      // 测试获取部门成员
      console.log('\n👥 测试获取部门成员...');
      try {
        const membersResponse = await axios.get(`${BASE_URL}/dining/enhanced/dept-members`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (membersResponse.data.success) {
          console.log('✅ 获取部门成员成功:', membersResponse.data.data.length, '人');
        } else {
          console.log('❌ 获取部门成员失败:', membersResponse.data.message);
        }
      } catch (error) {
        console.log('❌ 获取部门成员异常:', error.response?.data?.message || error.message);
      }
      
    } else {
      console.log('❌ 登录失败:', loginResponse.data.message);
    }
  } catch (error) {
    console.log('❌ 登录异常:', error.response?.data?.message || error.message);
  }
}

checkUserInfo();
