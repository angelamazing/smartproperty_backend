/**
 * 测试新订单创建时的totalAmount计算
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

class NewOrderTest {
  constructor() {
    this.token = null;
    this.userId = null;
  }

  async getToken() {
    console.log('🔑 获取测试token...');
    const response = await axios.post(`${BASE_URL}/api/auth/test-login-sys-admin`, {});
    
    if (!response.data.success) {
      throw new Error(`获取token失败: ${response.data.message}`);
    }
    
    this.token = response.data.data.token;
    this.userId = response.data.data.userInfo._id;
    console.log(`✅ Token获取成功: ${this.token.substring(0, 20)}...`);
    console.log(`用户ID: ${this.userId}`);
  }

  async testCreateNewOrder() {
    console.log('\n📝 测试创建新订单...');
    
    // 使用明天的日期创建新订单
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`测试日期: ${dateStr}`);
    
    // 创建部门报餐订单
    const orderData = {
      date: dateStr,
      mealType: 'lunch',
      memberIds: [this.userId],
      remark: '测试订单'
    };
    
    try {
      const response = await axios.post(
        `${BASE_URL}/api/dining/dept-order`,
        orderData,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        console.log('✅ 订单创建成功');
        console.log(`订单ID: ${response.data.data.orderId}`);
        return response.data.data.orderId;
      } else {
        throw new Error(`订单创建失败: ${response.data.message}`);
      }
    } catch (error) {
      console.error('❌ 订单创建失败:', error.response?.data || error.message);
      throw error;
    }
  }

  async testPersonalStatus(date) {
    console.log(`\n🔍 测试个人报餐状态 (${date})...`);
    
    try {
      const response = await axios.get(
        `${BASE_URL}/api/dining/personal-status?date=${date}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        }
      );
      
      if (response.data.success) {
        const data = response.data.data;
        console.log('✅ 个人报餐状态获取成功');
        console.log(`用户: ${data.userName}`);
        console.log(`查询日期: ${data.queryDate}`);
        
        console.log('\n🍽️ 餐次状态:');
        Object.entries(data.mealStatus).forEach(([mealType, meal]) => {
          console.log(`\n${mealType.toUpperCase()}:`);
          console.log(`  已报餐: ${meal.isRegistered}`);
          console.log(`  状态: ${meal.statusText}`);
          console.log(`  订单ID: ${meal.orderId}`);
          console.log(`  菜单ID: ${meal.menuId}`);
          console.log(`  菜单名称: ${meal.menuName}`);
          console.log(`  总金额: ¥${meal.totalAmount}`);
          console.log(`  菜品数量: ${meal.dishes.length}`);
          if (meal.dishes.length > 0) {
            console.log(`  菜品详情:`);
            meal.dishes.forEach(dish => {
              console.log(`    - ${dish.dishName}: ¥${dish.menuPrice}`);
            });
          }
        });
        
        console.log('\n📈 汇总统计:');
        console.log(`总报餐数: ${data.summary.totalRegistered}`);
        console.log(`总金额: ¥${data.summary.totalAmount}`);
        
        return data;
      } else {
        throw new Error(`获取个人报餐状态失败: ${response.data.message}`);
      }
    } catch (error) {
      console.error('❌ 获取个人报餐状态失败:', error.response?.data || error.message);
      throw error;
    }
  }

  async runTest() {
    try {
      console.log('🚀 开始测试新订单创建...\n');
      
      // 1. 获取token
      await this.getToken();
      
      // 2. 测试个人报餐状态（修复前）
      console.log('\n📊 检查修复前的状态...');
      await this.testPersonalStatus('2025-09-12');
      
      // 3. 创建新订单
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      const orderId = await this.testCreateNewOrder();
      
      // 4. 测试新订单的个人报餐状态
      console.log('\n📊 检查修复后的状态...');
      await this.testPersonalStatus(dateStr);
      
      console.log('\n✅ 测试完成！');
      
    } catch (error) {
      console.error('\n❌ 测试失败:', error.message);
    }
  }
}

// 运行测试
if (require.main === module) {
  const test = new NewOrderTest();
  test.runTest().catch(console.error);
}

module.exports = NewOrderTest;
