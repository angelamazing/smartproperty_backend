/**
 * 菜单API修复测试脚本
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testMenuAPIFix() {
  console.log('🧪 开始测试菜单API修复...\n');

  try {
    // 1. 先登录获取token
    console.log('1️⃣ 登录获取token...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/test-login-sys-admin`, {
      username: 'testuser',
      password: 'testpass123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('登录失败: ' + loginResponse.data.message);
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ 登录成功，获取到token');
    
    // 设置请求头
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. 测试菜单历史接口
    console.log('\n2️⃣ 测试菜单历史接口...');
    try {
      const historyResponse = await axios.get(`${BASE_URL}/api/admin/menu/history`, {
        headers,
        params: {
          page: 1,
          pageSize: 5,
          startDate: '2025-08-25',
          endDate: '2025-09-01'
        }
      });
      
      if (historyResponse.data.success) {
        console.log('✅ 菜单历史接口成功');
        console.log('  - 总数:', historyResponse.data.data.total);
        console.log('  - 当前页:', historyResponse.data.data.page);
        console.log('  - 数据条数:', historyResponse.data.data.list.length);
        
        if (historyResponse.data.data.list.length > 0) {
          console.log('  - 第一条数据:', historyResponse.data.data.list[0].name);
        }
      } else {
        console.log('❌ 菜单历史接口失败:', historyResponse.data.message);
      }
    } catch (error) {
      console.log('❌ 菜单历史接口请求失败:', error.response?.data || error.message);
    }

    // 3. 测试菜单模板接口
    console.log('\n3️⃣ 测试菜单模板接口...');
    try {
      const templateResponse = await axios.get(`${BASE_URL}/api/admin/menu/templates`, {
        headers
      });
      
      if (templateResponse.data.success) {
        console.log('✅ 菜单模板接口成功');
        console.log('  - 模板数量:', templateResponse.data.data.length);
      } else {
        console.log('❌ 菜单模板接口失败:', templateResponse.data.message);
      }
    } catch (error) {
      console.log('❌ 菜单模板接口请求失败:', error.response?.data || error.message);
    }

    // 4. 测试不同的过滤条件
    console.log('\n4️⃣ 测试不同的过滤条件...');
    const testCases = [
      { name: '无过滤条件', params: { page: 1, pageSize: 3 } },
      { name: '只有餐次过滤', params: { page: 1, pageSize: 3, mealType: 'lunch' } },
      { name: '只有日期过滤', params: { page: 1, pageSize: 3, startDate: '2025-08-25' } },
      { name: '完整过滤条件', params: { page: 1, pageSize: 3, startDate: '2025-08-25', endDate: '2025-09-01', mealType: 'lunch' } }
    ];
    
    for (const testCase of testCases) {
      try {
        const response = await axios.get(`${BASE_URL}/api/admin/menu/history`, {
          headers,
          params: testCase.params
        });
        
        if (response.data.success) {
          console.log(`✅ ${testCase.name} - 成功，总数: ${response.data.data.total}`);
        } else {
          console.log(`❌ ${testCase.name} - 失败: ${response.data.message}`);
        }
      } catch (error) {
        console.log(`❌ ${testCase.name} - 请求失败: ${error.response?.data?.message || error.message}`);
      }
    }

    console.log('\n🎉 菜单API修复测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testMenuAPIFix();
