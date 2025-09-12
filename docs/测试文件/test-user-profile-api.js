const axios = require('axios');

// 配置
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  username: 'testuser',
  password: 'testpass123'
};

// 测试数据
let authToken = '';
let testUserId = '';

async function testUserProfileAPIs() {
  try {
    console.log('🧪 开始测试用户资料相关API...\n');

    // 1. 登录获取token
    console.log('1️⃣ 测试用户登录...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);
    
    if (loginResponse.data.success) {
      authToken = loginResponse.data.data.token;
      testUserId = loginResponse.data.data.user._id;
      console.log('✅ 登录成功，获取到token');
    } else {
      throw new Error('登录失败: ' + loginResponse.data.message);
    }

    // 设置请求头
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 2. 测试获取用户资料
    console.log('\n2️⃣ 测试获取用户资料...');
    try {
      const profileResponse = await axios.get(`${BASE_URL}/api/admin/user/profile`, { headers });
      
      if (profileResponse.data.success) {
        console.log('✅ 获取用户资料成功');
        console.log('用户信息:', JSON.stringify(profileResponse.data.data, null, 2));
      } else {
        console.log('❌ 获取用户资料失败:', profileResponse.data.message);
      }
    } catch (error) {
      console.log('❌ 获取用户资料请求失败:', error.response?.data || error.message);
    }

    // 3. 测试更新用户资料
    console.log('\n3️⃣ 测试更新用户资料...');
    const updateData = {
      nickName: '测试用户更新',
      email: 'testupdated@example.com',
      phone: '13800138001',
      department: '测试部门'
    };

    try {
      const updateResponse = await axios.put(`${BASE_URL}/api/admin/user/profile`, updateData, { headers });
      
      if (updateResponse.data.success) {
        console.log('✅ 更新用户资料成功');
        console.log('更新后的信息:', JSON.stringify(updateResponse.data.data, null, 2));
      } else {
        console.log('❌ 更新用户资料失败:', updateResponse.data.message);
      }
    } catch (error) {
      console.log('❌ 更新用户资料请求失败:', error.response?.data || error.message);
    }

    // 4. 测试更新用户头像
    console.log('\n4️⃣ 测试更新用户头像...');
    const avatarData = {
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=testuser'
    };

    try {
      const avatarResponse = await axios.put(`${BASE_URL}/api/admin/user/avatar`, avatarData, { headers });
      
      if (avatarResponse.data.success) {
        console.log('✅ 更新用户头像成功');
        console.log('头像信息:', JSON.stringify(avatarResponse.data.data, null, 2));
      } else {
        console.log('❌ 更新用户头像失败:', avatarResponse.data.message);
      }
    } catch (error) {
      console.log('❌ 更新用户头像请求失败:', error.response?.data || error.message);
    }

    // 5. 再次获取用户资料验证更新
    console.log('\n5️⃣ 验证用户资料更新...');
    try {
      const finalProfileResponse = await axios.get(`${BASE_URL}/api/admin/user/profile`, { headers });
      
      if (finalProfileResponse.data.success) {
        console.log('✅ 验证用户资料更新成功');
        console.log('最终用户信息:', JSON.stringify(finalProfileResponse.data.data, null, 2));
      } else {
        console.log('❌ 验证用户资料更新失败:', finalProfileResponse.data.message);
      }
    } catch (error) {
      console.log('❌ 验证用户资料更新请求失败:', error.response?.data || error.message);
    }

    console.log('\n🎉 用户资料API测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testUserProfileAPIs();
