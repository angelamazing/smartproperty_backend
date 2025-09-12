const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// 测试数据
const testData = {
  // 部门管理员登录信息
  adminLogin: {
    phoneNumber: "13800000001",
    password: "admin123"
  },
  
  // 测试用户ID（需要从实际系统中获取）
  testUserIds: [
    "39531cde-66d5-466a-bdd7-4df7523f4902", // 部门管理员自己
    // 添加其他测试用户ID
  ]
};

async function testBatchDining() {
  try {
    console.log('🚀 开始测试批量报餐功能...\n');

    // 1. 登录获取token
    console.log('1️⃣ 登录部门管理员...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/phone-password-login`, testData.adminLogin);
    
    if (!loginResponse.data.success) {
      throw new Error('登录失败: ' + loginResponse.data.message);
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ 登录成功\n');

    // 2. 测试批量报餐接口
    console.log('2️⃣ 测试批量报餐接口...');
    const batchOrderData = {
      orders: [
        {
          date: "2025-09-06",
          mealType: "lunch",
          members: [
            {"userId": testData.testUserIds[0]}
          ],
          remark: "测试午餐"
        },
        {
          date: "2025-09-06",
          mealType: "dinner", 
          members: [
            {"userId": testData.testUserIds[0]}
          ],
          remark: "测试晚餐"
        },
        {
          date: "2025-09-07",
          mealType: "breakfast",
          members: [
            {"userId": testData.testUserIds[0]}
          ],
          remark: "测试明日早餐"
        }
      ]
    };

    const batchResponse = await axios.post(`${BASE_URL}/api/dining/enhanced/batch-orders`, batchOrderData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('批量报餐响应:', JSON.stringify(batchResponse.data, null, 2));
    
    if (batchResponse.data.success) {
      console.log('✅ 批量报餐成功');
      console.log(`   总订单: ${batchResponse.data.data.totalOrders}`);
      console.log(`   成功: ${batchResponse.data.data.successCount}`);
      console.log(`   失败: ${batchResponse.data.data.failedCount}`);
    } else {
      console.log('❌ 批量报餐失败:', batchResponse.data.message);
    }

    console.log('\n');

    // 3. 测试快速批量报餐接口
    console.log('3️⃣ 测试快速批量报餐接口...');
    const quickBatchData = {
      members: [
        {"userId": testData.testUserIds[0]}
      ],
      meals: [
        {date: "2025-09-06", mealType: "lunch"},
        {date: "2025-09-06", mealType: "dinner"},
        {date: "2025-09-07", mealType: "breakfast"}
      ],
      remark: "快速批量测试"
    };

    const quickBatchResponse = await axios.post(`${BASE_URL}/api/dining/enhanced/quick-batch-orders`, quickBatchData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('快速批量报餐响应:', JSON.stringify(quickBatchResponse.data, null, 2));
    
    if (quickBatchResponse.data.success) {
      console.log('✅ 快速批量报餐成功');
      console.log(`   总订单: ${quickBatchResponse.data.data.totalOrders}`);
      console.log(`   成功: ${quickBatchResponse.data.data.successCount}`);
      console.log(`   失败: ${quickBatchResponse.data.data.failedCount}`);
    } else {
      console.log('❌ 快速批量报餐失败:', quickBatchResponse.data.message);
    }

    console.log('\n');

    // 4. 测试参数验证
    console.log('4️⃣ 测试参数验证...');
    
    // 测试空订单列表
    try {
      await axios.post(`${BASE_URL}/api/dining/enhanced/batch-orders`, {orders: []}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      if (error.response && error.response.status === 422) {
        console.log('✅ 空订单列表验证通过');
      } else {
        console.log('❌ 空订单列表验证失败');
      }
    }

    // 测试无效日期格式
    try {
      await axios.post(`${BASE_URL}/api/dining/enhanced/batch-orders`, {
        orders: [{
          date: "invalid-date",
          mealType: "lunch",
          members: [{"userId": testData.testUserIds[0]}]
        }]
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      if (error.response && error.response.status === 422) {
        console.log('✅ 无效日期格式验证通过');
      } else {
        console.log('❌ 无效日期格式验证失败');
      }
    }

    console.log('\n🎉 批量报餐功能测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testBatchDining();
