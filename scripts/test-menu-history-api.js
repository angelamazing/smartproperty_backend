const axios = require('axios');

// 基础API地址
const BASE_URL = 'http://localhost:3000/api';

/**
 * 测试菜单历史API - 最终版本
 */
async function testMenuHistoryApi() {
  try {
    console.log('===== 开始测试菜单历史API =====\n');
    
    // 1. 使用系统管理员测试登录获取Token
    console.log('1. 获取系统管理员测试登录Token...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/test-login-sys-admin`, {});
    
    if (!loginResponse.data || !loginResponse.data.data || !loginResponse.data.data.token) {
      console.error('❌ 登录失败');
      console.error('登录响应:', JSON.stringify(loginResponse.data, null, 2));
      return;
    }
    
    const token = loginResponse.data.data.token;
    const userInfo = loginResponse.data.data.userInfo;
    console.log(`✅ 登录成功！用户: ${userInfo.nickName || '系统管理员'} (${userInfo.role || 'sys_admin'})`);
    console.log(`   Token: ${token.substring(0, 20)}...`);
    
    // 2. 设置请求头
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 3. 调用菜单历史API
    console.log('\n2. 调用菜单历史API...');
    const menuHistoryResponse = await axios.get(
      `${BASE_URL}/admin/menu/history?page=1&pageSize=10`,
      { headers }
    );
    
    // 4. 处理响应
    if (!menuHistoryResponse.data || !menuHistoryResponse.data.success) {
      console.error('❌ 获取菜单历史失败:', menuHistoryResponse.data?.message || '未知错误');
      console.error('响应数据:', JSON.stringify(menuHistoryResponse.data, null, 2));
      return;
    }
    
    console.log('✅ 获取菜单历史成功！');
    
    const responseData = menuHistoryResponse.data.data;
    const menuList = responseData.list || [];
    
    // 格式化餐次类型
    const formatMealType = (mealType) => {
      const mealTypeMap = {
        breakfast: '早餐',
        lunch: '午餐',
        dinner: '晚餐'
      };
      return mealTypeMap[mealType] || mealType;
    };
    
    // 格式化发布状态
    const formatPublishStatus = (status) => {
      const statusMap = {
        draft: '草稿',
        published: '已发布'
      };
      return statusMap[status] || status;
    };
    
    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '未知';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN');
      } catch (e) {
        return dateString;
      }
    };
    
    console.log(`\n3. 响应数据概览:`);
    console.log(`   - 总记录数: ${responseData.total || 0}`);
    console.log(`   - 当前页码: ${responseData.page || 1}`);
    console.log(`   - 每页大小: ${responseData.pageSize || 10}`);
    console.log(`   - 总页数: ${responseData.totalPages || 1}`);
    
    console.log(`\n4. 菜单历史列表:`);
    if (menuList.length > 0) {
      menuList.forEach((menu, index) => {
        console.log(`\n   ${index + 1}. 菜单信息:`);
        console.log(`      ID: ${menu._id}`);
        console.log(`      名称: ${menu.name || '无名称'}`);
        console.log(`      发布日期: ${formatDate(menu.publishDate)}`);
        console.log(`      餐次: ${formatMealType(menu.mealType)}`);
        console.log(`      状态: ${formatPublishStatus(menu.publishStatus)}`);
        console.log(`      发布人: ${menu.publish_by_name || '系统'}`);
        console.log(`      创建时间: ${formatDate(menu.createTime)}`);
        if (menu.description) {
          console.log(`      描述: ${menu.description}`);
        }
      });
    } else {
      console.log('   暂无菜单历史记录');
    }
    
    console.log('\n===== 菜单历史API测试完成 =====');
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    
    if (error.response) {
      console.error('   响应状态码:', error.response.status);
      console.error('   响应数据:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   没有收到响应，请检查服务是否正常运行');
    }
    
    console.error('\n可能的解决方法:');
    console.error('1. 检查Node.js服务是否正常运行: ps aux | grep node');
    console.error('2. 查看服务日志: tail -f /home/devbox/project/logs/error.log');
    console.error('3. 确认测试账号权限是否正确');
  }
}

// 执行测试
if (require.main === module) {
  testMenuHistoryApi();
}

module.exports = { testMenuHistoryApi };