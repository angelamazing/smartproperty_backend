/**
 * 系统管理员权限功能测试脚本
 * 测试系统管理员查看所有部门报餐概览和统计功能
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testSysAdminPermissions() {
  try {
    console.log('🚀 开始测试系统管理员权限功能...\n');

    // 1. 登录系统管理员
    console.log('1️⃣ 登录系统管理员...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/test-login-sys-admin`);
    const token = loginResponse.data.data.token;
    const userInfo = loginResponse.data.data.userInfo;
    console.log(`✅ 登录成功: ${userInfo.nickName} (${userInfo.role})\n`);

    const headers = { 'Authorization': `Bearer ${token}` };

    // 2. 测试部门报餐概览
    console.log('2️⃣ 测试部门报餐概览（系统管理员查看所有部门）...');
    const overviewResponse = await axios.get(`${BASE_URL}/api/dining/enhanced/department-overview`, { headers });
    const overview = overviewResponse.data.data;
    
    console.log(`📊 概览数据:`);
    console.log(`   - 日期: ${overview.date}`);
    console.log(`   - 查看类型: ${overview.viewType}`);
    console.log(`   - 部门数量: ${overview.departments.length}`);
    console.log(`   - 总统计: 总报餐数=${overview.totalStats.totalOrders}, 总成员数=${overview.totalStats.totalMembers}, 参与率=${overview.totalStats.participationRate}%\n`);

    // 3. 测试部门报餐统计
    console.log('3️⃣ 测试部门报餐统计（系统管理员查看所有部门）...');
    const statsResponse = await axios.get(`${BASE_URL}/api/dining/enhanced/department-stats`, { headers });
    const stats = statsResponse.data.data;
    
    console.log(`📈 统计数据:`);
    console.log(`   - 统计类型: ${stats.viewType}`);
    console.log(`   - 部门数量: ${stats.departments.length}`);
    console.log(`   - 总统计: 总报餐数=${stats.totalStats.totalOrders}, 总成员数=${stats.totalStats.totalMembers}, 参与率=${stats.totalStats.participationRate}%\n`);

    // 4. 显示各部门详情
    console.log('4️⃣ 各部门详情:');
    overview.departments.forEach((dept, index) => {
      const hasOrders = dept.todayStats.totalOrders > 0;
      const status = hasOrders ? '✅ 有报餐' : '❌ 无报餐';
      console.log(`   ${index + 1}. ${dept.departmentName} (${dept.departmentCode}) - ${status}`);
      if (hasOrders) {
        console.log(`      今日报餐: ${dept.todayStats.totalOrders}次, 参与率: ${dept.todayStats.participationRate}%`);
      }
    });

    console.log('\n🎉 系统管理员权限功能测试完成！');
    console.log('✅ 所有功能正常工作，系统管理员可以成功查看所有部门的报餐数据。');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testSysAdminPermissions();
}

module.exports = { testSysAdminPermissions };
