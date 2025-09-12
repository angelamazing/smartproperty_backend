const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3000';
const TEST_TOKEN = 'your_admin_token_here'; // 替换为实际的管理员token

// 测试用户资料更新
async function testUserProfileUpdate() {
  try {
    console.log('🧪 开始测试用户资料更新功能...');
    
    // 检查token
    if (TEST_TOKEN === 'your_admin_token_here') {
      console.log('❌ 请先设置有效的管理员token');
      console.log('💡 请修改脚本中的 TEST_TOKEN 变量');
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${TEST_TOKEN}`,
      'Content-Type': 'application/json'
    };
    
    // 测试用例1: 正常更新
    console.log('\n📋 测试用例1: 正常更新用户资料');
    const normalUpdateData = {
      nickName: '测试用户',
      email: 'test@example.com',
      phoneNumber: '13800138000',
      department: '技术部'
    };
    
    try {
      const response1 = await axios.put(`${BASE_URL}/api/user/profile`, normalUpdateData, { headers });
      console.log('✅ 正常更新成功');
      console.log('📊 响应状态:', response1.status);
      console.log('📋 响应数据:', JSON.stringify(response1.data, null, 2));
    } catch (error) {
      console.log('❌ 正常更新失败:', error.response?.data || error.message);
    }
    
    // 测试用例2: 包含null值
    console.log('\n📋 测试用例2: 包含null值的更新');
    const nullUpdateData = {
      nickName: '测试用户2',
      email: null,
      phoneNumber: null,
      department: null
    };
    
    try {
      const response2 = await axios.put(`${BASE_URL}/api/user/profile`, nullUpdateData, { headers });
      console.log('✅ 包含null值的更新成功');
      console.log('📊 响应状态:', response2.status);
      console.log('📋 响应数据:', JSON.stringify(response2.data, null, 2));
    } catch (error) {
      console.log('❌ 包含null值的更新失败:', error.response?.data || error.message);
    }
    
    // 测试用例3: 包含空字符串
    console.log('\n📋 测试用例3: 包含空字符串的更新');
    const emptyUpdateData = {
      nickName: '测试用户3',
      email: '',
      phoneNumber: '',
      department: ''
    };
    
    try {
      const response3 = await axios.put(`${BASE_URL}/api/user/profile`, emptyUpdateData, { headers });
      console.log('✅ 包含空字符串的更新成功');
      console.log('📊 响应状态:', response3.status);
      console.log('📋 响应数据:', JSON.stringify(response3.data, null, 2));
    } catch (error) {
      console.log('❌ 包含空字符串的更新失败:', error.response?.data || error.message);
    }
    
    // 测试用例4: 部分字段更新
    console.log('\n📋 测试用例4: 部分字段更新');
    const partialUpdateData = {
      nickName: '测试用户4'
      // 不包含其他字段
    };
    
    try {
      const response4 = await axios.put(`${BASE_URL}/api/user/profile`, partialUpdateData, { headers });
      console.log('✅ 部分字段更新成功');
      console.log('📊 响应状态:', response4.status);
      console.log('📋 响应数据:', JSON.stringify(response4.data, null, 2));
    } catch (error) {
      console.log('❌ 部分字段更新失败:', error.response?.data || error.message);
    }
    
    // 测试用例5: 无效邮箱格式
    console.log('\n📋 测试用例5: 无效邮箱格式');
    const invalidEmailData = {
      nickName: '测试用户5',
      email: 'invalid-email'
    };
    
    try {
      const response5 = await axios.put(`${BASE_URL}/api/user/profile`, invalidEmailData, { headers });
      console.log('❌ 无效邮箱格式应该失败，但成功了');
      console.log('📊 响应状态:', response5.status);
      console.log('📋 响应数据:', JSON.stringify(response5.data, null, 2));
    } catch (error) {
      console.log('✅ 无效邮箱格式正确失败');
      console.log('📊 错误状态:', error.response?.status);
      console.log('📋 错误数据:', JSON.stringify(error.response?.data, null, 2));
    }
    
    // 测试用例6: 无效手机号格式
    console.log('\n📋 测试用例6: 无效手机号格式');
    const invalidPhoneData = {
      nickName: '测试用户6',
      phoneNumber: '123456789'
    };
    
    try {
      const response6 = await axios.put(`${BASE_URL}/api/user/profile`, invalidPhoneData, { headers });
      console.log('❌ 无效手机号格式应该失败，但成功了');
      console.log('📊 响应状态:', response6.status);
      console.log('📋 响应数据:', JSON.stringify(response6.data, null, 2));
    } catch (error) {
      console.log('✅ 无效手机号格式正确失败');
      console.log('📊 错误状态:', error.response?.status);
      console.log('📋 错误数据:', JSON.stringify(error.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  testUserProfileUpdate();
}

module.exports = {
  testUserProfileUpdate
};
